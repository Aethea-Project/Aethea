/**
 * Scans Routes (placeholder)
 */

import { Router, RequestHandler } from 'express';
import { createScan, listScans, updateScan } from '../controllers/scans.controller.js';
import { validateBody } from '../middleware/validate.js';
import { createScanSchema, updateScanSchema } from '../schemas/index.js';

export const createScanRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();
  router.get('/', authMiddleware, listScans);
  router.post('/', authMiddleware, validateBody(createScanSchema), createScan);
  router.put('/:id', authMiddleware, validateBody(updateScanSchema), updateScan);
  return router;
};

export default createScanRoutes;
