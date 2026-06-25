import prisma from './prisma.js';
import { createHash, randomInt } from 'node:crypto';

type SessionRiskLevel = 'low' | 'medium' | 'high';

interface SessionFingerprint {
  sessionId: string;
  userAgent: string | null;
  ipAddress: string | null;
  riskLevel: string;
}

interface SessionContextRow extends SessionFingerprint {
  revokedAt: Date | null;
  stepUpVerifiedAt: Date | null;
  lastSeenAt: Date;
}

interface SessionRecord {
  id: string;
  sessionId: string;
  userAgent: string | null;
  ipAddress: string | null;
  rememberMe: boolean;
  riskLevel: string;
  stepUpRequired: boolean;
  lastSeenAt: Date;
  createdAt: Date;
}

interface SessionModel {
  upsert: (args: unknown) => Promise<unknown>;
  findFirst: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown>;
  updateMany: (args: unknown) => Promise<{ count: number }>;
}

interface UpsertSessionInput {
  userId: string;
  sessionId: string;
  userAgent?: string;
  ipAddress?: string;
  rememberMe?: boolean;
}

interface UpsertSessionResult {
  revoked: boolean;
  riskLevel: SessionRiskLevel;
  stepUpRequired: boolean;
}

interface StepUpChallengeResult {
  code: string;
  expiresInSeconds: number;
}

interface RevokeAllInput {
  userId: string;
  exceptSessionId?: string;
}

const sessionModel = (): SessionModel | undefined => {
  return (prisma as unknown as { userSession?: SessionModel }).userSession;
};

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

const computeRiskLevel = (
  existingSession: SessionFingerprint | null,
  recentSessions: SessionFingerprint[],
  userAgent?: string,
  ipAddress?: string
): SessionRiskLevel => {
  if (existingSession) {
    const ipChanged = Boolean(existingSession.ipAddress && ipAddress && existingSession.ipAddress !== ipAddress);
    const uaChanged = Boolean(existingSession.userAgent && userAgent && existingSession.userAgent !== userAgent);

    if (ipChanged && uaChanged) {
      return 'high';
    }

    if (ipChanged || uaChanged) {
      return 'medium';
    }

    return existingSession.riskLevel as SessionRiskLevel;
  }

  if (recentSessions.length === 0) {
    return 'low';
  }

  const hasSeenFingerprint = recentSessions.some((session) => {
    const sameIp = session.ipAddress && ipAddress && session.ipAddress === ipAddress;
    const sameUa = session.userAgent && userAgent && session.userAgent === userAgent;
    return Boolean(sameIp && sameUa);
  });

  return hasSeenFingerprint ? 'low' : 'high';
};

const isMissingSessionSchemaError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const raw = error as { code?: unknown; meta?: { code?: unknown; cause?: unknown }; message?: unknown };
  const code = raw.code ?? raw.meta?.code;
  const cause = raw.meta?.cause;
  const message = typeof raw.message === 'string' ? raw.message : '';

  return (
    code === '42P01' ||
    code === '42703' ||
    code === '42501' ||
    (typeof cause === 'string' && cause.includes('user_sessions')) ||
    message.includes('user_sessions')
  );
};

const loadSessionContext = async (userId: string, sessionId: string): Promise<{
  existingSession: SessionContextRow | null;
  recentSessions: SessionContextRow[];
} | null> => {
  try {
    const rows = await prisma.$queryRaw<SessionContextRow[]>`
      (
        SELECT
          "sessionId" AS "sessionId",
          "userAgent" AS "userAgent",
          "ipAddress" AS "ipAddress",
          "riskLevel" AS "riskLevel",
          "revokedAt" AS "revokedAt",
          "stepUpVerifiedAt" AS "stepUpVerifiedAt",
          "lastSeenAt" AS "lastSeenAt"
        FROM public.user_sessions
        WHERE "userId" = ${userId}::uuid
          AND "sessionId" = ${sessionId}::uuid
        LIMIT 1
      )
      UNION ALL
      (
        SELECT
          "sessionId" AS "sessionId",
          "userAgent" AS "userAgent",
          "ipAddress" AS "ipAddress",
          "riskLevel" AS "riskLevel",
          "revokedAt" AS "revokedAt",
          "stepUpVerifiedAt" AS "stepUpVerifiedAt",
          "lastSeenAt" AS "lastSeenAt"
        FROM public.user_sessions
        WHERE "userId" = ${userId}::uuid
          AND "revokedAt" IS NULL
          AND "sessionId" <> ${sessionId}::uuid
        ORDER BY "lastSeenAt" DESC
        LIMIT 10
      )
    `;

    const existingSession = rows.find((row) => row.sessionId === sessionId) ?? null;
    const recentSessions = rows.filter((row) => row.sessionId !== sessionId);

    return { existingSession, recentSessions };
  } catch (error) {
    // Optional dependency: some deployments may not have the session registry table yet.
    // In that case, fail open and skip session tracking.
    if (isMissingSessionSchemaError(error)) {
      return null;
    }
    throw error;
  }
};

export const getClientIp = (requestIp: string | string[] | undefined): string | undefined => {
  if (!requestIp) {
    return undefined;
  }

  if (Array.isArray(requestIp)) {
    return requestIp[0];
  }

  const forwarded = requestIp.split(',').map((part) => part.trim()).filter(Boolean);
  return forwarded[0] ?? undefined;
};

/**
 * Single entry-point used by the auth middleware.
 *
 * Reduces first-request DB work by:
 * - Loading current-session + recent-session context in ONE query
 * - Upserting the session record in ONE query
 *
 * Total for session registry: 2 SQL statements.
 */
export const validateAndUpsertUserSession = async (input: UpsertSessionInput): Promise<UpsertSessionResult | null> => {
  const model = sessionModel();
  if (!model || !input.sessionId) {
    return null;
  }

  const context = await loadSessionContext(input.userId, input.sessionId);
  if (!context) {
    return null;
  }

  if (context.existingSession?.revokedAt) {
    return {
      revoked: true,
      riskLevel: 'low',
      stepUpRequired: false,
    };
  }

  const riskLevel = computeRiskLevel(
    context.existingSession,
    context.recentSessions,
    input.userAgent,
    input.ipAddress
  );

  const existingSession = context.existingSession;
  const ipChanged = Boolean(
    existingSession?.ipAddress && input.ipAddress && existingSession.ipAddress !== input.ipAddress
  );
  const uaChanged = Boolean(
    existingSession?.userAgent && input.userAgent && existingSession.userAgent !== input.userAgent
  );
  const fingerprintChanged = ipChanged || uaChanged;
  const stepUpVerifiedAt = fingerprintChanged ? null : (existingSession?.stepUpVerifiedAt ?? null);
  const stepUpRequired = riskLevel === 'high' && !stepUpVerifiedAt;

  try {
    await model.upsert({
      where: { sessionId: input.sessionId },
      update: {
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        rememberMe: input.rememberMe ?? false,
        riskLevel,
        stepUpRequired,
        ...(fingerprintChanged ? { stepUpVerifiedAt: null } : {}),
        ...(stepUpRequired ? {} : { stepUpCodeHash: null, stepUpCodeExpiresAt: null }),
        revokedAt: null,
        lastSeenAt: new Date(),
      },
      create: {
        userId: input.userId,
        sessionId: input.sessionId,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        rememberMe: input.rememberMe ?? false,
        riskLevel,
        stepUpRequired,
        lastSeenAt: new Date(),
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Race condition: another concurrent request already created the session.
      // We can safely ignore this and proceed.
      // logger.debug('Concurrent session initialization intercepted.');
    } else {
      throw error;
    }
  }

  return {
    revoked: false,
    riskLevel,
    stepUpRequired,
  };
};

export const getSessionStatus = async (userId: string, sessionId: string) => {
  const model = sessionModel();
  if (!model) {
    return null;
  }

  return model.findFirst({
    where: {
      userId,
      sessionId,
      revokedAt: null,
    },
    select: {
      sessionId: true,
      riskLevel: true,
      stepUpRequired: true,
      stepUpVerifiedAt: true,
      stepUpCodeExpiresAt: true,
      lastSeenAt: true,
    },
  }) as Promise<{
    sessionId: string;
    riskLevel: string;
    stepUpRequired: boolean;
    stepUpVerifiedAt: Date | null;
    stepUpCodeExpiresAt: Date | null;
    lastSeenAt: Date;
  } | null>;
};

export const createStepUpChallenge = async (userId: string, sessionId: string): Promise<StepUpChallengeResult | null> => {
  const model = sessionModel();
  if (!model) {
    return null;
  }

  const code = randomInt(100000, 1000000).toString();
  const expiresInSeconds = 10 * 60;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  const result = await model.updateMany({
    where: {
      userId,
      sessionId,
      revokedAt: null,
    },
    data: {
      stepUpRequired: true,
      stepUpCodeHash: sha256(code),
      stepUpCodeExpiresAt: expiresAt,
    },
  });

  if (result.count === 0) {
    return null;
  }

  return { code, expiresInSeconds };
};

export const verifyStepUpChallenge = async (userId: string, sessionId: string, code: string): Promise<boolean> => {
  const model = sessionModel();
  if (!model) {
    return false;
  }

  const session = await model.findFirst({
    where: {
      userId,
      sessionId,
      revokedAt: null,
      stepUpRequired: true,
    },
    select: {
      stepUpCodeHash: true,
      stepUpCodeExpiresAt: true,
    },
  }) as { stepUpCodeHash?: string | null; stepUpCodeExpiresAt?: Date | null } | null;

  if (!session?.stepUpCodeHash || !session.stepUpCodeExpiresAt) {
    return false;
  }

  if (session.stepUpCodeExpiresAt.getTime() < Date.now()) {
    return false;
  }

  const valid = session.stepUpCodeHash === sha256(code);
  if (!valid) {
    return false;
  }

  await model.updateMany({
    where: {
      userId,
      sessionId,
      revokedAt: null,
    },
    data: {
      stepUpRequired: false,
      stepUpCodeHash: null,
      stepUpCodeExpiresAt: null,
      stepUpVerifiedAt: new Date(),
    },
  });

  return true;
};

export const isSessionRevoked = async (userId: string, sessionId?: string): Promise<boolean> => {
  const model = sessionModel();
  if (!model || !sessionId) {
    return false;
  }

  const session = await model.findFirst({
    where: {
      userId,
      sessionId,
    },
    select: {
      revokedAt: true,
    },
  }) as { revokedAt: Date | null } | null;

  if (!session) {
    return false;
  }

  return Boolean(session.revokedAt);
};

export const listUserSessions = async (userId: string, currentSessionId?: string) => {
  const model = sessionModel();
  if (!model) {
    return [];
  }

  const sessions = await model.findMany({
    where: {
      userId,
      revokedAt: null,
    },
    orderBy: {
      lastSeenAt: 'desc',
    },
    select: {
      id: true,
      sessionId: true,
      userAgent: true,
      ipAddress: true,
      rememberMe: true,
      riskLevel: true,
      stepUpRequired: true,
      lastSeenAt: true,
      createdAt: true,
    },
  }) as SessionRecord[];

  return sessions.map((session) => ({
    ...session,
    current: currentSessionId ? session.sessionId === currentSessionId : false,
  }));
};

export const revokeUserSession = async (userId: string, sessionId: string): Promise<boolean> => {
  const model = sessionModel();
  if (!model) {
    return false;
  }

  const result = await model.updateMany({
    where: {
      userId,
      sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count > 0;
};

export const revokeAllUserSessions = async ({ userId, exceptSessionId }: RevokeAllInput): Promise<number> => {
  const model = sessionModel();
  if (!model) {
    return 0;
  }

  const result = await model.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { sessionId: { not: exceptSessionId } } : {}),
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count;
};
