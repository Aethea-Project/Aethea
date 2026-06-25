/**
 * Notification Service — business logic for in-app notifications
 *
 * Delegates to the repository for data access and handles
 * merged queries (personal + system announcements).
 */

import {
  listMergedNotifications,
  markNotificationsRead,
  getUnreadCount,
} from '../repositories/notificationRepository.js';

export async function getMyNotifications(userId: string, userRole: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  return listMergedNotifications(userId, userRole, skip, limit);
}

export async function markRead(userId: string, ids: string[]) {
  return markNotificationsRead(userId, ids);
}

export async function getMyUnreadCount(userId: string, userRole: string) {
  return getUnreadCount(userId, userRole);
}
