/**
 * Medicine Controller â€” handler factories for medicine search & patient conditions
 *
 * Each factory receives a MedicineService instance and returns an Express handler
 * wrapped in asyncHandler (no try/catch needed).
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { MedicineService } from '../services/medicine.service.js';
import { SearchMedicinesInput, SetConditionsInput } from '../schemas/medicine.schemas.js';
import { AppError } from '../lib/AppError.js';

/** GET /medicines â€” search medicines (public, personalized if logged in) */
export function createSearchMedicinesHandler(service: MedicineService) {
  return asyncHandler(async (req: Request, res: Response) => {
    const patientId = req.localUser?.id;
    const input = req.query as unknown as SearchMedicinesInput;
    const page = Number(input.page) || 1;
    const limit = Number(input.limit) || 20;
    const result = await service.searchMedicines({ ...input, page, limit }, patientId);
    res.json(result);
  });
}

/** GET /medicines/categories â€” list available categories */
export function createGetCategoriesHandler(service: MedicineService) {
  return asyncHandler(async (_req: Request, res: Response) => {
    const categories = await service.getCategories();
    res.json({ categories });
  });
}

/** GET /medicines/:id â€” single medicine with flags + FDA warning */
export function createGetMedicineHandler(service: MedicineService) {
  return asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    if (!id) throw AppError.badRequest('Missing medicine id');
    const patientId = req.localUser?.id;
    const medicine = await service.getMedicineById(id, patientId);
    if (!medicine) throw AppError.notFound('Medicine not found');
    res.json({ medicine });
  });
}

/** GET /medicines/conditions/me â€” get patient's saved conditions (auth required) */
export function createGetConditionsHandler(service: MedicineService) {
  return asyncHandler(async (req: Request, res: Response) => {
    const patientId = req.localUser!.id;
    const conditions = await service.getPatientConditions(patientId);
    res.json({ conditions });
  });
}

/** PUT /medicines/conditions/me â€” set patient's conditions (auth required) */
export function createSetConditionsHandler(service: MedicineService) {
  return asyncHandler(async (req: Request, res: Response) => {
    const patientId = req.localUser!.id;
    const { conditions, source } = req.body as SetConditionsInput;
    const result = await service.setPatientConditions(patientId, conditions, source);
    res.json(result);
  });
}



