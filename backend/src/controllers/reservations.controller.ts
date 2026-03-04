/**
 * Reservations Controller
 *
 * Auth is handled by `requireLocalUser` middleware in the route layer.
 * Each handler receives `req.localUser` (the Prisma User record).
 */

import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';
import { parsePagination, paginatedResult } from '../lib/pagination.js';

export const listReservations = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const { page, limit, skip } = parsePagination(req);

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where: { userId: user.id },
      orderBy: { startAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.reservation.count({ where: { userId: user.id } }),
  ]);

  res.json(paginatedResult(reservations, total, page, limit));
};

export const createReservation = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;

  const reservation = await prisma.reservation.create({
    data: {
      userId: user.id,
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
  const user = req.localUser!;

  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) {
    throw AppError.badRequest('Missing reservation id');
  }

  const existing = await prisma.reservation.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    throw AppError.notFound('Reservation not found');
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
