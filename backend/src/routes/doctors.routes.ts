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
  getMyWeeklyTemplate,
  saveMyWeeklyTemplateCtrl,
  generateSchedules,
  getMyExceptions,
  createMyException,
  deleteMyException,
  listDoctorSharedRecords,
  publishMySchedules,
  listSpecialties,
} from '../controllers/doctors.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { requireActiveAccount, requirePasswordChanged, requireTrustedClaims } from '../middleware/requireAccountType.js';
import { requireAAL2 } from '../middleware/requireAAL2.js';
import {
  doctorListQuerySchema,
  marketplaceScheduleQuerySchema,
  scheduleQuerySchema,
  upsertDoctorProfileSchema,
  createDoctorScheduleSchema,
  saveWeeklyTemplateSchema,
  createScheduleExceptionSchema,
  generateSchedulesSchema,
  publishSchedulesSchema,
} from '../schemas/index.js';
import { publicCache, noCache } from '../middleware/cache.js';
import { enforceIdempotency } from '../middleware/idempotency.js';

export const createDoctorRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  const auth = [
    authMiddleware,
    requireLocalUser,
    requireTrustedClaims,
    requireActiveAccount,
    requirePasswordChanged,
    requireAAL2,
  ];

  // Doctor-only: manage own profile and schedules (MUST be before /:id)
  router.get('/me/profile', auth, noCache, asyncHandler(getMyDoctorProfile));
  router.put('/me/profile', auth, noCache, validateBody(upsertDoctorProfileSchema), asyncHandler(upsertDoctorProfile));
  router.get('/me/shared-records', auth, noCache, asyncHandler(listDoctorSharedRecords));
  router.post('/me/schedules', auth, enforceIdempotency, noCache, validateBody(createDoctorScheduleSchema), asyncHandler(createMySchedule));
  router.patch('/me/schedules/publish', auth, noCache, validateBody(publishSchedulesSchema), asyncHandler(publishMySchedules));
  router.delete('/me/schedules/:scheduleId', auth, noCache, asyncHandler(deleteMySchedule));

  // Weekly template
  router.get('/me/weekly-template', auth, noCache, asyncHandler(getMyWeeklyTemplate));
  router.put('/me/weekly-template', auth, noCache, validateBody(saveWeeklyTemplateSchema), asyncHandler(saveMyWeeklyTemplateCtrl));

  // Generate schedules from template
  router.post('/me/generate-schedules', auth, enforceIdempotency, noCache, validateBody(generateSchedulesSchema), asyncHandler(generateSchedules));

  // Schedule exceptions
  router.get('/me/exceptions', auth, noCache, asyncHandler(getMyExceptions));
  router.post('/me/exceptions', auth, noCache, validateBody(createScheduleExceptionSchema), asyncHandler(createMyException));
  router.delete('/me/exceptions/:exceptionId', auth, noCache, asyncHandler(deleteMyException));

  // Public (but authenticated): browse doctors
  router.get('/', auth, publicCache(300), validateQuery(doctorListQuerySchema), asyncHandler(listDoctors));
  router.get('/marketplace/posts', auth, noCache, validateQuery(marketplaceScheduleQuerySchema), asyncHandler(listMarketplaceSchedulePosts));
  router.get('/specialties', auth, publicCache(300), asyncHandler(listSpecialties));
  router.get('/:id', auth, publicCache(300), asyncHandler(getDoctorById));
  router.get('/:id/schedules', auth, noCache, validateQuery(scheduleQuerySchema), asyncHandler(getDoctorSchedules));

  return router;
};
