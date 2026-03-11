/**
 * User Routes
 *
 * All routes require authentication (authMiddleware applied in app.ts via router-level middleware).
 */

import { Router, RequestHandler } from 'express';
import { getProfile } from '../controllers/users.controller.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { requireActiveAccount, requirePasswordChanged, requireTrustedClaims } from '../middleware/requireAccountType.js';

/**
 * Build user routes. Accepts authMiddleware as a parameter so it can be
 * swapped for a test stub during testing.
 */
export const createUserRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();
  const protectedAuth = [authMiddleware, requireTrustedClaims, requireActiveAccount, requirePasswordChanged, requireLocalUser];

  // GET /api/users/profile
  router.get('/profile', protectedAuth, getProfile);

  return router;
};
