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

import { useCallback, useEffect, useState } from 'react';
import { medicalApi, Reservation, BookReservationPayload } from '../services/medicalApi';

export interface UseReservationsResult {
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
  book: (payload: BookReservationPayload) => Promise<void>;
  cancel: (id: string) => Promise<void>;
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

  const book = useCallback(async (payload: BookReservationPayload): Promise<void> => {
    await medicalApi.bookReservation(payload);
    await fetchData();
  }, [fetchData]);

  const cancel = useCallback(async (id: string): Promise<void> => {
    await medicalApi.cancelReservation(id);
    await fetchData();
  }, [fetchData]);

  return { reservations, loading, error, book, cancel };
}