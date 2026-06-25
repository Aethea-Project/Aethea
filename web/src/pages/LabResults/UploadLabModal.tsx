import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { useAiUpload } from '../../contexts/AiUploadContext';

interface UploadLabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadLabModal: React.FC<UploadLabModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const { 
    isUploading, 
    error, 
    startUpload, 
    lastResult, 
    clearUpload,
    isModalOpen,
    setIsModalOpen,
    duplicateFeedbackId,
    resetError
  } = useAiUpload();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      resetError();
    }
  };

  const handleUpload = () => {
    if (!file) return;
    // Do not await this. Let it run in the background.
    // It closes the modal via Context immediately, and re-opens it if an error occurs.
    startUpload(file).catch(console.error);
    onClose();
  };

  // Sync prop isOpen with context isModalOpen
  useEffect(() => {
    if (isOpen && !isModalOpen && !isUploading) {
      setIsModalOpen(true);
    }
  }, [isOpen, isModalOpen, isUploading, setIsModalOpen]);

  // Remove lastResult watch as it will be handled by the page or dynamic island

  const handleClose = () => {
    setIsModalOpen(false);
    onClose();
    if (lastResult || error || duplicateFeedbackId) {
      clearUpload();
    }
  };

  const handleViewResults = () => {
    if (duplicateFeedbackId) {
      window.dispatchEvent(new CustomEvent('view-feedback', { detail: { feedbackId: duplicateFeedbackId } }));
      handleClose();
    }
  };



  return (
    <Modal isOpen={isModalOpen || isOpen} onClose={handleClose} ariaLabel="Upload Lab Result">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-sand-900 mb-4">Upload Lab Result</h2>
        <p className="text-sm text-sand-500 mb-6">
          Upload a clear image (PNG, JPG, WEBP) or PDF of your lab results. Our AI will analyze the document and provide detailed insights.
        </p>

        <div className="space-y-4">
          {!isUploading && (
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-sand-300 border-dashed rounded-lg cursor-pointer bg-surface hover:bg-sand-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-sand-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                  </svg>
                  <p className="mb-2 text-sm text-sand-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-sand-500">PDF, PNG, JPG, WEBP (MAX. 10MB)</p>
                </div>
                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFileChange} disabled={isUploading} />
              </label>
            </div>
          )}

          {file && (
            <div className="flex items-center justify-between p-3 bg-sand-50 rounded-lg border border-sand-200">
              <span className="text-sm font-medium text-sand-900 truncate pr-4">{file.name}</span>
              <button 
                type="button" 
                onClick={() => { setFile(null); resetError(); }} 
                disabled={isUploading} 
                className="text-amber-600 hover:text-sand-900 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {error && !duplicateFeedbackId && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          {duplicateFeedbackId && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Duplicate Document Detected</h4>
                  <p className="text-xs text-amber-700 mt-1">You have already uploaded this document. You can view the previously extracted results instead of uploading it again.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-sand-700 bg-surface-card border border-sand-300 rounded-lg hover:bg-sand-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sand-500"
          >
            {isUploading ? 'Close' : 'Cancel'}
          </button>
          
          {duplicateFeedbackId ? (
            <button
              type="button"
              onClick={handleViewResults}
              className="px-4 py-2 text-sm font-medium text-white bg-nescafe border border-transparent rounded-lg hover:bg-nescafe-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sand-500 flex items-center"
            >
              View Results
            </button>
          ) : (
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="px-4 py-2 text-sm font-medium text-white bg-nescafe border border-transparent rounded-lg hover:bg-nescafe-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sand-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Upload & Analyze
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
