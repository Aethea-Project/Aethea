/**
 * Medicine Controller
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as medicineService from '../services/medicineService.js';
import { SearchMedicinesInput, SetConditionsInput } from '../schemas/medicine.schemas.js';
import { AppError } from '../lib/AppError.js';

export const searchMedicinesHandler = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.localUser?.id;
  const input = req.query as unknown as SearchMedicinesInput;
  const page = Number(input.page) || 1;
  const limit = Number(input.limit) || 20;
  const result = await medicineService.searchMedicines({ ...input, page, limit }, patientId);
  res.json(result);
});

export const getCategoriesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await medicineService.getCategories();
  res.json({ categories });
});

export const getMedicineHandler = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!id) throw AppError.badRequest('Missing medicine id');
  const patientId = req.localUser?.id;
  const medicine = await medicineService.getMedicineById(id, patientId);
  if (!medicine) throw AppError.notFound('Medicine not found');
  res.json({ medicine });
});

export const getConditionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.localUser!.id;
  const conditions = await medicineService.getPatientConditions(patientId);
  res.json({ conditions });
});

export const setConditionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.localUser!.id;
  const { conditions, source } = req.body as SetConditionsInput;
  const result = await medicineService.setPatientConditions(patientId, conditions, source);
  res.json(result);
});


