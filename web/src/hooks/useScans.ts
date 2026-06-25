/**
 * useScans — Use-case hook for medical scan data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicalApi } from '../services/medicalApi';
import type { MedicalScan } from '../services/medicalApi';
import { useAuth } from '@core/auth/useAuth';

const EMPTY_ARRAY: any[] = [];

export interface UseScansResult {
  scans: MedicalScan[];
  loading: boolean;
  error: string | null;
  removeScan: (id: string) => Promise<void>;
}

export function useScans(): UseScansResult {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['scans', userId],
    queryFn: async () => {
      const scans = await medicalApi.fetchScans();
      return scans.map((scan) => ({ ...scan, images: scan.images ?? [] })) as MedicalScan[];
    },
    enabled: !!userId && !authLoading,
  });

  const queryClient = useQueryClient();

  const removeScanMutation = useMutation({
    mutationFn: (id: string) => medicalApi.deleteScan(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(['scans', userId], (oldData: MedicalScan[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter((scan) => scan.id !== deletedId);
      });
    },
  });

  return {
    scans: data || EMPTY_ARRAY,
    loading: isLoading || authLoading,
    error: error ? (error as Error).message : null,
    removeScan: async (id: string) => {
      await removeScanMutation.mutateAsync(id);
    },
  };
}
