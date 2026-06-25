import React, { createContext, useCallback, useContext, useMemo } from 'react';
import toast from 'react-hot-toast';

export type UiNotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotifyOptions {
  autoCloseMs?: number;
}

interface UiNotificationsContextValue {
  notifySuccess: (title: string, message?: string, options?: NotifyOptions) => string;
  notifyError: (title: string, message?: string, options?: NotifyOptions) => string;
  notifyInfo: (title: string, message?: string, options?: NotifyOptions) => string;
  notifyWarning: (title: string, message?: string, options?: NotifyOptions) => string;
}

const UiNotificationsContext = createContext<UiNotificationsContextValue | undefined>(undefined);

export const UiNotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const notifySuccess = useCallback((title: string, message?: string, options?: NotifyOptions) => {
    return toast.success(message ? `${title}: ${message}` : title, { duration: options?.autoCloseMs });
  }, []);

  const notifyError = useCallback((title: string, message?: string, options?: NotifyOptions) => {
    return toast.error(message ? `${title}: ${message}` : title, { duration: options?.autoCloseMs });
  }, []);

  const notifyInfo = useCallback((title: string, message?: string, options?: NotifyOptions) => {
    return toast(message ? `${title}: ${message}` : title, { duration: options?.autoCloseMs });
  }, []);

  const notifyWarning = useCallback((title: string, message?: string, options?: NotifyOptions) => {
    return toast(message ? `${title}: ${message}` : title, {
      duration: options?.autoCloseMs,
      icon: '⚠️',
    });
  }, []);

  const value = useMemo<UiNotificationsContextValue>(() => ({
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,
  }), [notifyError, notifyInfo, notifySuccess, notifyWarning]);

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
