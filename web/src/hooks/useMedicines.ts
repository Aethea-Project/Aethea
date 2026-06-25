/**
 * useMedicines — Use-case hook for medicine search and detail viewing
 *
 * Architecture layer: Pages -> [this hook] -> medicineApi -> apiClient
 */

import { useCallback, useEffect, useState } from 'react';
import {
  medicineApi,
  Medicine,
  MedicineDetail,
  MedicineSearchParams,
} from '../services/medicineApi';
import { useAuth } from '@core/auth/useAuth';

/* ─── Search hook ─── */

export interface UseMedicinesResult {
  medicines: Medicine[];
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
  search: (params?: MedicineSearchParams) => Promise<void>;
}

export function useMedicines(initialParams?: MedicineSearchParams): UseMedicinesResult {
  const { session, loading: authLoading } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (params?: MedicineSearchParams) => {
    setLoading(true);
    try {
      const result = await medicineApi.searchMedicines(params);
      setMedicines(result.data);
      setTotal(result.total);
      setPage(result.page);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load medicines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !session) return;
    void search(initialParams);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session]);

  return { medicines, total, page, loading, error, search };
}

/* ─── Categories hook ─── */

export function useCategories() {
  const { session, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !session) return;
    medicineApi
      .getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, [authLoading, session]);

  return { categories, loading };
}

/* ─── Medicine detail hook ─── */

export interface UseMedicineDetailResult {
  medicine: MedicineDetail | null;
  loading: boolean;
  error: string | null;
}

export function useMedicineDetail(id: string | null): UseMedicineDetailResult {
  const [medicine, setMedicine] = useState<MedicineDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setMedicine(null);
      return;
    }
    setLoading(true);
    medicineApi
      .getMedicineById(id)
      .then((data) => {
        setMedicine(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load medicine');
      })
      .finally(() => setLoading(false));
  }, [id]);

  return { medicine, loading, error };
}
