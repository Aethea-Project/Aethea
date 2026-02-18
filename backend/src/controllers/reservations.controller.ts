/**
 * Reservations Controller (placeholder)
 */

import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { ensureLocalUser, getAuthenticatedUser } from '../lib/authUser.js';

export const listReservations = async (req: Request, res: Response): Promise<void> => {
  const authUser = getAuthenticatedUser(req);

  if (!authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  await ensureLocalUser(authUser);

  const reservations = await prisma.reservation.findMany({
    where: { userId: authUser.id },
    orderBy: { startAt: 'asc' },
  });

  res.json({ reservations });
};

export const createReservation = async (req: Request, res: Response): Promise<void> => {
  const authUser = getAuthenticatedUser(req);

  if (!authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  await ensureLocalUser(authUser);

  const reservation = await prisma.reservation.create({
    data: {
      userId: authUser.id,
      doctorName: req.body.doctorName,
      specialty: req.body.specialty,
      reason: req.body.reason,
      location: req.body.location,
      startAt: new Date(req.body.startAt),
      endAt: req.body.endAt ? new Date(req.body.endAt) : null,
      status: req.body.status,
      notes: req.body.notes,
    },
  });

  res.status(201).json({ reservation });
};

export const updateReservation = async (req: Request, res: Response): Promise<void> => {
  const authUser = getAuthenticatedUser(req);

  if (!authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'Missing reservation id' });
    return;
  }

  await ensureLocalUser(authUser);

  const existing = await prisma.reservation.findFirst({ where: { id, userId: authUser.id } });
  if (!existing) {
    res.status(404).json({ error: 'Reservation not found' });
    return;
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data: {
      doctorName: req.body.doctorName ?? existing.doctorName,
      specialty: req.body.specialty ?? existing.specialty,
      reason: req.body.reason ?? existing.reason,
      location: req.body.location ?? existing.location,
      startAt: req.body.startAt ? new Date(req.body.startAt) : existing.startAt,
      endAt: req.body.endAt ? new Date(req.body.endAt) : existing.endAt,
      status: req.body.status ?? existing.status,
      notes: req.body.notes ?? existing.notes,
    },
  });

  res.json({ reservation });
};
