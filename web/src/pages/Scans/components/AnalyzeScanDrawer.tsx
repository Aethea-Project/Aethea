import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@core/auth/useAuth';
import { medicalApi } from '../../../services/medicalApi';
import { useScanUpload } from '../../../contexts/ScanUploadContext';
import { cn } from '../../../lib/utils';

const X = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const UploadCloud = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
    <path d="M12 12v9"></path>
    <path d="m16 16-4-4-4 4"></path>
  </svg>
);

const Loader2 = ({ className = "w-5 h-5 animate-spin" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
  </svg>
);

interface AnalyzeScanDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalyzeScanDrawer({ isOpen, onClose }: AnalyzeScanDrawerProps) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { startScanUpload, isUploading: isScanUploading } = useScanUpload();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close with Esc
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reset state when drawer closes (only on true → false transition)
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !isOpen) {
      const timer = setTimeout(resetState, 300);
      return () => clearTimeout(timer);
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  const handleFile = (selectedFile: File) => {
    setError(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a valid image file (JPEG, PNG, WEBP).');
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const fileToBase64 = (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
    });
  };

  const analyzeImage = async () => {
    if (!file) return;
    
    setIsLoading(true);
    setError(null);
    try {
      startScanUpload(file);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to start scan analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-sand-900/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div 
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-3xl bg-surface-card shadow-2xl transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-sand-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-sand-900">AI Scan Analysis</h2>
            <p className="text-sm text-sand-500 mt-0.5">Quickly analyze medical images for insights.</p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-sand-400 hover:bg-sand-100 hover:text-sand-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Upload Area */}
            <div 
              className={cn(
                "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
                isDragging ? "border-sand-500 bg-sand-50" : "border-sand-200 hover:bg-sand-50/50",
                preview ? "border-solid border-sand-200 p-4" : ""
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {preview ? (
                <div className="relative w-full">
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="max-h-[300px] w-full rounded-xl object-contain bg-sand-100"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetState();
                    }}
                    className="absolute right-2 top-2 rounded-full bg-sand-900/70 p-1.5 text-white hover:bg-sand-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="rounded-full bg-sand-100 p-4 text-sand-600 mb-4">
                    <UploadCloud className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-semibold text-sand-900">Click to upload or drag and drop</p>
                  <p className="text-xs text-sand-500 mt-1">JPEG, PNG, WEBP (Max 10MB)</p>
                </>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0" 
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFile(e.target.files[0]);
                  }
                }}
                disabled={isLoading || !!preview}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {error}
              </div>
            )}

            {/* Action Button */}
            {preview && (
              <button
                onClick={analyzeImage}
                disabled={isLoading || isScanUploading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-nescafe px-6 py-3.5 font-semibold text-white shadow-sm hover:bg-nescafe-hover focus:ring-2 focus:ring-sand-400 focus:ring-offset-2 transition disabled:opacity-70"
              >
                {isLoading || isScanUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analyzing Image...
                  </>
                ) : (
                  'Run AI Analysis'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
