/**
 * Notification Repository — typed queries for notifications
 */

import prisma from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/index.js';
import { NotificationType } from '../generated/prisma/index.js';

import { EventEmitter } from 'events';

export const notificationEmitter = new EventEmitter();

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  metadata?: Record<string, unknown>,
) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      ...(metadata ? { metadata: metadata as Prisma.InputJsonValue } : {}),
    },
  });

  notificationEmitter.emit('new_notification', {
    userId,
    notification,
  });

  return notification;
}

export async function listNotifications(userId: string, skip: number, take: number) {
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);
  return { notifications, total };
}

export async function markNotificationsRead(userId: string, ids: string[]) {
  return prisma.notification.updateMany({
    where: { userId, id: { in: ids } },
    data: { isRead: true },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}
