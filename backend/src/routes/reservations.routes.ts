/**
 * Reservations Routes (placeholder)
 */

import { Router, RequestHandler } from 'express';
import { listReservations } from '../controllers/reservations.controller.js';

export const createReservationRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();
  router.get('/', authMiddleware, listReservations);
  return router;
};

export default createReservationRoutes;
