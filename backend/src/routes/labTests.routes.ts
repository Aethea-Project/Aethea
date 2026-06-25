/**
 * Lab Tests Routes
 */

import { Router, RequestHandler } from 'express';
import { createLabTest, listLabTests, updateLabTest } from '../controllers/labTests.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { requireActiveAccount, requirePasswordChanged, requireTrustedClaims } from '../middleware/requireAccountType.js';
import { createLabTestSchema, updateLabTestSchema, paginationSchema } from '../schemas/index.js';

export const createLabTestRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  // Fail fast on auth claims/status before touching Prisma.
  const auth = [authMiddleware, requireLocalUser, requireTrustedClaims, requireActiveAccount, requirePasswordChanged];

  router.get('/', auth, validateQuery(paginationSchema), asyncHandler(listLabTests));
  router.post('/', auth, validateBody(createLabTestSchema), asyncHandler(createLabTest));
  router.put('/:id', auth, validateBody(updateLabTestSchema), asyncHandler(updateLabTest));

  return router;
};
