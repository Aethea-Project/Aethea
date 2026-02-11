/**
 * Scans Routes (placeholder)
 */

import { Router, RequestHandler } from 'express';
import { listScans } from '../controllers/scans.controller.js';

export const createScanRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();
  router.get('/', authMiddleware, listScans);
  return router;
};

export default createScanRoutes;
