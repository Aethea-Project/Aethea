/**
 * Scans Routes
 */

import { Router, RequestHandler } from 'express';
import { createScan, listScans, updateScan } from '../controllers/scans.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { createScanSchema, updateScanSchema, paginationSchema } from '../schemas/index.js';

export const createScanRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  // All routes: JWT auth → local user resolution → handler
  const auth = [authMiddleware, requireLocalUser];

  router.get('/', auth, validateQuery(paginationSchema), asyncHandler(listScans));
  router.post('/', auth, validateBody(createScanSchema), asyncHandler(createScan));
  router.put('/:id', auth, validateBody(updateScanSchema), asyncHandler(updateScan));

  return router;
};
