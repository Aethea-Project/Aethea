import { Router, RequestHandler } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  getVerificationDocumentLinks,
  listVerificationQueue,
  reviewVerificationProfile,
} from '../controllers/staffVerification.controller.js';
import { requireAccountType, requirePasswordChanged, requireTrustedClaims } from '../middleware/requireAccountType.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { adminReviewVerificationSchema, adminVerificationQueueQuerySchema } from '../schemas/index.js';

export const createAdminVerificationRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  const adminAuth = [
    authMiddleware,
    requireLocalUser,
    requireTrustedClaims,
    requirePasswordChanged,
    requireAccountType('admin'),
  ];

  router.get('/staff-profiles', adminAuth, validateQuery(adminVerificationQueueQuerySchema), asyncHandler(listVerificationQueue));
  router.get('/staff-profiles/:userId/documents', adminAuth, asyncHandler(getVerificationDocumentLinks));
  router.patch('/staff-profiles/:userId/review', adminAuth, validateBody(adminReviewVerificationSchema), asyncHandler(reviewVerificationProfile));

  return router;
};
