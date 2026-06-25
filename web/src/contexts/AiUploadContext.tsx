import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { medicalApi } from '../services/medicalApi';
import { useJobProgress } from '../hooks/useJobProgress';

interface AiUploadContextType {
  isUploading: boolean;
  status: 'idle' | 'starting' | 'downloaded' | 'analyzing' | 'extracting' | 'saving' | 'completed' | 'failed';
  currentFileName: string | null;
  error: string | null;
  startUpload: (file: File) => Promise<void>;
  clearUpload: () => void;
  lastResult: any | null;
  elapsedSeconds: number;
  isModalOpen: boolean;
  setIsModalOpen: (val: boolean) => void;
  duplicateFeedbackId: string | null;
  resetError: () => void;
}

const AiUploadContext = createContext<AiUploadContextType | undefined>(undefined);

export function AiUploadProvider({ children }: { children: React.ReactNode }) {
  const [isUploading, setIsUploading] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [duplicateFeedbackId, setDuplicateFeedbackId] = useState<string | null>(null);

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

  // Job Progress SSE listener
  const jobProgress = useJobProgress(activeJobId);

  useEffect(() => {
    if (!activeJobId) return;

    if (jobProgress.status === 'failed') {
      setError(jobProgress.error || 'Extraction failed');
      setIsUploading(false);
      setActiveJobId(null);
      window.dispatchEvent(new CustomEvent('aethea-api-error', {
        detail: { title: 'Analysis Failed', message: jobProgress.error || 'The AI was unable to parse the document.' }
      }));
    } else if (jobProgress.status === 'completed' && jobProgress.result) {
      setLastResult(jobProgress.result);
      setIsUploading(false);
      setActiveJobId(null);
      // Dispatch refresh event since we have results
      window.dispatchEvent(new CustomEvent('lab-data-refresh'));
      window.dispatchEvent(new CustomEvent('dynamic-island-notify', {
        detail: { message: 'Analysis Complete' }
      }));
    }
  }, [jobProgress, activeJobId]);

  const startUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    setCurrentFileName(file.name);
    setLastResult(null);
    setElapsedSeconds(0);
    setDuplicateFeedbackId(null);
    setIsModalOpen(false); // Close immediately upon start

    try {
      const response = await medicalApi.uploadLabResult(file);
      setActiveJobId(response.jobId);
    } catch (err: any) {
      console.error('AI Upload Error:', err);
      if (err.duplicate && err.duplicateFeedbackId) {
        setDuplicateFeedbackId(err.duplicateFeedbackId);
      } else {
        setError(err.message || 'An error occurred during upload.');
      }
      setIsUploading(false);
      setIsModalOpen(true);
    }
  }, []);

  const clearUpload = useCallback(() => {
    setIsUploading(false);
    setCurrentFileName(null);
    setError(null);
    setLastResult(null);
    setElapsedSeconds(0);
    setDuplicateFeedbackId(null);
    setIsModalOpen(false);
    setActiveJobId(null);
  }, []);

  const resetError = useCallback(() => {
    setError(null);
    setDuplicateFeedbackId(null);
  }, []);

  const status = activeJobId ? jobProgress.status : 'idle';

  return (
    <AiUploadContext.Provider value={{ 
      isUploading, 
      status, 
      currentFileName, 
      error, 
      startUpload, 
      clearUpload,
      lastResult,
      elapsedSeconds,
      isModalOpen,
      setIsModalOpen,
      duplicateFeedbackId,
      resetError
    }}>
      {children}
    </AiUploadContext.Provider>
  );
}

export function useAiUpload() {
  const context = useContext(AiUploadContext);
  if (context === undefined) {
    throw new Error('useAiUpload must be used within an AiUploadProvider');
  }
  return context;
}
