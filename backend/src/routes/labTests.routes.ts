/**
 * Lab Tests Routes
 */

import { Router, RequestHandler } from 'express';
import { createLabTest, listLabTests, updateLabTest } from '../controllers/labTests.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { createLabTestSchema, updateLabTestSchema, paginationSchema } from '../schemas/index.js';

export const createLabTestRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  // All routes: JWT auth → local user resolution → handler
  const auth = [authMiddleware, requireLocalUser];

  router.get('/', auth, validateQuery(paginationSchema), asyncHandler(listLabTests));
  router.post('/', auth, validateBody(createLabTestSchema), asyncHandler(createLabTest));
  router.put('/:id', auth, validateBody(updateLabTestSchema), asyncHandler(updateLabTest));

  return router;
};
