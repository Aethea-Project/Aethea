import React, { createContext, useContext, useCallback, useEffect, useState, useRef } from 'react';
import { medicalApi, Notification } from '../services/medicalApi';
import { useAuth } from '@core/auth/useAuth';
import { API_BASE } from '../lib/apiClient';

export interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markRead: (ids: string[]) => Promise<void>;
  refresh: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const afterFirstPaint = (callback: () => void): (() => void) => {
  let cancelled = false;
  const frame = window.requestAnimationFrame(() => {
    const timer = window.setTimeout(() => {
      if (!cancelled) callback();
    }, 0);
    if (cancelled) {
      window.clearTimeout(timer);
    }
  });

  return () => {
    cancelled = true;
    window.cancelAnimationFrame(frame);
  };
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to track the last fetched token or session to avoid double fetch cycles
  const lastSessionToken = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const [notifResult, count] = await Promise.all([
        medicalApi.fetchNotifications(),
        medicalApi.fetchUnreadCount(),
      ]);
      setNotifications(notifResult.notifications || []);
      setUnreadCount(count);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    // If not authenticated or loading, reset and return
    if (authLoading) return;
    if (!session) {
      setNotifications([]);
      setUnreadCount(0);
      lastSessionToken.current = null;
      return;
    }

    const token = session.access_token;
    if (lastSessionToken.current === token) return;
    lastSessionToken.current = token;

    let eventSource: EventSource | null = null;
    const cancelStartup = afterFirstPaint(() => {
      fetchData();

      // Setup single Server-Sent Events stream for real-time notifications
      const sseUrl = `${API_BASE}/notifications/stream?token=${encodeURIComponent(token)}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ping') return; // Ignore ping
          
          if (data && data.id && data.type) {
            setNotifications((prev) => {
              // Prevent duplicate notifications in UI state if SSE and REST call overlap
              if (prev.some((n) => n.id === data.id)) return prev;
              return [data as Notification, ...prev];
            });
            setUnreadCount((prev) => prev + 1);
          }
        } catch (err) {
          console.error('Failed to parse SSE message', err);
        }
      };

      eventSource.onerror = () => {
        console.warn('SSE connection error. Retrying...');
      };
    });

    return () => {
      cancelStartup();
      eventSource?.close();
    };
  }, [session, authLoading, fetchData]);

  const markRead = useCallback(async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return;
    await medicalApi.markNotificationsRead(ids);
    setNotifications((prev) => {
      const actualUnreadIds = prev.filter((n) => ids.includes(n.id) && !n.isRead).map((n) => n.id);
      if (actualUnreadIds.length > 0) {
        setUnreadCount((prevCount) => Math.max(0, prevCount - actualUnreadIds.length));
      }
      return prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n));
    });
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        markRead,
        refresh: fetchData,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotificationsContext = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  }
  return context;
};
