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
  getPatientHealthData,
  getPatientPendingFeedback,
  getPatientLiveQueue,
} from '../services/reservationService.js';
import { serializeReservation, serializeReservationList } from '../schemas/response.schemas.js';
import { eventBus } from '../services/notifications/EventBus.js';
import logger from '../lib/logger.js';

/** GET /reservations — patient's own reservations */
export const listReservations = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const { page, limit } = parsePagination(req);
  const tab = (req.query.tab as 'upcoming' | 'past' | 'cancelled') || 'upcoming';
  
  if (!['upcoming', 'past', 'cancelled'].includes(tab)) {
    throw AppError.badRequest('Invalid tab parameter. Must be upcoming, past, or cancelled.');
  }

  const { reservations, total } = await getMyReservations(user.id, page, limit, tab);
  res.json(paginatedResult(serializeReservationList(reservations), total, page, limit));
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
    patientLat: req.body.patientLat !== undefined ? Number(req.body.patientLat) : undefined,
    patientLng: req.body.patientLng !== undefined ? Number(req.body.patientLng) : undefined,
  });
  res.status(201).json({ reservation: serializeReservation(reservation) });
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
  res.json({ reservation: serializeReservation(reservation) });
};

/** GET /reservations/:id/patient-data — doctor views patient health data */
export const getPatientDataForReservation = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const id = req.params.id as string;
  if (!id) throw AppError.badRequest('Missing reservation id');
  const data = await getPatientHealthData(id, user.id);
  res.json(data);
};

/** GET /reservations/pending-feedback — check if there is a completed appointment pending feedback */
export const getPendingFeedback = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const pendingReservation = await getPatientPendingFeedback(user.id);
  res.json({
    pending: !!pendingReservation,
    reservation: pendingReservation ? {
      id: pendingReservation.id,
      startAt: pendingReservation.startAt,
      doctorSchedule: {
        doctorProfile: {
          id: pendingReservation.doctorSchedule.doctorProfile.id,
          firstName: pendingReservation.doctorSchedule.doctorProfile.firstName,
          lastName: pendingReservation.doctorSchedule.doctorProfile.lastName,
          specialty: pendingReservation.doctorSchedule.doctorProfile.specialty,
        }
      }
    } : null
  });
};

/** GET /reservations/schedule/:scheduleId/live-queue/stream — SSE stream for patient live queue */
export const streamLiveQueue = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const scheduleId = req.params.scheduleId as string;
  if (!scheduleId) {
    res.status(400).end();
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.flushHeaders(); // Establish connection immediately

  const sendEvent = (data: any) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    // 1. Initial fetch & authorization
    const initialQueue = await getPatientLiveQueue(scheduleId, user.id);
    sendEvent(initialQueue);

    // 2. Listen for real-time updates
    const onQueueUpdated = async (payload: { scheduleId: string }) => {
      if (payload.scheduleId === scheduleId) {
        try {
          const updatedQueue = await getPatientLiveQueue(scheduleId, user.id);
          sendEvent(updatedQueue);
        } catch (err) {
          logger.error({ err, scheduleId }, 'Error fetching updated queue for SSE');
        }
      }
    };

    eventBus.on('QUEUE_UPDATED', onQueueUpdated);

    // 3. Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(':\n\n'); // SSE comment
      }
    }, 15000);

    // 4. Cleanup on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      eventBus.off('QUEUE_UPDATED', onQueueUpdated);
      logger.debug(`SSE client disconnected for live queue on schedule ${scheduleId}`);
    });
  } catch (error: any) {
    logger.error({ err: error, scheduleId }, 'Live queue SSE error');
    if (!res.writableEnded) {
      if (error instanceof AppError) {
        res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({ message: 'Failed to connect to live queue' })}\n\n`);
      }
      res.end();
    }
  }
};

