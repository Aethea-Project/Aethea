/**
 * useNotifications - Use-case hook for in-app notifications
 *
 * Architecture layer: Pages -> [this hook] -> medicalApi -> apiClient
 */

import { useCallback, useEffect, useState } from 'react';
import { medicalApi, Notification } from '../services/medicalApi';

export interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markRead: (ids: string[]) => Promise<void>;
  refresh: () => void;
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [notifResult, count] = await Promise.all([
        medicalApi.fetchNotifications(),
        medicalApi.fetchUnreadCount(),
      ]);
      setNotifications(notifResult.notifications);
      setUnreadCount(count);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markRead = useCallback(async (ids: string[]): Promise<void> => {
    await medicalApi.markNotificationsRead(ids);
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - ids.length));
  }, []);

  return { notifications, unreadCount, loading, error, markRead, refresh: fetchData };
}
