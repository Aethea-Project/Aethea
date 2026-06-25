/**
 * Auth Controller — handles authentication-related request logic
 *
 * Design Pattern: Controller Pattern
 *   Separates HTTP request/response handling from business logic.
 *   Keeps route files thin (only wiring) and controllers testable.
 */

import { Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import logger from '../lib/logger.js';
import prisma from '../lib/prisma.js';
import { getSupabaseAdminClient } from '../lib/supabaseAdmin.js';
import { consumePasswordChangeVerification } from '../services/otpService.js';
import {
  createStepUpChallenge,
  getSessionStatus,
  listUserSessions,
  revokeAllUserSessions,
  revokeUserSession,
  verifyStepUpChallenge,
} from '../lib/sessionRegistry.js';
import type { JWTVerifier } from '../auth/jwt/verify.js';

/**
 * Creates a verifyToken handler with the jwtVerifier injected via closure,
 * eliminating the Service Locator (req.app.get) anti-pattern.
 */
export const createVerifyTokenHandler = (jwtVerifier: JWTVerifier | null) => {
  return async (req: Request, res: Response): Promise<void> => {
    if (!jwtVerifier) {
      throw AppError.unauthorized('Authentication service unavailable');
    }

    const token = jwtVerifier.extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      throw AppError.unauthorized('No authorization token provided');
    }

    const verification = await jwtVerifier.verifyToken(token);

    if (!verification.valid) {
      logger.warn({ error: verification.error }, 'Token verification failed');
      throw AppError.unauthorized(verification.error || 'Invalid token');
    }

    res.json({
      valid: true,
      user: {
        id: verification.user.id,
        email: verification.user.email ?? undefined,
        sessionId: verification.payload?.session_id,
        accountType: verification.payload?.account_type,
        accountStatus: verification.payload?.account_status,
        mustChangePassword: verification.payload?.must_change_password,
      },
    });
  };
};

/**
 * GET /api/auth/sessions
 * Returns all active sessions for current user.
 */
export const getSessions = async (req: Request, res: Response): Promise<void> => {
  const localUser = req.localUser;
  if (!localUser) {
    throw AppError.unauthorized('No authenticated user');
  }

  const sessions = await listUserSessions(localUser.id, req.user?.sessionId);
  res.json({ data: sessions });
};

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revokes a specific session for current user.
 */
export const revokeSession = async (req: Request, res: Response): Promise<void> => {
  const localUser = req.localUser;
  if (!localUser) {
    throw AppError.unauthorized('No authenticated user');
  }

  const rawSessionId = req.params.sessionId;
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  if (!sessionId) {
    throw AppError.badRequest('sessionId is required');
  }

  const revoked = await revokeUserSession(localUser.id, sessionId);
  if (!revoked) {
    throw AppError.notFound('Session not found or already revoked');
  }

  res.status(204).send();
};

/**
 * POST /api/auth/sessions/revoke-all
 * Revokes all active sessions for current user.
 */
export const revokeAllSessions = async (req: Request, res: Response): Promise<void> => {
  const localUser = req.localUser;
  if (!localUser) {
    throw AppError.unauthorized('No authenticated user');
  }

  const exceptCurrent = req.body?.exceptCurrent !== false;
  const revokedCount = await revokeAllUserSessions({
    userId: localUser.id,
    exceptSessionId: exceptCurrent ? req.user?.sessionId : undefined,
  });

  if (!exceptCurrent) {
    const supabase = getSupabaseAdminClient();
    await supabase.auth.admin.signOut(localUser.id);
  }

  res.json({
    revokedCount,
    exceptCurrent,
  });
};

/**
 * GET /api/auth/step-up/status
 */
export const getStepUpStatus = async (req: Request, res: Response): Promise<void> => {
  const localUser = req.localUser;
  const sessionId = req.user?.sessionId;

  if (!localUser || !sessionId) {
    throw AppError.unauthorized('No authenticated session context');
  }

  const status = await getSessionStatus(localUser.id, sessionId);
  if (!status) {
    throw AppError.notFound('Session not found');
  }

  res.json({
    required: status.stepUpRequired,
    riskLevel: status.riskLevel,
    verifiedAt: status.stepUpVerifiedAt,
    challengeExpiresAt: status.stepUpCodeExpiresAt,
  });
};

/**
 * POST /api/auth/step-up/challenge
 */
export const issueStepUpChallenge = async (req: Request, res: Response): Promise<void> => {
  const localUser = req.localUser;
  const sessionId = req.user?.sessionId;

  if (!localUser || !sessionId) {
    throw AppError.unauthorized('No authenticated session context');
  }

  const status = await getSessionStatus(localUser.id, sessionId);
  if (!status) {
    throw AppError.notFound('Session not found');
  }

  if (!status.stepUpRequired) {
    res.json({
      required: false,
      message: 'Step-up is not required for this session',
    });
    return;
  }

  const challenge = await createStepUpChallenge(localUser.id, sessionId);
  if (!challenge) {
    throw AppError.badRequest('Unable to create challenge', 'STEP_UP_CHALLENGE_FAILED');
  }

  const devCode = process.env.NODE_ENV === 'production' ? undefined : challenge.code;
  if (devCode) {
    logger.info({ userId: localUser.id, sessionId, code: devCode }, 'Step-up challenge issued (development only)');
  }

  res.json({
    required: true,
    expiresInSeconds: challenge.expiresInSeconds,
    ...(devCode ? { devCode } : {}),
  });
};

/**
 * POST /api/auth/step-up/verify
 */
export const verifyStepUp = async (req: Request, res: Response): Promise<void> => {
  const localUser = req.localUser;
  const sessionId = req.user?.sessionId;

  if (!localUser || !sessionId) {
    throw AppError.unauthorized('No authenticated session context');
  }

  const { code } = req.body as { code: string };
  const verified = await verifyStepUpChallenge(localUser.id, sessionId, code);
  if (!verified) {
    throw AppError.unauthorized('Invalid or expired step-up code', 'STEP_UP_INVALID');
  }

  res.json({
    verified: true,
  });
};

/**
 * POST /api/auth/password/complete
 * Clears must_change_password after the user has successfully updated
 * their password through Supabase Auth.
 */
export const completePasswordChange = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw AppError.unauthorized('No authenticated user');
  }

  let hasVerifiedPasswordChange = await consumePasswordChangeVerification(userId);

  if (!hasVerifiedPasswordChange && req.body?.recoveryFlow === true) {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!error && data.user?.updated_at) {
      const updatedAt = new Date(data.user.updated_at).getTime();
      hasVerifiedPasswordChange = Number.isFinite(updatedAt) && Date.now() - updatedAt <= 10 * 60 * 1000;
    }
  }

  if (!hasVerifiedPasswordChange) {
    throw AppError.forbidden('Password change has not been verified', 'PASSWORD_CHANGE_NOT_VERIFIED');
  }

  await prisma.$executeRaw`
    UPDATE public.user_accounts
    SET must_change_password = FALSE,
        updated_at = now()
    WHERE id = ${userId}::uuid
  `;

  res.json({ success: true });
};
