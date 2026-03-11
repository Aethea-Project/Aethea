import { Router, RequestHandler } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import {
  createVerificationUploadUrl,
  getMyVerificationProfile,
  submitVerificationProfile,
} from '../controllers/staffVerification.controller.js';
import {
  requireAccountTypeWithStatuses,
  requirePasswordChanged,
  requireTrustedClaims,
} from '../middleware/requireAccountType.js';
import {
  staffVerificationUploadUrlSchema,
  staffVerificationSubmitSchema,
} from '../schemas/index.js';

export const createStaffVerificationRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  const staffAuth = [
    authMiddleware,
    requireTrustedClaims,
    requirePasswordChanged,
    requireAccountTypeWithStatuses(['doctor', 'pharmacist'], ['pending', 'active']),
  ];

  router.get('/me', staffAuth, asyncHandler(getMyVerificationProfile));
  router.post('/upload-url', staffAuth, validateBody(staffVerificationUploadUrlSchema), asyncHandler(createVerificationUploadUrl));
  router.post('/submit', staffAuth, validateBody(staffVerificationSubmitSchema), asyncHandler(submitVerificationProfile));

  return router;
};
