/**
 * Auth Routes
 *
 * Design Pattern: Router Pattern
 *   Groups related routes into modular files using express.Router().
 *   Keeps the main app.ts as a composition root only.
 *
 * Security: authLimiter applied to all auth endpoints
 *   Source: OWASP API2:2023 — "Implement anti-brute force mechanisms
 *   stricter than the regular rate limiting mechanisms on your APIs."
 */

import { Router, RequestHandler } from 'express';
import { authLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
	getSessions,
	getStepUpStatus,
	issueStepUpChallenge,
	revokeAllSessions,
	revokeSession,
	verifyStepUp,
	verifyToken,
} from '../controllers/auth.controller.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { requireStepUp } from '../middleware/requireStepUp.js';
import { validateBody } from '../middleware/validate.js';
import { stepUpVerifySchema } from '../schemas/index.js';

export const createAuthRoutes = (authMiddleware: RequestHandler): Router => {
	const router = Router();

	// POST /api/auth/verify — strict rate limit
	router.post('/verify', authLimiter, asyncHandler(verifyToken));

	// Protected session registry endpoints
	const sessionAuth = [authMiddleware, requireLocalUser];
	router.get('/sessions', sessionAuth, asyncHandler(getSessions));
	router.get('/step-up/status', sessionAuth, asyncHandler(getStepUpStatus));
	router.post('/step-up/challenge', authLimiter, sessionAuth, asyncHandler(issueStepUpChallenge));
	router.post('/step-up/verify', authLimiter, sessionAuth, validateBody(stepUpVerifySchema), asyncHandler(verifyStepUp));
	router.delete('/sessions/:sessionId', sessionAuth, requireStepUp, asyncHandler(revokeSession));
	router.post('/sessions/revoke-all', sessionAuth, requireStepUp, asyncHandler(revokeAllSessions));

	return router;
};
