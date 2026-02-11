/**
 * Lab Tests Routes (placeholder)
 */

import { Router, RequestHandler } from 'express';
import { listLabTests } from '../controllers/labTests.controller.js';

export const createLabTestRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();
  router.get('/', authMiddleware, listLabTests);
  return router;
};

export default createLabTestRoutes;
