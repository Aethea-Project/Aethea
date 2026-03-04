/**
 * Lab Tests Controller
 *
 * Auth is handled by `requireLocalUser` middleware in the route layer.
 * Each handler receives `req.localUser` (the Prisma User record).
 */

import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';
import { parsePagination, paginatedResult } from '../lib/pagination.js';

export const listLabTests = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const { page, limit, skip } = parsePagination(req);

  const [tests, total] = await Promise.all([
    prisma.labTest.findMany({
      where: { userId: user.id },
      orderBy: { measuredAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.labTest.count({ where: { userId: user.id } }),
  ]);

  res.json(paginatedResult(tests, total, page, limit));
};

export const createLabTest = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;

  const test = await prisma.labTest.create({
    data: {
      userId: user.id,
      testName: req.body.testName,
      category: req.body.category,
      value: req.body.value,
      unit: req.body.unit,
      refMin: req.body.refMin,
      refMax: req.body.refMax,
      refText: req.body.refText,
      status: req.body.status,
      orderedBy: req.body.orderedBy,
      notes: req.body.notes,
      measuredAt: new Date(req.body.measuredAt),
    },
  });

  res.status(201).json({ test });
};

export const updateLabTest = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;

  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) {
    throw AppError.badRequest('Missing lab test id');
  }

  const existing = await prisma.labTest.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    throw AppError.notFound('Lab test not found');
  }

  const test = await prisma.labTest.update({
    where: { id },
    data: {
      testName: req.body.testName ?? existing.testName,
      category: req.body.category ?? existing.category,
      value: req.body.value ?? existing.value,
      unit: req.body.unit ?? existing.unit,
      refMin: req.body.refMin ?? existing.refMin,
      refMax: req.body.refMax ?? existing.refMax,
      refText: req.body.refText ?? existing.refText,
      status: req.body.status ?? existing.status,
      orderedBy: req.body.orderedBy ?? existing.orderedBy,
      notes: req.body.notes ?? existing.notes,
      measuredAt: req.body.measuredAt ? new Date(req.body.measuredAt) : existing.measuredAt,
    },
  });

  res.json({ test });
};
