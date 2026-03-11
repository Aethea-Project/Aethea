/**
 * Reservations Routes
 */

import { Router, RequestHandler } from 'express';
import { createReservation, listReservations, updateReservation } from '../controllers/reservations.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { requireActiveAccount, requirePasswordChanged, requireTrustedClaims } from '../middleware/requireAccountType.js';
import { createReservationSchema, updateReservationSchema, paginationSchema } from '../schemas/index.js';

export const createReservationRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  // Fail fast on auth claims/status before touching Prisma.
  const auth = [authMiddleware, requireTrustedClaims, requireActiveAccount, requirePasswordChanged, requireLocalUser];

  router.get('/', auth, validateQuery(paginationSchema), asyncHandler(listReservations));
  router.post('/', auth, validateBody(createReservationSchema), asyncHandler(createReservation));
  router.put('/:id', auth, validateBody(updateReservationSchema), asyncHandler(updateReservation));

  return router;
};
