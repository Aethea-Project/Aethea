/**
 * Notifications Controller
 */

import { Request, Response } from 'express';
import { parsePagination, paginatedResult } from '../lib/pagination.js';
import {
  getMyNotifications,
  markRead,
  getMyUnreadCount,
} from '../services/notificationService.js';

/** GET /notifications — list user's notifications */
export const listNotifications = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const { page, limit } = parsePagination(req);
  const { notifications, total } = await getMyNotifications(user.id, page, limit);
  res.json(paginatedResult(notifications, total, page, limit));
};

/** PATCH /notifications/read — mark specific notifications as read */
export const markNotificationsRead = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  await markRead(user.id, req.body.ids);
  res.status(204).send();
};

/** GET /notifications/unread-count */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const count = await getMyUnreadCount(user.id);
  res.json({ count });
};

import { notificationEmitter } from '../repositories/notificationRepository.js';

/** GET /notifications/stream — Server-Sent Events endpoint */
export const streamNotifications = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Keep-alive ping to prevent connection drops
  const pingInterval = setInterval(() => {
    res.write(':\n\n');
  }, 30000);

  const onNewNotification = (data: { userId: string, notification: any }) => {
    if (data.userId === user.id) {
      res.write(`data: ${JSON.stringify(data.notification)}\n\n`);
    }
  };

  notificationEmitter.on('new_notification', onNewNotification);

  req.on('close', () => {
    clearInterval(pingInterval);
    notificationEmitter.off('new_notification', onNewNotification);
  });
};
