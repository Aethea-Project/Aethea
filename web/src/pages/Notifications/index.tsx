import { useMemo, useState } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';

import { useNotifications } from '../../hooks/useNotifications';
import { cn } from '../../lib/utils';

type ReadFilter = 'all' | 'unread' | 'read';
type TypeFilter = 'all' | string;

const TYPE_DESCRIPTIONS: Record<string, { label: string; text: string; bg: string; border: string; icon: string }> = {
  success: {
    label: 'Completed',
    text: 'text-sand-900',
    bg: 'bg-sand-50/50',
    border: 'border-l-sand-500',
    icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  error: {
    label: 'Action Required',
    text: 'text-rose-700',
    bg: 'bg-rose-50/40',
    border: 'border-l-rose-500',
    icon: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
  },
  warning: {
    label: 'Reminder',
    text: 'text-amber-800',
    bg: 'bg-amber-50/30',
    border: 'border-l-amber-500',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
  info: {
    label: 'Update',
    text: 'text-sand-900',
    bg: 'bg-sand-50/45',
    border: 'border-l-sand-500',
    icon: 'M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12v-.008z',
  },
  appointment_reminder: {
    label: 'Appointment',
    text: 'text-sand-900',
    bg: 'bg-sand-50/45',
    border: 'border-l-sand-500',
    icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  },
  system: {
    label: 'System Announcement',
    text: 'text-sand-700',
    bg: 'bg-sand-50/50',
    border: 'border-l-sand-400',
    icon: 'M10.34 15.84c-.68-.34-1.34-.84-1.84-1.34M13.66 15.84c.68-.34 1.34-.84 1.84-1.34M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const ghostBtnClass =
  'h-11 rounded-lg border border-sand-300 bg-surface-card px-4 text-xs font-semibold text-sand-700 transition-colors hover:bg-sand-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600';

const primaryBtnClass =
  'h-11 rounded-lg bg-nescafe hover:bg-nescafe-hover px-4 text-xs font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600 shadow-sm';

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead } = useNotifications();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return notifications.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (readFilter === 'read' && !item.isRead) return false;
      if (readFilter === 'unread' && item.isRead) return false;

      if (!normalizedSearch) return true;
      return [item.title, item.body]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [notifications, readFilter, search, typeFilter]);

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length > 0) {
      markRead(unreadIds).catch(console.error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-10 space-y-12 font-sans">
      <FeatureHeader
        title="Notifications"
        subtitle="Review, filter, and manage your clinical updates and alerts"
      />

      {/* ── Toolbar / Filters ── */}
      <div className="mt-8 flex flex-col gap-4 rounded-xl border border-sand-200 bg-surface-card p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-1 sm:items-center">
          <div className="flex flex-col gap-1 sm:flex-1">
            <label htmlFor="search-input" className="text-[10px] font-bold uppercase tracking-wider text-sand-500">Search text</label>
            <input
              id="search-input"
              type="text"
              className="h-12 w-full rounded-lg border border-sand-300 bg-surface px-3.5 text-sm text-sand-900 placeholder:text-sand-400 focus:border-nescafe focus:outline-none focus:ring-2 focus:ring-sand-100 sm:max-w-xs transition-shadow"
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="type-select" className="text-[10px] font-bold uppercase tracking-wider text-sand-500">Type</label>
            <select
              id="type-select"
              className="h-12 rounded-lg border border-sand-300 bg-surface px-3.5 text-sm text-sand-900 focus:border-nescafe focus:outline-none focus:ring-2 focus:ring-sand-100 min-w-[140px] transition-shadow"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            >
              <option value="all">All types</option>
              <option value="success">Completed</option>
              <option value="error">Action Required</option>
              <option value="warning">Reminder</option>
              <option value="info">Update</option>
              <option value="appointment_reminder">Appointment</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="status-select" className="text-[10px] font-bold uppercase tracking-wider text-sand-500">Status</label>
            <select
              id="status-select"
              className="h-12 rounded-lg border border-sand-300 bg-surface px-3.5 text-sm text-sand-900 focus:border-nescafe focus:outline-none focus:ring-2 focus:ring-sand-100 min-w-[130px] transition-shadow"
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as ReadFilter)}
            >
              <option value="all">All status</option>
              <option value="unread">Unread only</option>
              <option value="read">Read only</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-sand-100 sm:border-t-0">
          <div className="flex flex-col items-end sm:items-end">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sand-500 mb-1">Unread count</span>
            <span className="inline-flex h-7 items-center justify-center rounded-full bg-sand-50 border border-sand-200 px-3 text-xs font-semibold text-sand-900">
              {unreadCount} Message{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            type="button"
            className={cn(unreadCount > 0 ? primaryBtnClass : ghostBtnClass, "self-end")}
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            Mark all read
          </button>
        </div>
      </div>

      {/* ── Notification List ── */}
      {filteredEntries.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-sand-200 bg-surface-card p-12 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sand-50 text-sand-400 mb-3 border border-sand-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-sand-800">No notifications found</h3>
          <p className="text-xs text-sand-500 mt-1 max-w-xs">There are no updates matching your active criteria. Try adjusting your search query or filters.</p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-4 list-none p-0 m-0">
          {filteredEntries.map((item) => {
            const desc = TYPE_DESCRIPTIONS[item.type] || TYPE_DESCRIPTIONS.system;
            return (
              <li
                key={item.id}
                className={cn(
                  'rounded-xl border border-l-4 bg-surface-card p-5 shadow-sm transition-all duration-200 flex flex-col sm:flex-row gap-4 sm:items-start justify-between relative',
                  desc.border,
                  item.isRead 
                    ? 'border-sand-200 bg-surface-card/60 opacity-80' 
                    : 'border-sand-200 bg-surface-card ring-1 ring-nescafe/5'
                )}
              >
                {/* Visual Status Indicator Icon */}
                <div className={cn("hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sand-200 bg-surface text-sand-700", desc.text)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d={desc.icon} />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', desc.bg, desc.text)}>
                      {desc.label}
                    </span>
                    {!item.isRead && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sand-900 uppercase tracking-wider bg-sand-50 border border-sand-200 px-1.5 py-0.5 rounded">
                        <span className="h-1.5 w-1.5 rounded-full bg-nescafe" /> New
                      </span>
                    )}
                  </div>
                  
                  <h3 className={cn(
                    'mt-2.5 text-sm font-semibold text-sand-900 leading-tight m-0',
                    !item.isRead && 'font-bold text-sand-950'
                  )}>
                    {item.title}
                  </h3>
                  
                  <p className="m-0 mt-2 text-sm text-sand-600 leading-relaxed break-words">{item.body}</p>
                  
                  <div className="flex items-center gap-2 mt-4 text-[10px] text-sand-400 font-semibold">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-start">
                  {!item.isRead ? (
                    <button
                      type="button"
                      className="h-9 rounded-lg border border-sand-200 bg-surface px-3.5 text-xs font-semibold text-sand-700 transition-colors hover:bg-sand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600"
                      onClick={() => markRead([item.id])}
                    >
                      Mark read
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sand-400 pr-2">Reviewed</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
