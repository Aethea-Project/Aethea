/**
 * useLabTests — Use-case hook for lab test data
 */

import { useQuery } from '@tanstack/react-query';
import { medicalApi } from '../services/medicalApi';
import type { LabTest } from '../services/medicalApi';
import { useAuth } from '@core/auth/useAuth';

const EMPTY_ARRAY: any[] = [];

export interface UseLabTestsResult {
  labTests: LabTest[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useLabTests(): UseLabTestsResult {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['labTests', userId],
    queryFn: () => medicalApi.fetchLabTests(),
    enabled: !!userId && !authLoading,
  });

  return {
    labTests: data || EMPTY_ARRAY,
    loading: isLoading || authLoading,
    error: error ? (error as Error).message : null,
    refresh: refetch,
  };
}

export function useLabFeedbacks() {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['labFeedbacks', userId],
    queryFn: () => medicalApi.fetchLabFeedbacks(),
    enabled: !!userId && !authLoading,
  });

  return {
    feedbacks: data || EMPTY_ARRAY,
    loading: isLoading || authLoading,
    error: error ? (error as Error).message : null,
    refresh: refetch,
  };
}
