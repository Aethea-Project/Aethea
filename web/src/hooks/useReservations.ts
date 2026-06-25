/**
 * useReservations - Use-case hook for reservation data and mutations
 *
 * Owns:
 *   - fetch lifecycle (loading, error, data)
 *   - book mutation (calls API then auto-refetches)
 *   - cancel mutation (calls API then auto-refetches)
 *
 * Does NOT own: form state, sorted/filtered views, UI selection (those stay in the page)
 *
 * Architecture layer: Pages -> [this hook] -> medicalApi -> apiClient
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicalApi, Reservation, BookReservationPayload } from '../services/medicalApi';
import { useAuth } from '@core/auth/useAuth';

const EMPTY_ARRAY: any[] = [];

export interface UseReservationsResult {
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
  book: (payload: BookReservationPayload) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  alertOnAvailability: (doctorScheduleId: string) => Promise<string>;
}

export function useReservations(tab: 'upcoming' | 'past' | 'cancelled' = 'upcoming'): UseReservationsResult {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['reservations', tab],
    queryFn: () => medicalApi.fetchReservations(tab),
    enabled: !!session,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const bookMutation = useMutation({
    mutationFn: (payload: BookReservationPayload) => medicalApi.bookReservation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['doctorSchedules'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => medicalApi.cancelReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['doctorSchedules'] });
    },
  });

  const alertOnAvailability = useCallback(async (doctorScheduleId: string): Promise<string> => {
    const result = await medicalApi.subscribeToAvailabilityAlert(doctorScheduleId);
    return result.message;
  }, []);

  return {
    reservations: data || EMPTY_ARRAY,
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    book: async (payload) => { await bookMutation.mutateAsync(payload); },
    cancel: async (id) => { await cancelMutation.mutateAsync(id); },
    alertOnAvailability,
  };
}