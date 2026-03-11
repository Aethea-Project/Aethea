/**
 * Scans Routes
 */

import { Router, RequestHandler } from 'express';
import { createScan, listScans, updateScan } from '../controllers/scans.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { requireActiveAccount, requirePasswordChanged, requireTrustedClaims } from '../middleware/requireAccountType.js';
import { createScanSchema, updateScanSchema, paginationSchema } from '../schemas/index.js';

export const createScanRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  // Fail fast on auth claims/status before touching Prisma.
  const auth = [authMiddleware, requireTrustedClaims, requireActiveAccount, requirePasswordChanged, requireLocalUser];

  router.get('/', auth, validateQuery(paginationSchema), asyncHandler(listScans));
  router.post('/', auth, validateBody(createScanSchema), asyncHandler(createScan));
  router.put('/:id', auth, validateBody(updateScanSchema), asyncHandler(updateScan));

  return router;
};
