/**
 * useNotifications - Use-case hook for in-app notifications
 *
 * Architecture layer: Pages -> [this hook] -> medicalApi -> apiClient
 */

import { useCallback, useEffect, useState } from 'react';
import { medicalApi, Notification } from '../services/medicalApi';
import { useAuth } from '@core/auth/useAuth';
import { API_BASE } from '../lib/apiClient';

export interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markRead: (ids: string[]) => Promise<void>;
  refresh: () => void;
}

export function useNotifications(): UseNotificationsResult {
  const { session, loading: authLoading } = useAuth();
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
    if (authLoading || !session) return;
    fetchData();

    // Setup Server-Sent Events for real-time notifications
    const token = session.access_token;
    const sseUrl = `${API_BASE}/notifications/stream?token=${encodeURIComponent(token)}`;
    
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ping') return; // Ignore ping
        
        // Ensure data is a valid Notification before appending
        if (data && data.id && data.type) {
          setNotifications((prev) => [data as Notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      } catch (err) {
        console.error('Failed to parse SSE message', err);
      }
    };

    eventSource.onerror = () => {
      // EventSource automatically reconnects on drop. We only log it.
      console.warn('SSE connection error. Retrying...');
    };

    return () => {
      eventSource.close();
    };
  }, [fetchData, authLoading, session]);

  const markRead = useCallback(async (ids: string[]): Promise<void> => {
    await medicalApi.markNotificationsRead(ids);
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - ids.length));
  }, []);

  return { notifications, unreadCount, loading, error, markRead, refresh: fetchData };
}
