import { Router, RequestHandler } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createAdminUser,
  listAdminUsers,
  updateAdminUserStatus,
  getAdminUserById,
  updateAdminUserProfile,
  sendAdminUserPasswordResetLink,
  updateAdminUserAccountType,
  deleteAdminUser,
  getAuditLog,
  getAdminDashboard,
} from '../controllers/admin.controller.js';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import {
  adminCreateUserSchema,
  adminListUsersQuerySchema,
  adminUpdateUserProfileSchema,
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
import { requireAAL2 } from '../middleware/requireAAL2.js';

export const createAdminRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  const adminAuth = [
    authMiddleware,
    requireLocalUser,
    requireTrustedClaims,
    requirePasswordChanged,
    requireAccountType('admin'),
    requireAAL2,
  ];

  router.get('/users', adminAuth, validateQuery(adminListUsersQuerySchema), asyncHandler(listAdminUsers));
  router.post('/users', adminAuth, validateBody(adminCreateUserSchema), asyncHandler(createAdminUser));
  router.get('/users/:id', adminAuth, asyncHandler(getAdminUserById));
  router.patch('/users/:id/profile', adminAuth, validateBody(adminUpdateUserProfileSchema), asyncHandler(updateAdminUserProfile));
  router.post('/users/:id/password-reset-link', adminAuth, validateBody(adminSendPasswordResetLinkSchema), asyncHandler(sendAdminUserPasswordResetLink));
  router.patch('/users/:id/account-type', adminAuth, validateBody(adminUpdateUserAccountTypeSchema), asyncHandler(updateAdminUserAccountType));
  router.patch('/users/:id/status', adminAuth, validateBody(adminUpdateUserStatusSchema), asyncHandler(updateAdminUserStatus));
  router.delete('/users/:id', adminAuth, asyncHandler(deleteAdminUser));
  router.get('/audit-log', adminAuth, validateQuery(adminAuditLogQuerySchema), asyncHandler(getAuditLog));
  router.get('/dashboard', adminAuth, asyncHandler(getAdminDashboard));

  // Note: staff verification queue endpoints are mounted via createAdminVerificationRoutes
  // under the same /api/v1/admin namespace.

  // --- BullMQ Dashboard ---
  let queueDashboardRouter: ReturnType<ExpressAdapter['getRouter']> | null = null;

  router.use('/queues', adminAuth, asyncHandler(async (req, res, next) => {
    if (!queueDashboardRouter) {
      const { extractionQueue } = await import('../queues/extraction.queue.js');
      const serverAdapter = new ExpressAdapter();
      serverAdapter.setBasePath('/api/v1/admin/queues');

      createBullBoard({
        queues: [new BullMQAdapter(extractionQueue)],
        serverAdapter,
      });

      queueDashboardRouter = serverAdapter.getRouter();
    }

    queueDashboardRouter(req, res, next);
  }));

  return router;
};
