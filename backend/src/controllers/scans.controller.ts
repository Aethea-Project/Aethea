/**
 * Scans Controller (placeholder)
 */

import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { ensureLocalUser, getAuthenticatedUser } from '../lib/authUser.js';

export const listScans = async (req: Request, res: Response): Promise<void> => {
  const authUser = getAuthenticatedUser(req);

  if (!authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  await ensureLocalUser(authUser);

  const scans = await prisma.scan.findMany({
    where: { userId: authUser.id },
    orderBy: { scanDate: 'desc' },
  });

  res.json({ scans });
};

export const createScan = async (req: Request, res: Response): Promise<void> => {
  const authUser = getAuthenticatedUser(req);

  if (!authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  await ensureLocalUser(authUser);

  const scan = await prisma.scan.create({
    data: {
      userId: authUser.id,
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
  const authUser = getAuthenticatedUser(req);

  if (!authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'Missing scan id' });
    return;
  }

  await ensureLocalUser(authUser);

  const existing = await prisma.scan.findFirst({ where: { id, userId: authUser.id } });
  if (!existing) {
    res.status(404).json({ error: 'Scan not found' });
    return;
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
