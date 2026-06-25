import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@core/auth/useAuth';
import { medicalApi } from '../services/medicalApi';
import { toast } from 'react-hot-toast';

interface ScanUploadContextType {
  isUploading: boolean;
  status: 'idle' | 'uploading' | 'analyzing' | 'saving' | 'completed' | 'failed';
  currentFileName: string | null;
  error: string | null;
  startScanUpload: (file: File) => Promise<void>;
  clearUpload: () => void;
  elapsedSeconds: number;
}

const ScanUploadContext = createContext<ScanUploadContextType | undefined>(undefined);

const fileToBase64 = (f: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(f);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
  });
};

export function ScanUploadProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'saving' | 'completed' | 'failed'>('idle');
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isUploading) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isUploading]);

  const startScanUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setStatus('uploading');
    setError(null);
    setCurrentFileName(file.name);
    setElapsedSeconds(0);

    let statusTimer1: NodeJS.Timeout | undefined;
    let statusTimer2: NodeJS.Timeout | undefined;

    try {
      const base64Data = await fileToBase64(file);

      // Simulate status steps for premium UX
      statusTimer1 = setTimeout(() => setStatus('analyzing'), 2000);
      statusTimer2 = setTimeout(() => setStatus('saving'), 5000);

      await medicalApi.createScan({
        fileBase64: base64Data,
        fileName: file.name,
        type: 'X-Ray',
        bodyPart: 'Chest',
        description: 'AI scan analysis of chest X-Ray',
        radiologist: 'Aethea AI Analyzer',
        priority: 'routine',
        scanDate: new Date().toISOString()
      });

      if (statusTimer1) clearTimeout(statusTimer1);
      if (statusTimer2) clearTimeout(statusTimer2);
      
      setStatus('completed');
      setIsUploading(false);

      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['scans', userId] });
      }

      window.dispatchEvent(new CustomEvent('dynamic-island-notify', {
        detail: { message: 'Scan Analysis Complete' }
      }));
      toast.success('Scan analyzed successfully!');
    } catch (err: any) {
      if (statusTimer1) clearTimeout(statusTimer1);
      if (statusTimer2) clearTimeout(statusTimer2);

      console.error('Scan Upload Error:', err);
      setError(err.message || 'An error occurred during scan upload.');
      setStatus('failed');
      setIsUploading(false);
      toast.error(err.message || 'Failed to analyze scan.');
    }
  }, [userId, queryClient]);

  const clearUpload = useCallback(() => {
    setIsUploading(false);
    setStatus('idle');
    setCurrentFileName(null);
    setError(null);
    setElapsedSeconds(0);
  }, []);

  return (
    <ScanUploadContext.Provider value={{
      isUploading,
      status,
      currentFileName,
      error,
      startScanUpload,
      clearUpload,
      elapsedSeconds
    }}>
      {children}
    </ScanUploadContext.Provider>
  );
}

export function useScanUpload() {
  const context = useContext(ScanUploadContext);
  if (context === undefined) {
    throw new Error('useScanUpload must be used within a ScanUploadProvider');
  }
  return context;
}
