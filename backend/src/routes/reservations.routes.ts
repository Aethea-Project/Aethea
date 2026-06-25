/**
 * Reservations Routes
 */

import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import {
  listReservations,
  createReservation,
  cancelReservation,
  subscribeToAvailabilityAlerts,
  getScheduleSlots,
  patchReservationStatus,
  getPatientDataForReservation,
  getPendingFeedback,
  streamLiveQueue,
} from '../controllers/reservations.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { requireActiveAccount, requirePasswordChanged, requireTrustedClaims } from '../middleware/requireAccountType.js';
import {
  createReservationSchema,
  reservationAvailabilityAlertSchema,
  updateReservationStatusSchema,
  paginationSchema,
} from '../schemas/index.js';
import { enforceIdempotency } from '../middleware/idempotency.js';
import { noCache } from '../middleware/cache.js';

export const createReservationRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  const auth = [authMiddleware, requireLocalUser, requireTrustedClaims, requireActiveAccount, requirePasswordChanged];

  // Patient: list their reservations
  router.get('/', auth, noCache, validateQuery(paginationSchema.extend({
    tab: z.enum(['upcoming', 'past', 'cancelled']).optional()
  })), asyncHandler(listReservations));
  // Patient: check if there is an appointment pending feedback
  router.get('/pending-feedback', auth, noCache, asyncHandler(getPendingFeedback));
  // Patient: book a slot
  router.post('/', auth, enforceIdempotency, noCache, validateBody(createReservationSchema), asyncHandler(createReservation));
  // Patient: cancel their own reservation
  router.delete('/:id', auth, noCache, asyncHandler(cancelReservation));
  // Patient: subscribe to availability alerts for full schedules
  router.post('/alerts', auth, enforceIdempotency, noCache, validateBody(reservationAvailabilityAlertSchema), asyncHandler(subscribeToAvailabilityAlerts));
  // Patient: SSE stream for live queue
  router.get('/schedule/:scheduleId/live-queue/stream', auth, asyncHandler(streamLiveQueue));
  // Doctor: view anonymized slots for a schedule they own
  router.get('/schedule/:scheduleId/slots', auth, noCache, asyncHandler(getScheduleSlots));
  // Doctor: update a slot's status (e.g., confirmed → in_progress → completed)
  router.patch('/:id/status', auth, enforceIdempotency, noCache, validateBody(updateReservationStatusSchema), asyncHandler(patchReservationStatus));
  // Doctor: view patient health data during the reservation window
  router.get('/:id/patient-data', auth, noCache, asyncHandler(getPatientDataForReservation));

  return router;
};

