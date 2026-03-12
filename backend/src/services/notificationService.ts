/**
 * Notification Service — business logic for in-app notifications
 */

import {
  listNotifications,
  markNotificationsRead,
  getUnreadCount,
} from '../repositories/notificationRepository.js';

export async function getMyNotifications(userId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  return listNotifications(userId, skip, limit);
}

export async function markRead(userId: string, ids: string[]) {
  // updateMany already filters by userId — no over-fetch vulnerability
  return markNotificationsRead(userId, ids);
}

export async function getMyUnreadCount(userId: string) {
  return getUnreadCount(userId);
}
