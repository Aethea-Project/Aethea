/**
 * Medicine Routes
 *
 * NOTE: /conditions/me routes are placed BEFORE /:id to prevent Express
 * from matching "conditions" as a dynamic :id parameter.
 */

import { Router, RequestHandler } from 'express';
import { PrismaClient } from '../generated/prisma/client.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createProtectedAuthChain } from '../middleware/protectedAuth.js';
import { createOptionalAuth } from '../middleware/optionalAuth.js';
import { SearchMedicinesSchema, SetConditionsSchema } from '../schemas/medicine.schemas.js';
import {
  searchMedicinesHandler,
  getCategoriesHandler,
  getMedicineHandler,
  getConditionsHandler,
  setConditionsHandler,
} from '../controllers/medicine.controller.js';
import { publicCache, noCache } from '../middleware/cache.js';

export function createMedicineRoutes(prisma: PrismaClient, authMiddleware: RequestHandler): Router {
  const router = Router();

  const auth = createProtectedAuthChain(authMiddleware);
  const optionalAuth = createOptionalAuth(authMiddleware);

  router.get('/', optionalAuth, noCache, validateQuery(SearchMedicinesSchema), searchMedicinesHandler);
  router.get('/categories', publicCache(3600), getCategoriesHandler);
  router.get('/conditions/me', auth, noCache, getConditionsHandler);
  router.put('/conditions/me', auth, noCache, validateBody(SetConditionsSchema), setConditionsHandler);
  router.get('/:id', publicCache(3600), getMedicineHandler);

  return router;
}
