/**
 * useNotifications - Use-case hook for in-app notifications
 *
 * Architecture layer: Pages -> [this hook] -> NotificationsContext -> medicalApi -> apiClient
 * Consumes the shared NotificationsContext to prevent duplicate REST calls and multiple SSE streams.
 */

import { useNotificationsContext } from '../contexts/NotificationsContext';
import { Notification } from '../services/medicalApi';

export interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markRead: (ids: string[]) => Promise<void>;
  refresh: () => void;
}

export function useNotifications(): UseNotificationsResult {
  return useNotificationsContext();
}
