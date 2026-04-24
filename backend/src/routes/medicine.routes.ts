/**
 * Medicine Routes
 *
 * Factory builds the DI chain (Prisma → Repository → Service) internally
 * and mounts all medicine endpoints.
 *
 * NOTE: /conditions/me routes are placed BEFORE /:id to prevent Express
 * from matching "conditions" as a dynamic :id parameter.
 */

import { Router, RequestHandler } from 'express';
import { PrismaClient } from '../generated/prisma/index.js';
import { MedicineRepository } from '../repositories/medicine.repository.js';
import { MedicineService } from '../services/medicine.service.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { SearchMedicinesSchema, SetConditionsSchema } from '../schemas/medicine.schemas.js';
import {
  createSearchMedicinesHandler,
  createGetCategoriesHandler,
  createGetMedicineHandler,
  createGetConditionsHandler,
  createSetConditionsHandler,
} from '../controllers/medicine.controller.js';

export function createMedicineRoutes(prisma: PrismaClient, requireLocalUser: RequestHandler): Router {
  const router = Router();

  const repo = new MedicineRepository(prisma);
  const service = new MedicineService(repo);

  router.get('/', validateQuery(SearchMedicinesSchema), createSearchMedicinesHandler(service));
  router.get('/categories', createGetCategoriesHandler(service));
  router.get('/:id', createGetMedicineHandler(service));
  router.get('/conditions/me', requireLocalUser, createGetConditionsHandler(service));
  router.put('/conditions/me', requireLocalUser, validateBody(SetConditionsSchema), createSetConditionsHandler(service));

  return router;
}
