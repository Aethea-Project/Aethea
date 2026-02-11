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

import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { verifyToken } from '../controllers/auth.controller.js';

const router = Router();

// POST /api/auth/verify — strict rate limit
router.post('/verify', authLimiter, asyncHandler(verifyToken));

export default router;
