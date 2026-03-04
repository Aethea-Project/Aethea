/**
 * Reservations Routes
 */

import { Router, RequestHandler } from 'express';
import { createReservation, listReservations, updateReservation } from '../controllers/reservations.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { createReservationSchema, updateReservationSchema, paginationSchema } from '../schemas/index.js';

export const createReservationRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  // All routes: JWT auth → local user resolution → handler
  const auth = [authMiddleware, requireLocalUser];

  router.get('/', auth, validateQuery(paginationSchema), asyncHandler(listReservations));
  router.post('/', auth, validateBody(createReservationSchema), asyncHandler(createReservation));
  router.put('/:id', auth, validateBody(updateReservationSchema), asyncHandler(updateReservation));

  return router;
};
