import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@core/auth/useAuth';

export type UiNotificationType = 'success' | 'error' | 'info' | 'warning';

export interface UiNotificationEntry {
  id: string;
  type: UiNotificationType;
  title: string;
  message: string;
  details?: string;
  createdAt: number;
  read: boolean;
}

interface NotifyInput {
  type: UiNotificationType;
  title: string;
  message: string;
  details?: string;
}

interface NotifyOptions {
  persist?: boolean;
  toast?: boolean;
  autoCloseMs?: number;
}

interface UiNotificationsContextValue {
  entries: UiNotificationEntry[];
  toasts: UiNotificationEntry[];
  unreadCount: number;
  notify: (input: NotifyInput, options?: NotifyOptions) => string;
  notifySuccess: (title: string, message: string, details?: string, options?: NotifyOptions) => string;
  notifyError: (title: string, message: string, details?: string, options?: NotifyOptions) => string;
  notifyInfo: (title: string, message: string, details?: string, options?: NotifyOptions) => string;
  notifyWarning: (title: string, message: string, details?: string, options?: NotifyOptions) => string;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
}

const STORAGE_KEY = 'aethea_ui_notifications_v1';
const MAX_ENTRIES = 120;
const DEFAULT_TOAST_MS = 4800;

const UiNotificationsContext = createContext<UiNotificationsContextValue | undefined>(undefined);

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safeParse(raw: string | null): UiNotificationEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as UiNotificationEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) =>
      item &&
      typeof item.id === 'string' &&
      typeof item.type === 'string' &&
      typeof item.title === 'string' &&
      typeof item.message === 'string' &&
      typeof item.createdAt === 'number' &&
      typeof item.read === 'boolean'
    );
  } catch {
    return [];
  }
}

export const UiNotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<UiNotificationEntry[]>(() =>
    typeof window === 'undefined' ? [] : safeParse(window.localStorage.getItem(STORAGE_KEY)),
  );
  const [toasts, setToasts] = useState<UiNotificationEntry[]>([]);
  const timeoutRef = useRef<Map<string, number>>(new Map());
  const previousUserIdRef = useRef<string | null>(user?.id ?? null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    const timeouts = timeoutRef.current;
    return () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeouts.clear();
    };
  }, []);

  const clearAll = useCallback(() => {
    setEntries([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const previousUserId = previousUserIdRef.current;

    if (previousUserId && !currentUserId) {
      clearAll();
    } else if (previousUserId && currentUserId && previousUserId !== currentUserId) {
      clearAll();
    }

    previousUserIdRef.current = currentUserId;
  }, [user?.id, clearAll]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
    const timeoutId = timeoutRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutRef.current.delete(id);
    }
  }, []);

  const notify = useCallback((input: NotifyInput, options?: NotifyOptions): string => {
    const id = makeId();
    const entry: UiNotificationEntry = {
      id,
      type: input.type,
      title: input.title,
      message: input.message,
      details: input.details,
      createdAt: Date.now(),
      read: false,
    };

    const shouldPersist = options?.persist !== false;
    const shouldToast = options?.toast !== false;

    if (shouldPersist) {
      setEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
    }

    if (shouldToast) {
      setToasts((prev) => [entry, ...prev].slice(0, 4));
      const timeoutId = window.setTimeout(() => removeToast(id), options?.autoCloseMs ?? DEFAULT_TOAST_MS);
      timeoutRef.current.set(id, timeoutId);
    }

    return id;
  }, [removeToast]);

  const markRead = useCallback((id: string) => {
    setEntries((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  }, []);

  const markAllRead = useCallback(() => {
    setEntries((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
    removeToast(id);
  }, [removeToast]);

  useEffect(() => {
    const handleApiError = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string; details?: string; title?: string }>;
      const detail = customEvent.detail ?? {};
      notify(
        {
          type: 'error',
          title: detail.title ?? 'Server Error',
          message: detail.message ?? 'Something went wrong while calling the server.',
          details: detail.details,
        },
        { persist: true, toast: true },
      );
    };

    window.addEventListener('aethea-api-error', handleApiError as EventListener);
    return () => window.removeEventListener('aethea-api-error', handleApiError as EventListener);
  }, [notify]);

  const value = useMemo<UiNotificationsContextValue>(() => ({
    entries,
    toasts,
    unreadCount: entries.filter((item) => !item.read).length,
    notify,
    notifySuccess: (title, message, details, options) => notify({ type: 'success', title, message, details }, options),
    notifyError: (title, message, details, options) => notify({ type: 'error', title, message, details }, options),
    notifyInfo: (title, message, details, options) => notify({ type: 'info', title, message, details }, options),
    notifyWarning: (title, message, details, options) => notify({ type: 'warning', title, message, details }, options),
    markRead,
    markAllRead,
    remove,
    clearAll,
  }), [clearAll, entries, markAllRead, markRead, notify, remove, toasts]);

  return (
    <UiNotificationsContext.Provider value={value}>
      {children}
    </UiNotificationsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useUiNotifications(): UiNotificationsContextValue {
  const context = useContext(UiNotificationsContext);
  if (!context) {
    throw new Error('useUiNotifications must be used within UiNotificationsProvider');
  }
  return context;
}
