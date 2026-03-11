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
  accountType: 'doctor' | 'pharmacist';
  firstName: string;
  lastName: string;
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
};

export type { CreateStaffPayload, ListUsersFilters, UpdateStatusPayload, PaginatedResponse };
