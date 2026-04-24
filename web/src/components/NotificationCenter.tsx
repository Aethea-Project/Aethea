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
        className="fixed right-5 top-4 z-[120] inline-flex h-[42px] w-[42px] items-center justify-center rounded-[10px] border border-slate-300 bg-white text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.12)]"
        aria-label="Open notifications"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-[18px] w-[18px]">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[0.72rem] font-bold text-white">
            {Math.min(unreadCount, 99)}
          </span>
        )}
      </button>

      {open && (
        <section
          className="fixed right-5 top-[3.8rem] z-[119] w-[min(460px,calc(100vw-1.5rem))] max-h-[min(70vh,640px)] overflow-hidden rounded-[10px] border border-slate-300 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.2)]"
          aria-label="Notifications"
        >
          <header className="flex items-center justify-between border-b border-slate-200 px-3.5 py-3">
            <h3 className="text-[0.95rem] font-bold text-slate-900">Notifications</h3>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-[0.78rem] text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={markAllRead}
                disabled={!hasEntries}
              >
                Mark all read
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-[0.78rem] text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={clearAll}
                disabled={!hasEntries}
              >
                Clear
              </button>
            </div>
          </header>

          {!hasEntries ? (
            <p className="px-4 py-4 text-sm text-slate-600">No notifications yet.</p>
          ) : (
            <ul className="max-h-[calc(70vh-58px)] overflow-y-auto">
              {recentEntries.map((item) => (
                <li
                  key={item.id}
                  className={`grid grid-cols-[1fr_auto] border-b border-slate-100 ${item.read ? 'bg-white' : 'bg-slate-50'}`}
                >
                  <button
                    type="button"
                    className="w-full px-3 py-3 text-left transition hover:bg-slate-50"
                    onClick={() => markRead(item.id)}
                  >
                    <div className="flex justify-between gap-2">
                      <strong className="text-sm text-slate-900">{item.title}</strong>
                      <span className="text-[0.78rem] text-slate-500">{typeLabel[item.type]}</span>
                    </div>
                    <p className="mt-1 text-[0.86rem] text-slate-800">{item.message}</p>
                    {item.details && (
                      <pre className="mt-0.5 whitespace-pre-wrap rounded-lg bg-slate-100 px-2 py-1.5 text-[0.78rem] text-slate-700">
                        {item.details}
                      </pre>
                    )}
                    <small className="text-[0.74rem] text-slate-500">{formatTime(item.createdAt)}</small>
                  </button>
                  <button
                    type="button"
                    className="w-8 border-l border-slate-100 text-lg text-slate-500 transition hover:text-slate-700"
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

      <div className="pointer-events-none fixed right-[4.3rem] top-4 z-[121] flex w-[min(420px,calc(100vw-5.5rem))] flex-col gap-2.5" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-[10px] border border-slate-300 bg-white p-3 shadow-[0_12px_24px_rgba(15,23,42,0.16)] ${toast.type === 'success' ? 'border-l-4 border-l-emerald-700' : ''} ${toast.type === 'error' ? 'border-l-4 border-l-red-700' : ''} ${toast.type === 'info' ? 'border-l-4 border-l-sky-700' : ''} ${toast.type === 'warning' ? 'border-l-4 border-l-amber-700' : ''}`}
          >
            <div className="text-[0.88rem] font-bold text-slate-900">{toast.title}</div>
            <div className="mt-0.5 text-[0.84rem] text-slate-800">{toast.message}</div>
            {toast.details && (
              <div className="mt-1 rounded-lg bg-slate-50 px-2 py-1 text-[0.78rem] text-slate-700">
                {toast.details}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};
