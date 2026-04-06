import React, { useMemo, useState } from 'react';
import { useUiNotifications, UiNotificationEntry } from '../contexts/UiNotificationsProvider';

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

const typeLabel: Record<UiNotificationEntry['type'], string> = {
  success: 'Success',
  error: 'Error',
  info: 'Info',
  warning: 'Warning',
};

export const NotificationCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { entries, toasts, unreadCount, markRead, markAllRead, clearAll, remove } = useUiNotifications();

  const hasEntries = entries.length > 0;
  const recentEntries = useMemo(() => entries.slice(0, 30), [entries]);

  return (
    <>
      <button
        type="button"
        className="ui-bell-btn"
        aria-label="Open notifications"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="ui-bell-count">{Math.min(unreadCount, 99)}</span>}
      </button>

      {open && (
        <section className="ui-notification-panel" aria-label="Notifications">
          <header className="ui-notification-panel-head">
            <h3>Notifications</h3>
            <div className="ui-notification-actions">
              <button type="button" onClick={markAllRead} disabled={!hasEntries}>Mark all read</button>
              <button type="button" onClick={clearAll} disabled={!hasEntries}>Clear</button>
            </div>
          </header>

          {!hasEntries ? (
            <p className="ui-notification-empty">No notifications yet.</p>
          ) : (
            <ul className="ui-notification-list">
              {recentEntries.map((item) => (
                <li key={item.id} className={`ui-notification-item ${item.type} ${item.read ? 'read' : 'unread'}`}>
                  <button
                    type="button"
                    className="ui-notification-main"
                    onClick={() => markRead(item.id)}
                  >
                    <div className="ui-notification-row">
                      <strong>{item.title}</strong>
                      <span>{typeLabel[item.type]}</span>
                    </div>
                    <p>{item.message}</p>
                    {item.details && <pre>{item.details}</pre>}
                    <small>{formatTime(item.createdAt)}</small>
                  </button>
                  <button
                    type="button"
                    className="ui-notification-remove"
                    aria-label="Remove notification"
                    onClick={() => remove(item.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="ui-toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`ui-toast ${toast.type}`}>
            <div className="ui-toast-title">{toast.title}</div>
            <div className="ui-toast-message">{toast.message}</div>
            {toast.details && <div className="ui-toast-details">{toast.details}</div>}
          </div>
        ))}
      </div>
    </>
  );
};
