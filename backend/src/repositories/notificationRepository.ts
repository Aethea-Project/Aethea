/**
 * Notification Repository — typed queries for notifications + system announcements
 *
 * Architecture:
 *   Personal notifications → `Notification` table (userId-scoped)
 *   System broadcasts      → `SystemAnnouncement` table (role-targeted, lazy read tracking)
 *
 * The merged query combines both into a unified timeline for the user.
 */

import prisma from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { NotificationType } from '../generated/prisma/client.js';

/**
 * Unified notification item shape returned to the API layer.
 * Both personal notifications and system announcements are normalized into this.
 */
export interface UnifiedNotification {
  id: string;
  userId: string;
  type: NotificationType | 'system_broadcast';
  title: string;
  body: string;
  isRead: boolean;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
}

/**
 * Create a personal notification (used by InAppStrategy).
 */
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

  return notification;
}

/**
 * Merged list: personal notifications + system announcements.
 * System announcements are "lazy read" — we only track reads, not individual rows per user.
 */
export async function listMergedNotifications(
  userId: string,
  userRole: string,
  skip: number,
  take: number,
): Promise<{ notifications: UnifiedNotification[]; total: number }> {

  // 1. Fetch personal notifications
  const personalNotifs = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  const personalTotal = await prisma.notification.count({ where: { userId } });

  // 2. Fetch active system announcements targeting this user's role
  const now = new Date();
  const announcements = await prisma.systemAnnouncement.findMany({
    where: {
      OR: [
        { targetRoles: { has: userRole } },
        { targetRoles: { has: 'all' } },
      ],
      AND: [
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
      ],
    },
    include: {
      reads: {
        where: { userId },
        select: { readAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 3. Normalize announcements into the same shape
  const announcementNotifs: UnifiedNotification[] = announcements.map(a => ({
    id: `announcement_${a.id}`,
    userId,
    type: 'system_broadcast' as const,
    title: a.title,
    body: a.body,
    isRead: a.reads.length > 0,
    metadata: { announcementId: a.id },
    createdAt: a.createdAt,
  }));

  // 4. Merge and sort chronologically
  const personalAsUnified: UnifiedNotification[] = personalNotifs.map(n => ({
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    isRead: n.isRead,
    metadata: n.metadata,
    createdAt: n.createdAt,
  }));

  const merged = [...personalAsUnified, ...announcementNotifs]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const total = personalTotal + announcementNotifs.length;

  // 5. Paginate
  const paginated = merged.slice(skip, skip + take);

  return { notifications: paginated, total };
}

/**
 * Mark personal notifications as read.
 */
export async function markNotificationsRead(userId: string, ids: string[]) {
  // Separate announcement IDs from personal notification IDs
  const announcementIds = ids
    .filter(id => id.startsWith('announcement_'))
    .map(id => id.replace('announcement_', ''));
  const personalIds = ids.filter(id => !id.startsWith('announcement_'));

  // Mark personal notifications as read
  if (personalIds.length > 0) {
    await prisma.notification.updateMany({
      where: { userId, id: { in: personalIds } },
      data: { isRead: true },
    });
  }

  // Mark announcements as read (upsert into UserAnnouncementRead)
  if (announcementIds.length > 0) {
    for (const announcementId of announcementIds) {
      await prisma.userAnnouncementRead.upsert({
        where: {
          userId_announcementId: { userId, announcementId },
        },
        create: { userId, announcementId },
        update: {}, // Already read, no-op
      });
    }
  }
}

/**
 * Get the unread count (personal + announcements).
 */
export async function getUnreadCount(userId: string, userRole: string): Promise<number> {
  const personalUnread = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  const announcementsTotal = await prisma.systemAnnouncement.count({
    where: {
      OR: [
        { targetRoles: { has: userRole } },
        { targetRoles: { has: 'all' } },
      ],
      AND: [
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      ],
    },
  });
  const announcementsRead = await prisma.userAnnouncementRead.count({
    where: { userId },
  });

  return personalUnread + Math.max(0, announcementsTotal - announcementsRead);
}
