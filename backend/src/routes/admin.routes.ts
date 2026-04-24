import { Router, RequestHandler } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createAdminUser,
  listAdminUsers,
  updateAdminUserStatus,
  getAdminUserById,
  updateAdminUserProfile,
  resetAdminUserTemporaryPassword,
  sendAdminUserPasswordResetLink,
  updateAdminUserAccountType,
  deleteAdminUser,
  getAuditLog,
} from '../controllers/admin.controller.js';
import {
  adminCreateUserSchema,
  adminListUsersQuerySchema,
  adminUpdateUserProfileSchema,
  adminResetTemporaryPasswordSchema,
  adminSendPasswordResetLinkSchema,
  adminUpdateUserAccountTypeSchema,
  adminUpdateUserStatusSchema,
  adminAuditLogQuerySchema,
} from '../schemas/index.js';
import {
  requireAccountType,
  requirePasswordChanged,
  requireTrustedClaims,
} from '../middleware/requireAccountType.js';
import { requireLocalUser } from '../lib/authMiddleware.js';

export const createAdminRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  const adminAuth = [
    authMiddleware,
    requireLocalUser,
    requireTrustedClaims,
    requirePasswordChanged,
    requireAccountType('admin'),
  ];

  router.get('/users', adminAuth, validateQuery(adminListUsersQuerySchema), asyncHandler(listAdminUsers));
  router.post('/users', adminAuth, validateBody(adminCreateUserSchema), asyncHandler(createAdminUser));
  router.get('/users/:id', adminAuth, asyncHandler(getAdminUserById));
  router.patch('/users/:id/profile', adminAuth, validateBody(adminUpdateUserProfileSchema), asyncHandler(updateAdminUserProfile));
  router.patch('/users/:id/temporary-password', adminAuth, validateBody(adminResetTemporaryPasswordSchema), asyncHandler(resetAdminUserTemporaryPassword));
  router.post('/users/:id/password-reset-link', adminAuth, validateBody(adminSendPasswordResetLinkSchema), asyncHandler(sendAdminUserPasswordResetLink));
  router.patch('/users/:id/account-type', adminAuth, validateBody(adminUpdateUserAccountTypeSchema), asyncHandler(updateAdminUserAccountType));
  router.patch('/users/:id/status', adminAuth, validateBody(adminUpdateUserStatusSchema), asyncHandler(updateAdminUserStatus));
  router.delete('/users/:id', adminAuth, asyncHandler(deleteAdminUser));
  router.get('/audit-log', adminAuth, validateQuery(adminAuditLogQuerySchema), asyncHandler(getAuditLog));

  // Note: staff verification queue endpoints are mounted via createAdminVerificationRoutes
  // under the same /api/v1/admin namespace.

  return router;
};
