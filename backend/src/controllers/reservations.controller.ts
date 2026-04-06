/**
 * Reservations Controller — patient booking and doctor slot management
 *
 * Uses reservationService for all business logic.
 * Controllers only: parse params, call one service fn, return response.
 */

import { Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { parsePagination, paginatedResult } from '../lib/pagination.js';
import {
  bookReservation,
  getMyReservations,
  cancelMyReservation,
  subscribeAvailabilityAlert,
  getDoctorScheduleSlots,
  updateSlotStatus,
} from '../services/reservationService.js';

/** GET /reservations — patient's own reservations */
export const listReservations = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const { page, limit } = parsePagination(req);
  const { reservations, total } = await getMyReservations(user.id, page, limit);
  res.json(paginatedResult(reservations, total, page, limit));
};

/** POST /reservations — patient books a slot */
export const createReservation = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  if (user.accountType === 'admin') {
    throw AppError.forbidden('Admin accounts cannot book appointments. Use a non-admin account.');
  }
  const reservation = await bookReservation(user.id, {
    patientEmail: req.user?.email,
    doctorScheduleId: req.body.doctorScheduleId,
    slotIndex: req.body.slotIndex,
    reason: req.body.reason,
    notes: req.body.notes,
    shareHealthData: req.body.shareHealthData ?? false,
    notifyOnCancel: req.body.notifyOnCancel ?? false,
  });
  res.status(201).json({ reservation });
};

/** DELETE /reservations/:id — patient cancels their own reservation */
export const cancelReservation = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const id = req.params.id as string;
  if (!id) throw AppError.badRequest('Missing reservation id');
  await cancelMyReservation(id, user.id);
  res.status(204).send();
};

/** POST /reservations/alerts — patient subscribes to slot-available alert for a full schedule */
export const subscribeToAvailabilityAlerts = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  if (user.accountType !== 'patient') {
    throw AppError.forbidden('Only patient accounts can subscribe to slot alerts.');
  }

  await subscribeAvailabilityAlert({
    patientUserId: user.id,
    patientEmail: req.user?.email,
    doctorScheduleId: req.body.doctorScheduleId,
  });

  res.status(201).json({
    subscribed: true,
    message: 'You will be notified in-app and by email when a slot becomes available.',
  });
};

/** GET /reservations/schedule/:scheduleId/slots — doctor views anonymized slots */
export const getScheduleSlots = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const scheduleId = req.params.scheduleId as string;
  if (!scheduleId) throw AppError.badRequest('Missing scheduleId');
  const slots = await getDoctorScheduleSlots(scheduleId, user.id);
  res.json(slots);
};

/** PATCH /reservations/:id/status — doctor updates a slot's status */
export const patchReservationStatus = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const id = req.params.id as string;
  if (!id) throw AppError.badRequest('Missing reservation id');
  const reservation = await updateSlotStatus(id, user.id, req.body.status, req.body.notes);
  res.json({ reservation });
};
