import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, AdminDashboardData } from '../../services/adminApi';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery<AdminDashboardData>({
    queryKey: ['adminDashboard'],
    queryFn: () => adminApi.getDashboardData(),
  });

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sand-200 border-t-nescafe" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Failed to load dashboard metrics.
      </div>
    );
  }

  const { metrics, recentAuditLogs } = data;
  const totalUsers = metrics.patients_count + metrics.doctors_count + metrics.pharmacists_count + metrics.admins_count;

  return (
    <div className="max-w-5xl mx-auto p-10 space-y-12 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold text-sand-900">Platform Overview</h1>
        {data.systemHealth === 'healthy' && (
          <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            System Healthy
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Users */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-sand-500">Total Users</h3>
            <div className="mt-2 text-4xl font-light text-sand-900">{totalUsers}</div>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-sand-500">Active (15m)</h3>
            <div className="mt-2 text-4xl font-light text-sand-900">{metrics.active_users_count}</div>
          </CardContent>
        </Card>

        {/* Breakdown */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-sand-500">Patients</h3>
            <div className="mt-2 text-4xl font-light text-sand-900">{metrics.patients_count}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-sand-500">Medical Staff</h3>
            <div className="mt-2 text-4xl font-light text-sand-900">
              {metrics.doctors_count + metrics.pharmacists_count}
            </div>
            <div className="mt-1 text-xs text-sand-400">
              {metrics.doctors_count} doctors, {metrics.pharmacists_count} pharmacists
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-sand-200 bg-sand-50/30">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-sand-900">Pending Staff</h3>
            <div className="mt-2 text-4xl font-light text-sand-900">{metrics.pending_verifications_count}</div>
            {metrics.pending_verifications_count > 0 && (
              <Link to="/admin/users" className="mt-2 inline-block text-xs font-semibold text-amber-600 hover:text-sand-900 hover:underline">
                Review Verifications &rarr;
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm mt-8">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-sand-100">
          <CardTitle className="text-base font-semibold text-sand-800">Recent Audit Logs</CardTitle>
          <Link to="/admin/audit-logs" className="text-xs font-medium text-amber-600 hover:text-sand-900">
            View All
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentAuditLogs.length === 0 ? (
            <div className="py-8 text-center text-sm text-sand-500">No recent activity.</div>
          ) : (
            <div className="divide-y divide-sand-100">
              {recentAuditLogs.map((log) => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-sand-50/50 transition-colors">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-sand-900">
                      {log.action}
                    </div>
                    <div className="text-xs text-sand-500">
                      by <span className="font-semibold">{log.actorName || log.actorEmail}</span> on {log.targetType} <span className="font-mono text-[10px] text-sand-400">{log.targetId?.slice(0, 8)}...</span>
                    </div>
                  </div>
                  <div className="text-xs text-sand-400 sm:text-right mt-2 sm:mt-0">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
