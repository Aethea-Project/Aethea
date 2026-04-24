/**
 * Notifications Routes
 */

import { Router, RequestHandler } from 'express';
import {
  listNotifications,
  markNotificationsRead,
  getUnreadCount,
  streamNotifications,
} from '../controllers/notifications.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { requireActiveAccount, requirePasswordChanged, requireTrustedClaims } from '../middleware/requireAccountType.js';
import { markNotificationsReadSchema, paginationSchema } from '../schemas/index.js';

export const createNotificationRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  const auth = [authMiddleware, requireLocalUser, requireTrustedClaims, requireActiveAccount, requirePasswordChanged];

  router.get('/', auth, validateQuery(paginationSchema), asyncHandler(listNotifications));
  router.get('/unread-count', auth, asyncHandler(getUnreadCount));
  router.patch('/read', auth, validateBody(markNotificationsReadSchema), asyncHandler(markNotificationsRead));
  
  // Use raw handler for stream to bypass asyncHandler so connection isn't closed on return
  router.get('/stream', auth, streamNotifications);

  return router;
};
