/**
 * Reservations Routes (placeholder)
 */

import { Router, RequestHandler } from 'express';
import { createReservation, listReservations, updateReservation } from '../controllers/reservations.controller.js';
import { validateBody } from '../middleware/validate.js';
import { createReservationSchema, updateReservationSchema } from '../schemas/index.js';

export const createReservationRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();
  router.get('/', authMiddleware, listReservations);
  router.post('/', authMiddleware, validateBody(createReservationSchema), createReservation);
  router.put('/:id', authMiddleware, validateBody(updateReservationSchema), updateReservation);
  return router;
};

export default createReservationRoutes;
