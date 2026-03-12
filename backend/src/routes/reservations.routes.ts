/**
 * Reservations Routes
 */

import { Router, RequestHandler } from 'express';
import {
  listReservations,
  createReservation,
  cancelReservation,
  getScheduleSlots,
  patchReservationStatus,
} from '../controllers/reservations.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { requireActiveAccount, requirePasswordChanged, requireTrustedClaims } from '../middleware/requireAccountType.js';
import {
  createReservationSchema,
  updateReservationStatusSchema,
  paginationSchema,
} from '../schemas/index.js';

export const createReservationRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  const auth = [authMiddleware, requireTrustedClaims, requireActiveAccount, requirePasswordChanged, requireLocalUser];

  // Patient: list their reservations
  router.get('/', auth, validateQuery(paginationSchema), asyncHandler(listReservations));
  // Patient: book a slot
  router.post('/', auth, validateBody(createReservationSchema), asyncHandler(createReservation));
  // Patient: cancel their own reservation
  router.delete('/:id', auth, asyncHandler(cancelReservation));
  // Doctor: view anonymized slots for a schedule they own
  router.get('/schedule/:scheduleId/slots', auth, asyncHandler(getScheduleSlots));
  // Doctor: update a slot's status (e.g., confirmed → in_progress → completed)
  router.patch('/:id/status', auth, validateBody(updateReservationStatusSchema), asyncHandler(patchReservationStatus));

  return router;
};

