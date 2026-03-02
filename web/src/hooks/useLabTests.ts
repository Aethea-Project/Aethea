/**
 * useLabTests — Use-case hook for lab test data
 *
 * Owns: fetch lifecycle (loading, error, data)
 * Does NOT own: filtering, sorting, UI selection state (those stay in the page)
 *
 * Architecture layer: Pages → [this hook] → medicalApi → apiClient
 */

import { useEffect, useState } from 'react';
import { LabTest } from '@core/types/medical';
import { medicalApi } from '../services/medicalApi';

export interface UseLabTestsResult {
  labTests: LabTest[];
  loading: boolean;
  error: string | null;
}

export function useLabTests(): UseLabTestsResult {
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await medicalApi.fetchLabTests();
        if (!active) return;
        setLabTests(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load lab tests');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { labTests, loading, error };
}
