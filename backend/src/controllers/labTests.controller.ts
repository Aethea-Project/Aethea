/**
 * Lab Tests Controller (placeholder)
 */

import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { ensureLocalUser, getAuthenticatedUser } from '../lib/authUser.js';

export const listLabTests = async (req: Request, res: Response): Promise<void> => {
  const authUser = getAuthenticatedUser(req);

  if (!authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  await ensureLocalUser(authUser);

  const tests = await prisma.labTest.findMany({
    where: { userId: authUser.id },
    orderBy: { measuredAt: 'desc' },
  });

  res.json({ tests });
};

export const createLabTest = async (req: Request, res: Response): Promise<void> => {
  const authUser = getAuthenticatedUser(req);

  if (!authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  await ensureLocalUser(authUser);

  const test = await prisma.labTest.create({
    data: {
      userId: authUser.id,
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
  const authUser = getAuthenticatedUser(req);

  if (!authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'Missing lab test id' });
    return;
  }

  await ensureLocalUser(authUser);

  const existing = await prisma.labTest.findFirst({ where: { id, userId: authUser.id } });
  if (!existing) {
    res.status(404).json({ error: 'Lab test not found' });
    return;
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
