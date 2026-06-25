/**
 * useDoctors - Use-case hook for doctor discovery and schedule browsing
 *
 * Architecture layer: Pages -> [this hook] -> medicalApi -> apiClient
 */

import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  medicalApi,
  DoctorSchedule,
  ScheduleSlotView,
  MarketplaceSchedulePost,
  MarketplaceScheduleQuery,
  WeeklyTemplate,
  WeeklyTemplateInput,
  ScheduleException,
  ScheduleExceptionInput,
  GenerateSchedulesResult,
} from '../services/medicalApi';
import { useAuth } from '@core/auth/useAuth';

const EMPTY_ARRAY: any[] = [];

/* ─── Doctor schedule hook ─── */

export interface UseDoctorSchedulesResult {
  schedules: DoctorSchedule[];
  total: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDoctorSchedules(doctorId: string): UseDoctorSchedulesResult {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['doctorSchedules', doctorId],
    queryFn: () => medicalApi.fetchDoctorSchedules(doctorId),
    enabled: !!session && !!doctorId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    schedules: data?.schedules || EMPTY_ARRAY,
    total: data?.total || 0,
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: () => { queryClient.invalidateQueries({ queryKey: ['doctorSchedules', doctorId] }); refetch(); },
  };
}

/* ─── Doctor's own schedule-slots view hook ─── */

export interface UseScheduleSlotsResult {
  slotView: ScheduleSlotView | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useScheduleSlots(scheduleId: string): UseScheduleSlotsResult {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['scheduleSlots', scheduleId],
    queryFn: () => medicalApi.fetchScheduleSlots(scheduleId),
    enabled: !!session && !!scheduleId,
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  return {
    slotView: data || null,
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: () => { queryClient.invalidateQueries({ queryKey: ['scheduleSlots', scheduleId] }); refetch(); },
  };
}

/* ─── Marketplace schedule posts hook ─── */

export interface UseMarketplaceSchedulesResult {
  posts: MarketplaceSchedulePost[];
  total: number;
  loading: boolean;
  error: string | null;
  search: (params: MarketplaceScheduleQuery) => Promise<void>;
}

export function useMarketplaceSchedules(initialParams?: MarketplaceScheduleQuery, enabled = true): UseMarketplaceSchedulesResult {
  const { session } = useAuth();

  // We keep a separate state for dynamic searching if needed, 
  // but react-query is best when params are in the queryKey.
  // To match the existing interface without breaking callers, we'll keep the manual search trigger structure
  // but back it with useMutation or just a manual fetch.
  // Actually, since this is heavily dynamic, we can use useQuery with the params.
  // But the interface demands a `search(params)` function.
  // We'll simulate it by putting params in state and passing to useQuery.
  
  const [params, setParams] = useState<MarketplaceScheduleQuery | undefined>(initialParams);

  const { data, isLoading, error } = useQuery({
    queryKey: ['marketplaceSchedules', params],
    queryFn: () => medicalApi.fetchMarketplaceSchedules(params || {}),
    enabled: !!session && enabled,
    staleTime: 1000 * 60 * 5,
  });

  const search = useCallback(async (newParams: MarketplaceScheduleQuery) => {
    setParams(newParams);
  }, []);

  return {
    posts: data?.posts || EMPTY_ARRAY,
    total: data?.total || 0,
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    search,
  };
}

/* ─── Doctor's weekly template hook ─── */

export interface UseWeeklyTemplateResult {
  templates: WeeklyTemplate[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  save: (templates: WeeklyTemplateInput[]) => Promise<WeeklyTemplate[]>;
  generate: (weeksAhead: number, timezoneOffset?: number) => Promise<GenerateSchedulesResult>;
}

export function useWeeklyTemplate(): UseWeeklyTemplateResult {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['weeklyTemplate'],
    queryFn: () => medicalApi.fetchMyWeeklyTemplate(),
    enabled: !!session,
  });

  const saveMutation = useMutation({
    mutationFn: (input: WeeklyTemplateInput[]) => medicalApi.saveMyWeeklyTemplate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyTemplate'] });
    },
  });

  const generate = useCallback(async (weeksAhead: number, timezoneOffset?: number) => {
    const offset = timezoneOffset !== undefined ? timezoneOffset : new Date().getTimezoneOffset();
    const result = await medicalApi.generateSchedulesFromTemplate(weeksAhead, offset);
    queryClient.invalidateQueries({ queryKey: ['doctorSchedules'] });
    return result;
  }, [queryClient]);

  return {
    templates: data || EMPTY_ARRAY,
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: () => refetch(),
    save: saveMutation.mutateAsync,
    generate,
  };
}

/* ─── Doctor's schedule exceptions hook ─── */

export interface UseScheduleExceptionsResult {
  exceptions: ScheduleException[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  create: (input: ScheduleExceptionInput) => Promise<ScheduleException>;
  remove: (exceptionId: string) => Promise<void>;
}

export function useScheduleExceptions(): UseScheduleExceptionsResult {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['scheduleExceptions'],
    queryFn: () => medicalApi.fetchMyScheduleExceptions(),
    enabled: !!session,
  });

  const createMutation = useMutation({
    mutationFn: (input: ScheduleExceptionInput) => medicalApi.createMyScheduleException(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleExceptions'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (exceptionId: string) => medicalApi.deleteMyScheduleException(exceptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleExceptions'] });
    },
  });

  return {
    exceptions: data || EMPTY_ARRAY,
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: () => refetch(),
    create: createMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
  };
}
