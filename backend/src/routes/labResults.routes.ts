import { Router, RequestHandler } from 'express';
import {
  uploadLabResult,
  getLabFeedbacks,
  updateLabFeedback,
  deleteLabFeedback,
  getUploadUrl,
} from '../controllers/labResults.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { requireActiveAccount, requirePasswordChanged, requireTrustedClaims } from '../middleware/requireAccountType.js';

export const createLabResultsRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  const auth = [authMiddleware, requireLocalUser, requireTrustedClaims, requireActiveAccount, requirePasswordChanged];

  router.post('/upload-url', auth, asyncHandler(getUploadUrl));
  router.post('/upload', auth, asyncHandler(uploadLabResult));
  router.get('/feedbacks', auth, asyncHandler(getLabFeedbacks));
  router.put('/feedbacks/:id', auth, asyncHandler(updateLabFeedback));
  router.delete('/feedbacks/:id', auth, asyncHandler(deleteLabFeedback));

  return router;
};
