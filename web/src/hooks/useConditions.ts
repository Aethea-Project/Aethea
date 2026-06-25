/**
 * useConditions — Use-case hook for patient condition management
 *
 * Architecture layer: Pages -> [this hook] -> medicineApi -> apiClient
 */

import { useCallback, useEffect, useState } from 'react';
import { medicineApi } from '../services/medicineApi';
import { useAuth } from '@core/auth/useAuth';
import { authService } from '../services/auth';

type ConditionLabel = { en: string; ar: string; emoji: string };

export const CONDITION_LABELS = {
  diabetes:       { en: 'Diabetes',       ar: 'السكري',         emoji: '🩸' },
  prediabetes:    { en: 'Prediabetes',    ar: 'Prediabetes',    emoji: '⚠️' },
  hypertension:   { en: 'Hypertension',   ar: 'ضغط الدم',      emoji: '💓' },
  heart_disease:  { en: 'Heart Disease',  ar: 'أمراض القلب',    emoji: '❤️' },
  kidney_disease: { en: 'Kidney Disease', ar: 'أمراض الكلى',    emoji: '🫘' },
} as const satisfies Record<string, ConditionLabel>;

export type PatientCondition = keyof typeof CONDITION_LABELS;

export interface UseConditionsResult {
  conditions: string[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  setConditions: (conditions: string[]) => Promise<void>;
  refresh: () => void;
}

export function useConditions(enabled = true): UseConditionsResult {
  const { session, loading: authLoading } = useAuth();
  const [conditions, setConditionsState] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!enabled) {
      setConditionsState([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    medicineApi
      .getConditions()
      .then((data) => {
        setConditionsState(data);
        setError(null);
      })
      .catch((err) => {
        // Not logged in — silently set empty conditions
        setConditionsState([]);
        const msg = err instanceof Error ? err.message : 'Failed to load conditions';
        if (msg.includes('Unauthorized')) {
          // If the backend rejects our session, it's likely expired or invalid.
          // Trigger a silent sign-out to clear the invalid state.
          void authService.signOut();
          setError('Session expired. Please log in again.');
        } else {
          setError(msg);
        }
      })
      .finally(() => setLoading(false));
  }, [enabled]);

  useEffect(() => {
    if (authLoading || !session) return;
    load();
  }, [load, authLoading, session]);

  const setConditions = useCallback(async (newConditions: string[]) => {
    setSaving(true);
    try {
      await medicineApi.setConditions(newConditions);
      setConditionsState(newConditions);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save conditions';
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setSaving(false);
    }
  }, []);

  return { conditions, loading, saving, error, setConditions, refresh: load };
}
