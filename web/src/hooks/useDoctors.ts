/**
 * useDoctors - Use-case hook for doctor discovery and schedule browsing
 *
 * Architecture layer: Pages -> [this hook] -> medicalApi -> apiClient
 */

import { useCallback, useEffect, useState } from 'react';
import {
  medicalApi,
  DoctorProfile,
  DoctorSchedule,
  ScheduleSlotView,
  DoctorListParams,
  MarketplaceSchedulePost,
  MarketplaceScheduleQuery,
} from '../services/medicalApi';
import { useAuth } from '@core/auth/useAuth';

export interface UseDoctorsResult {
  doctors: DoctorProfile[];
  total: number;
  loading: boolean;
  error: string | null;
  search: (params: DoctorListParams) => Promise<void>;
}

export function useDoctors(initialParams?: DoctorListParams): UseDoctorsResult {
  const { session, loading: authLoading } = useAuth();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (params: DoctorListParams) => {
    setLoading(true);
    try {
      const result = await medicalApi.fetchDoctors(params);
      setDoctors(result.doctors);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load doctors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !session) return; // wait for session to be ready
    void search({
      search: initialParams?.search,
      specialty: initialParams?.specialty,
      city: initialParams?.city,
      page: initialParams?.page,
      limit: initialParams?.limit,
    });
  }, [
    authLoading,
    session,
    search,
    initialParams?.search,
    initialParams?.specialty,
    initialParams?.city,
    initialParams?.page,
    initialParams?.limit,
  ]);

  return { doctors, total, loading, error, search };
}

/* ─── Doctor schedule hook ─── */

export interface UseDoctorSchedulesResult {
  schedules: DoctorSchedule[];
  total: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDoctorSchedules(doctorId: string): UseDoctorSchedulesResult {
  const { session, loading: authLoading } = useAuth();
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!doctorId) return;
    setLoading(true);
    medicalApi
      .fetchDoctorSchedules(doctorId)
      .then((result) => {
        setSchedules(result.schedules);
        setTotal(result.total);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load schedules');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [doctorId]);

  useEffect(() => {
    if (authLoading || !session) return;
    load();
  }, [load, authLoading, session]);

  return { schedules, total, loading, error, refresh: load };
}

/* ─── Doctor's own schedule-slots view hook ─── */

export interface UseScheduleSlotsResult {
  slotView: ScheduleSlotView | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useScheduleSlots(scheduleId: string): UseScheduleSlotsResult {
  const { session, loading: authLoading } = useAuth();
  const [slotView, setSlotView] = useState<ScheduleSlotView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await medicalApi.fetchScheduleSlots(scheduleId);
      setSlotView(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load slots');
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    if (authLoading || !session) return;
    if (scheduleId) load();
  }, [scheduleId, load, authLoading, session]);

  return { slotView, loading, error, refresh: load };
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
  const { session, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<MarketplaceSchedulePost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (params: MarketplaceScheduleQuery) => {
    setLoading(true);
    try {
      const result = await medicalApi.fetchMarketplaceSchedules(params);
      setPosts(result.posts);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load marketplace posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !session || !enabled) {
      if (!enabled) setLoading(false);
      return;
    }
    void search(initialParams ?? {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, authLoading, session]);

  return { posts, total, loading, error, search };
}
