/**
 * Lab Tests Routes (placeholder)
 */

import { Router, RequestHandler } from 'express';
import { createLabTest, listLabTests, updateLabTest } from '../controllers/labTests.controller.js';
import { validateBody } from '../middleware/validate.js';
import { createLabTestSchema, updateLabTestSchema } from '../schemas/index.js';

export const createLabTestRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();
  router.get('/', authMiddleware, listLabTests);
  router.post('/', authMiddleware, validateBody(createLabTestSchema), createLabTest);
  router.put('/:id', authMiddleware, validateBody(updateLabTestSchema), updateLabTest);
  return router;
};

export default createLabTestRoutes;
