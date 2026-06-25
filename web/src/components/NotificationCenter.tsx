import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

const formatTime = (timestamp: string | Date): string => {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

const typeColors: Record<string, { text: string; bg: string; dot: string }> = {
  success: { text: 'text-sand-900', bg: 'bg-sand-50/50', dot: 'bg-sand-500' },
  error: { text: 'text-rose-700', bg: 'bg-rose-50/40', dot: 'bg-rose-500' },
  warning: { text: 'text-olive-800', bg: 'bg-olive-50/40', dot: 'bg-olive-500' },
  info: { text: 'text-sand-900', bg: 'bg-sand-50/50', dot: 'bg-sand-500' },
  appointment_reminder: { text: 'text-sand-900', bg: 'bg-sand-50/50', dot: 'bg-sand-500' },
  system: { text: 'text-sand-700', bg: 'bg-sand-50/60', dot: 'bg-sand-400' },
};

const typeLabel: Record<string, string> = {
  success: 'Completed',
  error: 'Action Required',
  info: 'Update',
  warning: 'Reminder',
  appointment_reminder: 'Appointment',
  system: 'System Announcement',
};

export const NotificationToggle: React.FC<{ isActive: boolean; onClick: () => void }> = ({ isActive, onClick }) => {
  const { unreadCount } = useNotifications();
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <button
      type="button"
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sand-500 border shadow-sm ${
        isActive
          ? 'bg-sand-200 border-sand-300 text-sand-900'
          : 'bg-sand-50 border-sand-200/50 text-sand-600 hover:bg-sand-100 hover:text-sand-800'
      }`}
      aria-label="Open notifications"
      aria-expanded={isActive}
      onClick={onClick}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-5 w-5"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-olive-600 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-organic-linen">
          {badgeLabel}
        </span>
      )}
    </button>
  );
};

export const NotificationContent: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  const { notifications, unreadCount, markRead } = useNotifications();
  const navigate = useNavigate();

  const unreadEntries = useMemo(() => notifications.filter((item) => !item.isRead), [notifications]);
  const previewEntries = useMemo(() => unreadEntries.slice(0, 2), [unreadEntries]);
  const extraUnreadCount = Math.max(0, unreadEntries.length - previewEntries.length);
  const hasUnreadEntries = previewEntries.length > 0;

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length > 0) {
      markRead(unreadIds).catch(console.error);
    }
  };

  return (
    <section className="w-full h-full flex flex-col">
      <header className="flex items-center justify-between border-b border-sand-100/60 px-5 py-3.5 bg-surface-card/90 backdrop-blur-md relative z-10 shadow-sm">
        <div>
          <h3 className="text-[13px] font-bold text-sand-900 font-sans tracking-tight">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-[10px] text-olive-600 font-semibold mt-0.5 animate-pulse">
              {unreadCount} unread message{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="text-[11px] font-bold text-sand-900 hover:text-sand-900 disabled:text-sand-400 disabled:cursor-not-allowed transition-colors bg-sand-50/50 hover:bg-sand-100/50 px-2 py-1 rounded-md"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            Mark all read
          </button>
        </div>
      </header>

      {!hasUnreadEntries ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center bg-sand-50/30">
          <div className="relative flex h-12 w-12 items-center justify-center mb-4">
            <div className="absolute inset-0 bg-sand-100/50 rounded-full blur-xl animate-pulse" />
            <div className="relative h-11 w-11 rounded-full bg-gradient-to-tr from-surface-card to-sand-50 border border-sand-100 flex items-center justify-center shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-sand-400">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
          </div>
          <p className="text-[14px] font-bold text-sand-900">All caught up</p>
          <p className="text-[12px] font-medium text-sand-500 mt-1.5 max-w-[210px] leading-relaxed">
            No unread notifications right now.
          </p>
        </div>
      ) : (
        <div className="flex-1 bg-sand-50/30 px-3 py-3">
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
          {previewEntries.map((item) => {
            const style = typeColors[item.type] || typeColors.system;
            return (
              <li
                key={item.id}
                className={`transition-all duration-200 rounded-2xl border ${
                  item.isRead 
                    ? 'bg-surface-card border-sand-100/50 hover:border-sand-200 shadow-sm' 
                    : 'bg-gradient-to-r from-sand-50/50 to-white border-sand-100 shadow-[0_4px_12px_rgba(42,99,88,0.06)]'
                }`}
              >
                <button
                  type="button"
                  className="w-full px-4 py-3.5 text-left flex gap-3.5 relative rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive-600 focus-visible:z-10"
                  onClick={() => markRead([item.id])}
                >
                  <div className="flex flex-col items-center justify-start pt-1 shrink-0">
                    <div className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ring-2 ring-white ${style.dot}`} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className={`text-[10px] font-bold tracking-wider uppercase ${style.text}`}>
                        {typeLabel[item.type] || item.type}
                      </span>
                      <span className="text-[10px] text-sand-400 font-semibold shrink-0">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>
                    <h4 className={`text-[12.5px] font-bold mt-1 leading-tight ${item.isRead ? 'text-sand-700' : 'text-sand-900'}`}>
                      {item.title}
                    </h4>
                    <p className={`text-[11.5px] mt-1.5 leading-relaxed break-words ${item.isRead ? 'text-sand-500 font-medium' : 'text-sand-600 font-semibold'}`}>
                      {item.body}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
          </ul>
          {extraUnreadCount > 0 && (
            <p className="mt-2 text-center text-[11px] font-bold text-sand-900">
              +{extraUnreadCount} more unread
            </p>
          )}
        </div>
      )}
      
      <footer className="border-t border-sand-100/60 bg-sand-50/50 text-center hover:bg-sand-100/50 transition-colors">
        <a
          href="/notifications"
          onClick={(e) => {
            e.preventDefault();
            onDismiss();
            navigate('/notifications');
          }}
          className="block py-3 text-[11px] font-bold text-sand-900 hover:text-sand-900 transition-colors"
        >
          View all notifications
        </a>
      </footer>
    </section>
  );
};
