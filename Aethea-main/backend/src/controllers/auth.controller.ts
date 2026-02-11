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

/**
 * POST /api/auth/verify
 * Verifies JWT token from Authorization header using Supabase
 */
export const verifyToken = async (req: Request, res: Response): Promise<void> => {
  const jwtVerifier = req.app.get('jwtVerifier');

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
    user: verification.user,
  });
};
