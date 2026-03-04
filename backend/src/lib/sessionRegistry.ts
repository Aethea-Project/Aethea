import prisma from './prisma.js';
import { createHash, randomInt } from 'node:crypto';

type SessionRiskLevel = 'low' | 'medium' | 'high';

interface SessionRecord {
  id: string;
  sessionId: string;
  userAgent: string | null;
  ipAddress: string | null;
  rememberMe: boolean;
  riskLevel: string;
  stepUpRequired: boolean;
  stepUpCodeHash?: string | null;
  stepUpCodeExpiresAt?: Date | null;
  stepUpVerifiedAt?: Date | null;
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
  existingSession: SessionRecord | null,
  recentSessions: SessionRecord[],
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

export const upsertUserSession = async (input: UpsertSessionInput): Promise<void> => {
  const model = sessionModel();
  if (!model || !input.sessionId) {
    return;
  }

  const [existingSessionRaw, recentSessionsRaw] = await Promise.all([
    model.findFirst({
      where: {
        userId: input.userId,
        sessionId: input.sessionId,
      },
      select: {
        id: true,
        sessionId: true,
        userAgent: true,
        ipAddress: true,
        rememberMe: true,
        riskLevel: true,
        stepUpRequired: true,
        stepUpCodeHash: true,
        stepUpCodeExpiresAt: true,
        stepUpVerifiedAt: true,
        lastSeenAt: true,
        createdAt: true,
      },
    }),
    model.findMany({
      where: {
        userId: input.userId,
        revokedAt: null,
        sessionId: { not: input.sessionId },
      },
      orderBy: {
        lastSeenAt: 'desc',
      },
      take: 10,
      select: {
        id: true,
        sessionId: true,
        userAgent: true,
        ipAddress: true,
        rememberMe: true,
        riskLevel: true,
        stepUpRequired: true,
        stepUpCodeHash: true,
        stepUpCodeExpiresAt: true,
        stepUpVerifiedAt: true,
        lastSeenAt: true,
        createdAt: true,
      },
    }),
  ]);

  const existingSession = (existingSessionRaw ?? null) as SessionRecord | null;
  const recentSessions = (recentSessionsRaw ?? []) as SessionRecord[];

  const riskLevel = computeRiskLevel(existingSession, recentSessions, input.userAgent, input.ipAddress);
  const stepUpRequired = riskLevel === 'high';

  await model.upsert({
    where: { sessionId: input.sessionId },
    update: {
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      rememberMe: input.rememberMe ?? false,
      riskLevel,
      stepUpRequired,
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
      stepUpRequired: true,
    },
    data: {
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
