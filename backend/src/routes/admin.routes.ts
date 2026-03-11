import { Router, RequestHandler } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createAdminUser,
  listAdminUsers,
  updateAdminUserStatus,
  getAuditLog,
} from '../controllers/admin.controller.js';
import {
  adminCreateUserSchema,
  adminListUsersQuerySchema,
  adminUpdateUserStatusSchema,
  adminAuditLogQuerySchema,
} from '../schemas/index.js';
import {
  requireAccountType,
  requirePasswordChanged,
  requireTrustedClaims,
} from '../middleware/requireAccountType.js';

export const createAdminRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  const adminAuth = [
    authMiddleware,
    requireTrustedClaims,
    requirePasswordChanged,
    requireAccountType('admin'),
  ];

  router.get('/users', adminAuth, validateQuery(adminListUsersQuerySchema), asyncHandler(listAdminUsers));
  router.post('/users', adminAuth, validateBody(adminCreateUserSchema), asyncHandler(createAdminUser));
  router.patch('/users/:id/status', adminAuth, validateBody(adminUpdateUserStatusSchema), asyncHandler(updateAdminUserStatus));
  router.get('/audit-log', adminAuth, validateQuery(adminAuditLogQuerySchema), asyncHandler(getAuditLog));

  // Note: staff verification queue endpoints are mounted via createAdminVerificationRoutes
  // under the same /api/v1/admin namespace.

  return router;
};
