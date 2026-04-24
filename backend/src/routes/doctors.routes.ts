/**
 * Doctors Routes
 */

import { Router, RequestHandler } from 'express';
import {
  listDoctors,
  listMarketplaceSchedulePosts,
  getDoctorById,
  getDoctorSchedules,
  getMyDoctorProfile,
  upsertDoctorProfile,
  createMySchedule,
  deleteMySchedule,
} from '../controllers/doctors.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { requireActiveAccount, requirePasswordChanged, requireTrustedClaims } from '../middleware/requireAccountType.js';
import {
  doctorListQuerySchema,
  marketplaceScheduleQuerySchema,
  scheduleQuerySchema,
  upsertDoctorProfileSchema,
  createDoctorScheduleSchema,
} from '../schemas/index.js';

export const createDoctorRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  const auth = [authMiddleware, requireLocalUser, requireTrustedClaims, requireActiveAccount, requirePasswordChanged];

  // Doctor-only: manage own profile and schedules (MUST be before /:id)
  router.get('/me/profile', auth, asyncHandler(getMyDoctorProfile));
  router.put('/me/profile', auth, validateBody(upsertDoctorProfileSchema), asyncHandler(upsertDoctorProfile));
  router.post('/me/schedules', auth, validateBody(createDoctorScheduleSchema), asyncHandler(createMySchedule));
  router.delete('/me/schedules/:scheduleId', auth, asyncHandler(deleteMySchedule));

  // Public (but authenticated): browse doctors
  router.get('/', auth, validateQuery(doctorListQuerySchema), asyncHandler(listDoctors));
  router.get('/marketplace/posts', auth, validateQuery(marketplaceScheduleQuerySchema), asyncHandler(listMarketplaceSchedulePosts));
  router.get('/:id', auth, asyncHandler(getDoctorById));
  router.get('/:id/schedules', auth, validateQuery(scheduleQuerySchema), asyncHandler(getDoctorSchedules));

  return router;
};
