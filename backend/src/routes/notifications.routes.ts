/**
 * Notifications Routes
 */

import { Router, RequestHandler } from 'express';
import {
  listNotifications,
  markNotificationsRead,
  getUnreadCount,
} from '../controllers/notifications.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { requireActiveAccount, requirePasswordChanged, requireTrustedClaims } from '../middleware/requireAccountType.js';
import { markNotificationsReadSchema, paginationSchema } from '../schemas/index.js';

export const createNotificationRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  const auth = [authMiddleware, requireTrustedClaims, requireActiveAccount, requirePasswordChanged, requireLocalUser];

  router.get('/', auth, validateQuery(paginationSchema), asyncHandler(listNotifications));
  router.get('/unread-count', auth, asyncHandler(getUnreadCount));
  router.patch('/read', auth, validateBody(markNotificationsReadSchema), asyncHandler(markNotificationsRead));

  return router;
};
