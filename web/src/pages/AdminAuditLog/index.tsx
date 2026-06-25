import React, { useState } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { adminApi, AuditLog, ListAuditLogFilters } from '../../services/adminApi';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function AdminAuditLog() {
  const [filters, setFilters] = useState<ListAuditLogFilters>({
    page: 1,
    limit: 20,
    action: '',
  });

  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminAuditLogs', filters],
    queryFn: () => adminApi.listAuditLogs(filters),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, action: searchInput, page: 1 }));
  };

  return (
    <div className="max-w-5xl mx-auto p-10 space-y-12 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold text-sand-900">Audit Logs</h1>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="text-sm font-semibold text-sand-500 uppercase tracking-wider font-sans">
            System Ledger
          </CardTitle>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <select
              id="actionSearch"
              name="actionSearch"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-10 text-sm font-sans w-full sm:w-64 rounded-lg border border-sand-200 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-sand-500"
            >
              <option value="">All Actions</option>
              <option value="user.view">user.view</option>
              <option value="user.approve">user.approve</option>
              <option value="user.suspend">user.suspend</option>
              <option value="user.reject">user.reject</option>
              <option value="user.delete">user.delete</option>
              <option value="user.create">user.create</option>
              <option value="user.force_password_reset">user.force_password_reset</option>
              <option value="staff.review_approve">staff.review_approve</option>
              <option value="staff.review_reject">staff.review_reject</option>
            </select>
            <Button type="submit" variant="outline" className="h-10 border-sand-200 text-sand-700 hover:bg-sand-50">
              Filter
            </Button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-sand-500">Loading audit logs...</div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-500">Failed to load logs.</div>
          ) : !data || data.data.length === 0 ? (
            <div className="py-12 text-center text-sm text-sand-500">No logs found matching your criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-sand-600">
                <thead className="bg-sand-50/50 text-xs uppercase tracking-wider text-sand-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Time</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Actor</th>
                    <th className="px-4 py-3 font-semibold">Target</th>
                    <th className="px-4 py-3 font-semibold">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100 bg-white">
                  {data.data.map((log: AuditLog) => (
                    <tr key={log.id} className="hover:bg-sand-50/30 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-sand-500">
                        {format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-sand-100 px-2 py-1 text-xs font-medium text-sand-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sand-900">{log.actorName || log.actorEmail || 'System'}</div>
                        <div className="text-xs text-sand-500">{log.actorEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-sand-700 capitalize">{log.targetType}</div>
                        {log.targetEmail ? (
                          <div className="font-medium text-[13px] text-sand-900 truncate max-w-[150px]" title={log.targetEmail}>
                            {log.targetEmail}
                          </div>
                        ) : (
                          <div className="font-mono text-[10px] text-sand-400 truncate max-w-[120px]" title={log.targetId ?? ''}>
                            {log.targetId}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-sand-400 flex items-center justify-between">
                        <span>{log.ipAddress || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-sand-100 text-xs text-sand-500 font-sans">
              <span>
                Page {data.pagination.page} of {data.pagination.totalPages} • {data.pagination.total} records
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="h-9 text-xs flex-1 sm:flex-none border-sand-200"
                  disabled={data.pagination.page <= 1}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  className="h-9 text-xs flex-1 sm:flex-none border-sand-200"
                  disabled={data.pagination.page >= data.pagination.totalPages}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
