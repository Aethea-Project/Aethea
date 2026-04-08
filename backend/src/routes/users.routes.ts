/**
 * User Routes
 *
 * All routes require authentication (authMiddleware applied in app.ts via router-level middleware).
 */

import { Router, RequestHandler } from 'express';
import {
  getProfile,
  requestPasswordChange,
  requestProfileUpdate,
  verifyPasswordChange,
  verifyProfileUpdate,
} from '../controllers/users.controller.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { requireActiveAccount, requirePasswordChanged, requireTrustedClaims } from '../middleware/requireAccountType.js';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import {
  requestPasswordChangeSchema,
  requestProfileUpdateSchema,
  verifyPasswordChangeSchema,
  verifyProfileUpdateSchema,
} from '../schemas/index.js';
/**
 * Build user routes. Accepts authMiddleware as a parameter so it can be
 * swapped for a test stub during testing.
 */
export const createUserRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();
  const protectedAuth = [authMiddleware, requireTrustedClaims, requireActiveAccount, requirePasswordChanged, requireLocalUser];
  const passwordChangeAuth = [authMiddleware, requireTrustedClaims, requireActiveAccount, requireLocalUser];

  // GET /api/users/profile
  router.get('/profile', protectedAuth, getProfile);


  // POST /api/users/profile/update-request
  router.post('/profile/update-request', protectedAuth, validateBody(requestProfileUpdateSchema), asyncHandler(requestProfileUpdate));

  // PUT /api/users/profile/verify-update
  router.put('/profile/verify-update', protectedAuth, validateBody(verifyProfileUpdateSchema), asyncHandler(verifyProfileUpdate));

  // POST /api/users/password/change-request
  router.post('/password/change-request', passwordChangeAuth, validateBody(requestPasswordChangeSchema), asyncHandler(requestPasswordChange));

  // POST /api/users/password/verify-change
  router.post('/password/verify-change', passwordChangeAuth, validateBody(verifyPasswordChangeSchema), asyncHandler(verifyPasswordChange));

  return router;
};
