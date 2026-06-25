import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminUser, AccountStatus, AccountType, ListUsersFilters } from '../../services/adminApi';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Label } from '../../components/ui/Label';
import { Textarea } from '../../components/ui/Textarea';
import { cn } from '../../lib/utils';

interface UserListProps {
  users: AdminUser[];
  loading: boolean;
  page: number;
  total: number;
  totalPages: number;
  accountType?: AccountType;
  accountStatus?: AccountStatus;
  search?: string;
  submitting: boolean;
  onFetchUsers: (overrides?: Partial<ListUsersFilters>) => Promise<void>;
  onStatusUpdate: (userId: string, nextStatus: AccountStatus, reason?: string) => Promise<void>;
}

const accountStatuses: AccountStatus[] = ['pending', 'active', 'suspended', 'rejected'];
const accountTypes: AccountType[] = ['patient', 'doctor', 'pharmacist', 'admin'];

export const UserList: React.FC<UserListProps> = React.memo(({
  users,
  loading,
  page,
  total,
  totalPages,
  accountType,
  accountStatus,
  search,
  submitting,
  onFetchUsers,
  onStatusUpdate,
}) => {
  const [statusReasons, setStatusReasons] = useState<Record<string, string>>({});

  const handleReasonChange = (userId: string, value: string) => {
    setStatusReasons((prev) => ({ ...prev, [userId]: value }));
  };

  const handleStatusClick = async (userId: string, nextStatus: AccountStatus) => {
    const reason = statusReasons[userId]?.trim();
    await onStatusUpdate(userId, nextStatus, reason);
    // Clear the reason upon success
    setStatusReasons((prev) => ({ ...prev, [userId]: '' }));
  };

  const getStatusChipStyles = (status: AccountStatus) => {
    switch (status) {
      case 'active':
        return 'bg-sand-100 text-sand-800 border-sand-200/60';
      case 'pending':
        return 'bg-sand-50 text-sand-900 border-sand-200/60';
      case 'suspended':
        return 'bg-sand-200 text-sand-900 border-sand-300/60';
      case 'rejected':
        return 'bg-surface-card text-sand-500 border-sand-200/60';
      default:
        return 'bg-sand-50 text-sand-800 border-sand-200';
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <CardTitle className="text-sm font-semibold text-sand-500 uppercase tracking-wider font-sans">
          All Accounts
        </CardTitle>
        
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Input
            id="searchUser"
            name="search"
            autoComplete="off"
            placeholder="Search by name or email"
            value={search ?? ''}
            onChange={(e) => void onFetchUsers({ search: e.target.value, page: 1 })}
            className="h-10 text-sm font-sans w-full sm:w-56"
          />
          <Select
            id="accountTypeFilter"
            name="accountType"
            value={accountType ?? ''}
            onChange={(e) =>
              void onFetchUsers({
                accountType: (e.target.value || undefined) as AccountType | undefined,
                page: 1,
              })
            }
            className="h-10 text-sm font-sans w-full sm:w-40"
          >
            <option value="">All types</option>
            {accountTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </Select>
          <Select
            id="accountStatusFilter"
            name="accountStatus"
            value={accountStatus ?? ''}
            onChange={(e) =>
              void onFetchUsers({
                accountStatus: (e.target.value || undefined) as AccountStatus | undefined,
                page: 1,
              })
            }
            className="h-10 text-sm font-sans w-full sm:w-40"
          >
            <option value="">All statuses</option>
            {accountStatuses.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-sm text-sand-500">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-sm text-sand-500">
            No accounts found matching the criteria.
          </div>
        ) : (
          <>
            {/* List Grid */}
            <div className="grid grid-cols-1 gap-4">
              {users.map((user) => {
                const currentReason = statusReasons[user.id] ?? '';
                const isSuspendOrRejectDisabled = (status: AccountStatus) => {
                  if (status === 'active') return false; // approval doesn't require reason
                  return !currentReason.trim(); // suspend/reject requires reason
                };

                return (
                  <div
                    key={user.id}
                    className="border border-sand-200/80 rounded-lg p-5 bg-surface transition-shadow hover:shadow-sm space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Name */}
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">
                          Name
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-sand-900">
                            {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                          </span>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">
                          Email
                        </span>
                        <span className="text-sm text-sand-600 truncate block">
                          {user.email || '—'}
                        </span>
                      </div>

                      {/* Type */}
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">
                          Type
                        </span>
                        <span className="text-sm text-sand-600 capitalize block">
                          {user.accountType}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">
                          Status
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                              getStatusChipStyles(user.accountStatus)
                            )}
                          >
                            {user.accountStatus}
                          </span>
                          {user.isOnline && (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-lg border border-green-200/60 bg-green-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-green-700"
                              title="Active in the last 15 minutes"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
                              Online
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Textarea for suspend/reject */}
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor={`reason-${user.id}`} className="text-xs text-sand-500 font-sans">
                        Reason (Required to Suspend/Reject)
                      </Label>
                      <Textarea
                        id={`reason-${user.id}`}
                        name={`reason-${user.id}`}
                        autoComplete="off"
                        value={currentReason}
                        onChange={(e) => handleReasonChange(user.id, e.target.value)}
                        placeholder="Provide a brief explanation for suspending or rejecting this account"
                        disabled={submitting}
                        className="min-h-[70px] text-xs py-2 px-3 border-sand-200 focus:border-sand-300"
                      />
                    </div>

                    {/* Actions Row */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-sand-100">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleStatusClick(user.id, 'active')}
                        disabled={submitting || user.accountStatus === 'active'}
                        className="h-9 px-3 text-xs border-sand-200 text-sand-700 hover:bg-sand-50 hover:text-sand-900 disabled:opacity-50"
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleStatusClick(user.id, 'suspended')}
                        disabled={
                          submitting || 
                          user.accountStatus === 'suspended' || 
                          isSuspendOrRejectDisabled('suspended')
                        }
                        className="h-9 px-3 text-xs border-sand-200 text-sand-700 hover:bg-sand-50 hover:text-sand-900 disabled:opacity-50"
                      >
                        Suspend
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleStatusClick(user.id, 'rejected')}
                        disabled={
                          submitting || 
                          user.accountStatus === 'rejected' || 
                          isSuspendOrRejectDisabled('rejected')
                        }
                        className="h-9 px-3 text-xs border-sand-200 text-sand-900 hover:bg-sand-50 disabled:opacity-50"
                      >
                        Reject
                      </Button>
                      <Link
                        className="ml-auto inline-flex h-9 items-center justify-center rounded-lg border border-sand-200 bg-surface-card px-4 text-xs font-semibold text-sand-700 hover:bg-sand-50 transition-colors"
                        to={`/admin/users/${user.id}`}
                      >
                        Open Profile
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-sand-200/80 text-xs text-sand-500 font-sans">
              <span>
                Page {page} of {Math.max(totalPages, 1)} • {total} users
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="h-9 text-xs flex-1 sm:flex-none"
                  disabled={page <= 1 || submitting}
                  onClick={() => void onFetchUsers({ page: page - 1 })}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  className="h-9 text-xs flex-1 sm:flex-none"
                  disabled={page >= totalPages || totalPages === 0 || submitting}
                  onClick={() => void onFetchUsers({ page: page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});
