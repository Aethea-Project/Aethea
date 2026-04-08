import { authFetch } from '../lib/apiClient';
import type { AccountType, AccountStatus } from '@core/auth/auth-types';

export type { AccountType, AccountStatus };

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
  temporaryPassword: string;
  accountType: AccountType;
  firstName: string;
  lastName: string;
}

export interface AdminUserDetail {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  gender: 'male' | 'female' | null;
  phone: string | null;
  dateOfBirth: string | null;
  bloodType: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  heightCm: number | null;
  weightKg: number | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
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

export interface AdminResetTemporaryPasswordResult {
  id: string;
  mustChangePassword: boolean;
  revokedSessions: number;
}

export interface AdminPasswordResetLinkResult {
  id: string;
  email: string;
}

export interface AdminProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  gender?: 'male' | 'female';
  phone?: string;
  dateOfBirth?: string;
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies?: string;
  chronicConditions?: string;
  heightCm?: number;
  weightKg?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
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

export const adminApi = {
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

  async resetUserTemporaryPassword(userId: string, temporaryPassword: string): Promise<AdminResetTemporaryPasswordResult> {
    const res = await authFetch<{ data: AdminResetTemporaryPasswordResult }>(`/v1/admin/users/${userId}/temporary-password`, {
      method: 'PATCH',
      body: JSON.stringify({ temporaryPassword }),
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
