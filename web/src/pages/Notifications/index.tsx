import { useMemo, useState } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import { useUiNotifications, UiNotificationType } from '../../contexts/UiNotificationsProvider';
import { cn } from '../../lib/utils';

type ReadFilter = 'all' | 'unread' | 'read';
type TypeFilter = 'all' | UiNotificationType;

const TYPE_COLORS: Record<string, string> = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-sky-500',
};

function formatDate(value: number): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const ghostBtnClass = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed';

export default function NotificationsPage() {
  const { entries, unreadCount, markRead, markAllRead, clearAll, remove } = useUiNotifications();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return entries.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (readFilter === 'read' && !item.read) return false;
      if (readFilter === 'unread' && item.read) return false;

      if (!normalizedSearch) return true;
      return [item.title, item.message, item.details ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [entries, readFilter, search, typeFilter]);

  return (
    <div className="mx-auto max-w-[900px] px-6 pb-10 pt-6">
      <FeatureHeader
        title="Notifications"
        subtitle="Filter and review all your recent notifications"
        variant="chat"
        imageSrc={imageAssets.headers.doctor}
        imageAlt="Notifications"
      />

      {/* ── Toolbar ──────────────────── */}
      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-1">
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 sm:max-w-xs"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          >
            <option value="all">All types</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value as ReadFilter)}
          >
            <option value="all">All status</option>
            <option value="unread">Unread only</option>
            <option value="read">Read only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800">Unread: {unreadCount}</span>
          <button type="button" className={ghostBtnClass} onClick={markAllRead} disabled={entries.length === 0}>
            Mark all read
          </button>
          <button type="button" className={ghostBtnClass} onClick={clearAll} disabled={entries.length === 0}>
            Clear all
          </button>
        </div>
      </div>

      {/* ── List ─────────────────────── */}
      {filteredEntries.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No notifications match your filters.</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3 list-none p-0 m-0">
          {filteredEntries.map((item) => (
            <li
              key={item.id}
              className={cn(
                'rounded-xl border border-l-4 bg-white p-4 shadow-sm transition-colors',
                TYPE_COLORS[item.type] || 'border-l-slate-300',
                item.read ? 'border-slate-200 opacity-75' : 'border-slate-200',
              )}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="m-0 text-sm font-semibold text-slate-900">{item.title}</h3>
                    {!item.read && (
                      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-teal-500" aria-label="Unread notification" />
                    )}
                  </div>
                  <p className="m-0 mt-1 text-sm text-slate-600">{item.message}</p>
                  {item.details && (
                    <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 font-mono border border-slate-200 overflow-x-auto">{item.details}</pre>
                  )}
                  <small className="mt-2 block text-xs text-slate-400">{formatDate(item.createdAt)}</small>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 pt-2 sm:pt-0 sm:pl-3">
                  {!item.read && (
                    <button type="button" className={ghostBtnClass} onClick={() => markRead(item.id)}>
                      Mark read
                    </button>
                  )}
                  <button type="button" className={ghostBtnClass} onClick={() => remove(item.id)}>
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
