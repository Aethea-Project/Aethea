/**
 * useScans — Use-case hook for medical scan data
 *
 * Owns: fetch lifecycle (loading, error, data)
 * Does NOT own: filterType, filterStatus, sortBy, selectedScan (those stay in the page)
 *
 * Architecture layer: Pages → [this hook] → medicalApi → apiClient
 */

import { useEffect, useState } from 'react';
import { MedicalScan } from '@core/types/medical';
import { medicalApi } from '../services/medicalApi';

export interface UseScansResult {
  scans: MedicalScan[];
  loading: boolean;
  error: string | null;
}

export function useScans(): UseScansResult {
  const [scans, setScans] = useState<MedicalScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await medicalApi.fetchScans();
        if (!active) return;
        // Ensure images array exists to keep UI stable
        setScans(data.map((scan) => ({ ...scan, images: scan.images ?? [] })) as MedicalScan[]);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load scans');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { scans, loading, error };
}
