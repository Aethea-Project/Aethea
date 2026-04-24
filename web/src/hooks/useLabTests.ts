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
import { useAuth } from '@core/auth/useAuth';

export interface UseLabTestsResult {
  labTests: LabTest[];
  loading: boolean;
  error: string | null;
}

export function useLabTests(): UseLabTestsResult & { refresh: () => void } {
  const { session, loading: authLoading } = useAuth();
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    if (authLoading || !session) return;
    let active = true;

    (async () => {
      try {
        setLoading(true);
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
  }, [authLoading, session, refreshTrigger]);

  return { labTests, loading, error, refresh };
}

export function useLabFeedbacks() {
  const { session, loading: authLoading } = useAuth();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    if (authLoading || !session) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await medicalApi.fetchLabFeedbacks();
        if (!active) return;
        setFeedbacks(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load feedbacks');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [authLoading, session, refreshTrigger]);

  return { feedbacks, loading, error, refresh };
}
