import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { medicalApi } from '../services/medicalApi';

interface AiUploadContextType {
  isUploading: boolean;
  streamingText: string;
  currentFileName: string | null;
  error: string | null;
  startUpload: (file: File) => Promise<void>;
  clearUpload: () => void;
  lastResult: any | null;
  elapsedSeconds: number;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
  isModalOpen: boolean;
  setIsModalOpen: (val: boolean) => void;
}

const AiUploadContext = createContext<AiUploadContextType | undefined>(undefined);

export function AiUploadProvider({ children }: { children: React.ReactNode }) {
  const [isUploading, setIsUploading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const startUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    setStreamingText('');
    setCurrentFileName(file.name);
    setLastResult(null);
    setElapsedSeconds(0);
    setIsMinimized(false);
    setIsModalOpen(true);

    try {
      const response = await medicalApi.uploadLabResult(file);
      
      if (!response.body) {
        throw new Error('No response body received from server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          
          // Robust parsing: handle multiple JSON objects concatenated together
          // This happens if heartbeat and data are sent in the same chunk without \n
          const jsonMatches = line.match(/\{.*?\}(?=\{|$)/g) || [line];

          for (const jsonStr of jsonMatches) {
            try {
              const data = JSON.parse(jsonStr);
              
              if (data.token) {
                setStreamingText((prev) => prev + data.token);
              } else if (data.done || data.lab_results || data.tests) {
                setLastResult(data.final || data.data || data);
                setIsUploading(false);
                // Dispatch refresh event since we have results
                window.dispatchEvent(new CustomEvent('lab-data-refresh'));
              }
            } catch (e) {
              console.error('Error parsing JSON object:', jsonStr, e);
            }
          }
        }
      }

      setIsUploading(false);
    } catch (err: any) {
      console.error('AI Upload Error:', err);
      setError(err.message || 'An error occurred during upload.');
      setIsUploading(false);
      setIsMinimized(false); // Maximize on error so user sees it
      setIsModalOpen(true);
    }
  }, []);

  const clearUpload = useCallback(() => {
    setIsUploading(false);
    setStreamingText('');
    setCurrentFileName(null);
    setError(null);
    setLastResult(null);
    setElapsedSeconds(0);
    setIsMinimized(false);
    setIsModalOpen(false);
  }, []);

  return (
    <AiUploadContext.Provider value={{ 
      isUploading, 
      streamingText, 
      currentFileName, 
      error, 
      startUpload, 
      clearUpload,
      lastResult,
      elapsedSeconds,
      isMinimized,
      setIsMinimized,
      isModalOpen,
      setIsModalOpen
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
