/**
 * User Routes
 *
 * All routes require authentication (authMiddleware applied in app.ts via router-level middleware).
 */

import { Router, RequestHandler } from 'express';
import { getProfile } from '../controllers/users.controller.js';
import { requireLocalUser } from '../lib/authMiddleware.js';

/**
 * Build user routes. Accepts authMiddleware as a parameter so it can be
 * swapped for a test stub during testing.
 */
export const createUserRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  // GET /api/users/profile
  router.get('/profile', authMiddleware, requireLocalUser, getProfile);

  return router;
};
