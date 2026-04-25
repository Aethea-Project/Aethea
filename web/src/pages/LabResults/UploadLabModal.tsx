import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { useAiUpload } from '../../contexts/AiUploadContext';

interface UploadLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (result: any) => void;
}

export function UploadLabModal({ isOpen, onClose, onUploadSuccess }: UploadLabModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const { 
    isUploading, 
    streamingText, 
    error, 
    startUpload, 
    lastResult, 
    clearUpload,
    elapsedSeconds,
    isMinimized,
    setIsMinimized,
    isModalOpen,
    setIsModalOpen
  } = useAiUpload();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    await startUpload(file);
  };

  // Sync prop isOpen with context isModalOpen
  useEffect(() => {
    if (isOpen && !isModalOpen && !isUploading) {
      setIsModalOpen(true);
    }
  }, [isOpen, isModalOpen, isUploading, setIsModalOpen]);

  // Watch for successful result from context
  useEffect(() => {
    if (lastResult && !isUploading) {
      onUploadSuccess(lastResult);
    }
  }, [lastResult, isUploading, onUploadSuccess]);

  const handleClose = () => {
    if (isUploading) {
      // Minimize if uploading
      setIsMinimized(true);
      setIsModalOpen(false);
      onClose();
    } else {
      setIsModalOpen(false);
      onClose();
      if (lastResult || error) {
        clearUpload();
      }
    }
  };

  // If minimized, don't render the modal
  if (isMinimized) return null;

  return (
    <Modal isOpen={isModalOpen || isOpen} onClose={handleClose} ariaLabel="Upload Lab Result">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Lab Result</h2>
        <p className="text-sm text-gray-500 mb-6">
          Upload a clear image or PDF of your lab results. Our AI will analyze the document and provide detailed insights.
        </p>

        <div className="space-y-4">
          {!isUploading && (
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                  </svg>
                  <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-gray-500">PNG, JPG, PDF (MAX. 10MB)</p>
                </div>
                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} disabled={isUploading} />
              </label>
            </div>
          )}

          {file && (
            <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg border border-teal-100">
              <span className="text-sm font-medium text-teal-800 truncate pr-4">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} disabled={isUploading} className="text-teal-600 hover:text-teal-800 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}
          
          {isUploading && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-blue-700 font-bold uppercase tracking-tight">Analyzing document with AI...</p>
                </div>
                <div className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-mono font-bold">
                  {formatTime(elapsedSeconds)}
                </div>
              </div>
              
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

          {!isUploading && lastResult && (
            <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100 animate-in zoom-in-95 duration-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-900">Analysis Complete</h3>
                  <p className="text-xs text-emerald-600">Document processed successfully</p>
                </div>
              </div>
              
              <div className="bg-white/60 rounded-lg p-4 mb-4 border border-emerald-200/50">
                <p className="text-sm text-emerald-800 leading-relaxed italic">
                  "{lastResult.patient_summary || lastResult.summary || 'Results have been saved to your profile.'}"
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    window.location.href = '/lab-results';
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
                >
                  View Results Table
                </button>
              </div>
            </div>
          )}

        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            {isUploading ? 'Minimize' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isUploading ? 'Processing...' : 'Upload & Analyze'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
