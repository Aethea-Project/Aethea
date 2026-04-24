import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { medicalApi } from '../../services/medicalApi';

interface UploadLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (result: any) => void;
}

export function UploadLabModal({ isOpen, onClose, onUploadSuccess }: UploadLabModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setStreamingText('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setLoading(true);
      setError(null);
      setStreamingText('');
      
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

        // Append new chunk to buffer and split by newlines (NDJSON)
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const data = JSON.parse(line);
            
            if (data.status === 'processing') {
              // Optionally update status message
              console.log('Backend processing started...');
            } else if (data.token) {
              // Append tokens to streaming text
              setStreamingText((prev) => prev + data.token);
            } else if (data.done) {
              // Final result received
              setLoading(false);
              onUploadSuccess(data.final || data.data);
              return;
            }
          } catch (e) {
            console.error('Error parsing stream line:', line, e);
          }
        }
      }

      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'An error occurred during upload.');
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={!loading ? onClose : () => {}} ariaLabel="Upload Lab Result">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Lab Result</h2>
        <p className="text-sm text-gray-500 mb-6">
          Upload a clear image or PDF of your lab results. Our AI will analyze the document and provide detailed insights.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                </svg>
                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-gray-500">PNG, JPG, PDF (MAX. 10MB)</p>
              </div>
              <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} disabled={loading} />
            </label>
          </div>

          {file && (
            <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg border border-teal-100">
              <span className="text-sm font-medium text-teal-800 truncate pr-4">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} disabled={loading} className="text-teal-600 hover:text-teal-800 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}
          
          {loading && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse delay-75"></div>
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse delay-150"></div>
              </div>
              <p className="text-center text-sm text-blue-700 mt-2 font-medium">Analyzing document with AI...</p>
              
              {streamingText && (
                <div className="mt-4 p-3 bg-white bg-opacity-60 rounded border border-blue-200 max-h-40 overflow-y-auto custom-scrollbar">
                  <p className="text-xs text-blue-900 whitespace-pre-wrap font-mono leading-relaxed">
                    {streamingText}
                  </p>
                </div>
              )}
              
              {!streamingText && (
                <p className="text-center text-xs text-blue-600 mt-1 italic">This may take 5-15 minutes due to heavy model load.</p>
              )}
            </div>
          )}

        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? 'Processing...' : 'Upload & Analyze'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
