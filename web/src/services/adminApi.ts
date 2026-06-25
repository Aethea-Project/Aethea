import { authFetch } from '../lib/apiClient';
import type { AccountType, AccountStatus } from '@core/auth/auth-types';

export type { AccountType, AccountStatus };
export type StaffAccountType = 'doctor' | 'pharmacist';

export interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  accountType: AccountType;
  accountStatus: AccountStatus;
  mustChangePassword: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  suspendedReason: string | null;
  createdAt: string;
  updatedAt: string;
  isOnline?: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ListUsersFilters {
  page: number;
  limit: number;
  accountType?: AccountType;
  accountStatus?: AccountStatus;
  search?: string;
}

interface CreateStaffPayload {
  email: string;
  accountType: StaffAccountType;
  firstName: string;
  lastName: string;
}

export interface AdminUserDetail {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  accountType: AccountType;
  accountStatus: AccountStatus;
  mustChangePassword: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  lastSignInAt: string | null;
  rejectedReason: string | null;
  suspendedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPasswordResetLinkResult {
  id: string;
  email: string;
}

export interface AdminProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface UpdateStatusPayload {
  accountStatus: AccountStatus;
  reason?: string;
}

const toQueryString = (filters: ListUsersFilters): string => {
  const params = new URLSearchParams();
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));

  if (filters.accountType) params.set('accountType', filters.accountType);
  if (filters.accountStatus) params.set('accountStatus', filters.accountStatus);
  if (filters.search && filters.search.trim()) params.set('search', filters.search.trim());

  return params.toString();
};

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  targetEmail: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
}

export interface AdminDashboardMetrics {
  patients_count: number;
  doctors_count: number;
  pharmacists_count: number;
  admins_count: number;
  pending_verifications_count: number;
  active_users_count: number;
}

export interface AdminDashboardData {
  metrics: AdminDashboardMetrics;
  recentAuditLogs: AuditLog[];
  systemHealth: string;
}

export interface ListAuditLogFilters {
  page: number;
  limit: number;
  actorId?: string;
  action?: string;
  targetId?: string;
  from?: string;
  to?: string;
}

export const adminApi = {
  async getDashboardData(): Promise<AdminDashboardData> {
    const res = await authFetch<{ data: AdminDashboardData }>('/v1/admin/dashboard');
    return res.data;
  },

  async listAuditLogs(filters: ListAuditLogFilters): Promise<PaginatedResponse<AuditLog>> {
    const params = new URLSearchParams();
    params.set('page', String(filters.page));
    params.set('limit', String(filters.limit));

    if (filters.actorId) params.set('actorId', filters.actorId);
    if (filters.action) params.set('action', filters.action);
    if (filters.targetId) params.set('targetId', filters.targetId);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);

    const qs = params.toString();
    return authFetch<PaginatedResponse<AuditLog>>(`/v1/admin/audit-log?${qs}`);
  },

  async listUsers(filters: ListUsersFilters): Promise<PaginatedResponse<AdminUser>> {
    const qs = toQueryString(filters);
    return authFetch<PaginatedResponse<AdminUser>>(`/v1/admin/users?${qs}`);
  },

  async createStaffUser(payload: CreateStaffPayload): Promise<AdminUser> {
    const res = await authFetch<{ data: AdminUser }>('/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateUserStatus(userId: string, payload: UpdateStatusPayload): Promise<AdminUser> {
    const res = await authFetch<{ data: AdminUser }>(`/v1/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async getUserById(userId: string): Promise<AdminUserDetail> {
    const res = await authFetch<{ data: AdminUserDetail }>(`/v1/admin/users/${userId}`);
    return res.data;
  },

  async updateUserProfile(userId: string, payload: AdminProfileUpdatePayload): Promise<AdminUserDetail> {
    const res = await authFetch<{ data: AdminUserDetail }>(`/v1/admin/users/${userId}/profile`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async sendUserPasswordResetLink(userId: string): Promise<AdminPasswordResetLinkResult> {
    const res = await authFetch<{ data: AdminPasswordResetLinkResult }>(`/v1/admin/users/${userId}/password-reset-link`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return res.data;
  },

  async updateUserAccountType(userId: string, accountType: AccountType): Promise<AdminUser> {
    const res = await authFetch<{ data: AdminUser }>(`/v1/admin/users/${userId}/account-type`, {
      method: 'PATCH',
      body: JSON.stringify({ accountType }),
    });
    return res.data;
  },

  async deleteUser(userId: string): Promise<void> {
    await authFetch<unknown>(`/v1/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },
};

export type { CreateStaffPayload, ListUsersFilters, UpdateStatusPayload, PaginatedResponse };
