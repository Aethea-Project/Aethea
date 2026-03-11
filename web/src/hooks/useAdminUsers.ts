import { useCallback, useEffect, useRef, useState } from 'react';
import {
  adminApi,
  AccountStatus,
  AccountType,
  AdminUser,
  CreateStaffPayload,
  ListUsersFilters,
  UpdateStatusPayload,
} from '../services/adminApi';

interface Filters {
  page: number;
  limit: number;
  accountType?: AccountType;
  accountStatus?: AccountStatus;
  search?: string;
}

interface DataState {
  users: AdminUser[];
  loading: boolean;
  error: string | null;
  total: number;
  totalPages: number;
}

const defaultFilters: Filters = { page: 1, limit: 20 };

export const useAdminUsers = () => {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [data, setData] = useState<DataState>({
    users: [],
    loading: true,
    error: null,
    total: 0,
    totalPages: 0,
  });

  // Keep a ref so mutation callbacks always read the latest filters without
  // needing them in their dependency array (prevents stale-closure loops).
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchUsers = useCallback(async (overrides?: Partial<ListUsersFilters>) => {
    const merged: ListUsersFilters = { ...filtersRef.current, ...overrides };

    // Persist filter changes so the UI reflects them immediately.
    if (overrides) {
      setFilters((prev) => ({ ...prev, ...overrides }));
    }

    setData((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await adminApi.listUsers(merged);
      setData({
        users: response.data,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
        loading: false,
        error: null,
      });
      // Sync page/limit back from server response.
      setFilters((prev) => ({
        ...prev,
        page: response.pagination.page,
        limit: response.pagination.limit,
      }));
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load admin users',
      }));
    }
  }, []);

  // Initial load + re-fetch whenever filters change.
  useEffect(() => {
    void fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.limit, filters.accountType, filters.accountStatus, filters.search]);

  const createStaffUser = useCallback(async (payload: CreateStaffPayload) => {
    await adminApi.createStaffUser(payload);
    await fetchUsers({ page: 1 });
  }, [fetchUsers]);

  const updateUserStatus = useCallback(async (userId: string, payload: UpdateStatusPayload) => {
    await adminApi.updateUserStatus(userId, payload);
    await fetchUsers();
  }, [fetchUsers]);

  return {
    ...data,
    ...filters,
    fetchUsers,
    createStaffUser,
    updateUserStatus,
  };
};
