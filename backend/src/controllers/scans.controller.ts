/**
 * Scans Controller
 *
 * Auth is handled by `requireLocalUser` middleware in the route layer.
 * Each handler receives `req.localUser` (the Prisma User record).
 */

import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';
import { parsePagination, paginatedResult } from '../lib/pagination.js';

export const listScans = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const { page, limit, skip } = parsePagination(req);

  const [scans, total] = await Promise.all([
    prisma.scan.findMany({
      where: { userId: user.id },
      orderBy: { scanDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.scan.count({ where: { userId: user.id } }),
  ]);

  res.json(paginatedResult(scans, total, page, limit));
};

export const createScan = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;

  const scan = await prisma.scan.create({
    data: {
      userId: user.id,
      type: req.body.type,
      bodyPart: req.body.bodyPart,
      description: req.body.description,
      findings: req.body.findings,
      radiologist: req.body.radiologist,
      priority: req.body.priority,
      status: req.body.status,
      reportUrl: req.body.reportUrl,
      scanDate: new Date(req.body.scanDate),
    },
  });

  res.status(201).json({ scan });
};

export const updateScan = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;

  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) {
    throw AppError.badRequest('Missing scan id');
  }

  const existing = await prisma.scan.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    throw AppError.notFound('Scan not found');
  }

  const scan = await prisma.scan.update({
    where: { id },
    data: {
      type: req.body.type ?? existing.type,
      bodyPart: req.body.bodyPart ?? existing.bodyPart,
      description: req.body.description ?? existing.description,
      findings: req.body.findings ?? existing.findings,
      radiologist: req.body.radiologist ?? existing.radiologist,
      priority: req.body.priority ?? existing.priority,
      status: req.body.status ?? existing.status,
      reportUrl: req.body.reportUrl ?? existing.reportUrl,
      scanDate: req.body.scanDate ? new Date(req.body.scanDate) : existing.scanDate,
    },
  });

  res.json({ scan });
};
