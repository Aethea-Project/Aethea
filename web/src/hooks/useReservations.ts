/**
 * useReservations — Use-case hook for reservation data and mutations
 *
 * Owns:
 *   - fetch lifecycle (loading, error, data)
 *   - createReservation mutation (calls API then auto-refetches)
 *   - updateStatus mutation (calls API then auto-refetches)
 *
 * Does NOT own: form state, sorted/filtered views, UI selection (those stay in the page)
 *
 * Architecture layer: Pages → [this hook] → medicalApi → apiClient
 */

import { useCallback, useEffect, useState } from 'react';
import { medicalApi, Reservation, ReservationPayload, ReservationStatus } from '../services/medicalApi';

export interface UseReservationsResult {
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
  createReservation: (payload: ReservationPayload) => Promise<void>;
  updateStatus: (id: string, status: ReservationStatus) => Promise<void>;
}

export function useReservations(): UseReservationsResult {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await medicalApi.fetchReservations();
      setReservations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createReservation = useCallback(async (payload: ReservationPayload): Promise<void> => {
    await medicalApi.createReservation(payload);
    await fetchData();
  }, [fetchData]);

  const updateStatus = useCallback(async (id: string, status: ReservationStatus): Promise<void> => {
    await medicalApi.updateReservation(id, { status });
    await fetchData();
  }, [fetchData]);

  return { reservations, loading, error, createReservation, updateStatus };
}
