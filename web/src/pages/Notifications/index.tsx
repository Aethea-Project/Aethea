import { useMemo, useState } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import { useUiNotifications, UiNotificationType } from '../../contexts/UiNotificationsProvider';
import './styles.css';

type ReadFilter = 'all' | 'unread' | 'read';
type TypeFilter = 'all' | UiNotificationType;

function formatDate(value: number): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

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
    <div className="notifications-page">
      <FeatureHeader
        title="Notifications"
        subtitle="Filter and review all your recent notifications"
        variant="chat"
        imageSrc={imageAssets.headers.doctor}
        imageAlt="Notifications"
      />

      <div className="notifications-toolbar">
        <div className="notifications-inputs">
          <input
            type="text"
            className="notifications-search"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="notifications-select"
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
            className="notifications-select"
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value as ReadFilter)}
          >
            <option value="all">All status</option>
            <option value="unread">Unread only</option>
            <option value="read">Read only</option>
          </select>
        </div>

        <div className="notifications-actions">
          <span className="notifications-unread">Unread: {unreadCount}</span>
          <button type="button" className="btn btn-ghost" onClick={markAllRead} disabled={entries.length === 0}>
            Mark all read
          </button>
          <button type="button" className="btn btn-ghost" onClick={clearAll} disabled={entries.length === 0}>
            Clear all
          </button>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <p className="notifications-empty">No notifications match your filters.</p>
      ) : (
        <ul className="notifications-list">
          {filteredEntries.map((item) => (
            <li key={item.id} className={`notifications-item ${item.type} ${item.read ? 'read' : 'unread'}`}>
              <div className="notifications-main">
                <div className="notifications-title-row">
                  <h3>{item.title}</h3>
                  {!item.read && <span className="notifications-dot" aria-label="Unread notification" />}
                </div>
                <p>{item.message}</p>
                {item.details && <pre>{item.details}</pre>}
                <small>{formatDate(item.createdAt)}</small>
              </div>

              <div className="notifications-item-actions">
                {!item.read && (
                  <button type="button" className="btn btn-ghost" onClick={() => markRead(item.id)}>
                    Mark read
                  </button>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => remove(item.id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
