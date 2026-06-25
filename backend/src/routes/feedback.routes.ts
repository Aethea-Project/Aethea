/**
 * Feedback Routes
 */

import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { submitFeedback, getDoctorReviews } from '../controllers/feedback.controller.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import {
  requireActiveAccount,
  requirePasswordChanged,
  requireTrustedClaims,
} from '../middleware/requireAccountType.js';

// Validation schemas
const submitFeedbackSchema = z.object({
  reservationId: z.string().uuid('Invalid reservation ID format'),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  comments: z.string().max(1000, 'Comments must not exceed 1000 characters').optional(),
});

export const createFeedbackRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  const auth = [
    authMiddleware,
    requireLocalUser,
    requireTrustedClaims,
    requireActiveAccount,
    requirePasswordChanged,
  ];

  // Patient: submit feedback for a reservation
  router.post(
    '/submit',
    auth,
    validateBody(submitFeedbackSchema),
    asyncHandler(submitFeedback),
  );

  // Doctor: get all anonymized reviews visible to them
  router.get(
    '/doctor',
    auth,
    asyncHandler(getDoctorReviews),
  );

  return router;
};
