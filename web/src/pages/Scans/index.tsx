import { useState } from 'react';
import type { MedicalScan } from '../../services/medicalApi';
import { useScans } from '../../hooks/useScans';
import { FeatureHeader } from '../../components/FeatureHeader';
import { AnalyzeScanDrawer } from './components/AnalyzeScanDrawer';
import { ScanIcon as Activity } from '../../components/Icons';
import { useScanUpload } from '../../contexts/ScanUploadContext';
import { cn } from '../../lib/utils';

const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  routine: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  urgent: 'border-amber-200 bg-amber-50 text-amber-700',
  emergency: 'border-red-200 bg-red-50 text-red-700',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  in_progress: 'border-blue-200 bg-blue-50 text-blue-700',
};

const STATUS_TEXT_CLASSES: Record<string, string> = {
  completed: 'text-emerald-700',
  pending: 'text-amber-700',
  in_progress: 'text-blue-700',
};

const ANNOTATION_COLOR_CLASSES: Record<string, string> = {
  red: 'bg-red-500',
  '#ef4444': 'bg-red-500',
  '#dc2626': 'bg-red-600',
  orange: 'bg-orange-500',
  '#f59e0b': 'bg-amber-500',
  yellow: 'bg-amber-400',
  green: 'bg-emerald-500',
  '#10b981': 'bg-emerald-500',
  blue: 'bg-sky-500',
  '#3b82f6': 'bg-blue-500',
  purple: 'bg-violet-500',
  '#8b5cf6': 'bg-violet-500',
  gray: 'bg-sand-400',
  '#64748b': 'bg-surface0',
};

const getAnnotationClass = (value?: string) => {
  const key = (value ?? '').toLowerCase();
  return ANNOTATION_COLOR_CLASSES[key] ?? 'bg-sand-400';
};

const formatStatus = (value: string) => value.replace(/_/g, ' ');

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ScansPage = () => {
  const { scans, loading, error, removeScan } = useScans();
  const { isUploading, status, elapsedSeconds } = useScanUpload();
  const [selectedScan, setSelectedScan] = useState<MedicalScan | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useState(false);

  // Sort scans by most recent date by default
  const sortedScans = [...scans].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  // Reflect exactly the real completed scans
  const completedScansCount = scans.filter((scan) => scan.status === 'completed').length;

  const handleScanClick = (scan: MedicalScan) => {
    setSelectedScan(scan);
    setSelectedImageIndex(0);
  };

  const handleDeleteScan = async (scanId: string) => {
    if (window.confirm('Are you sure you want to delete this scan? This action cannot be undone.')) {
      try {
        await removeScan(scanId);
        if (selectedScan?.id === scanId) {
          setSelectedScan(null);
        }
      } catch (err) {
        alert('Failed to delete scan. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-10 space-y-12 flex items-center justify-center min-h-[400px]">
        <p className="text-sand-700">Loading scans...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-10 space-y-12">
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">Failed to load scans: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full relative min-h-full">
      {/* INLINE AI PROGRESS BANNER */}
      {isUploading && (
        <div className="max-w-7xl mx-auto px-10 pt-10 pb-0">
          <div className="bg-sand-50/80 backdrop-blur-sm border border-sand-200 p-6 rounded-2xl flex items-center justify-between shadow-sm animate-in slide-in-from-top-4 fade-in duration-500">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-amber-600 relative overflow-hidden shadow-sm">
                <div className="absolute inset-0.5 border-[3px] border-sand-200 border-t-nescafe animate-spin rounded-full" />
                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-sand-900 tracking-tight">
                  {status === 'uploading' || status === 'analyzing' ? 'Analyzing Scan...' : status === 'saving' ? 'Almost done...' : 'Processing Scan...'}
                </h3>
                <p className="text-sm font-medium text-sand-500">Please wait while the AI analyzes your scan images.</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-sand-400 uppercase tracking-widest mb-1">Time Elapsed</span>
              <span className="text-xl font-mono font-bold text-sand-900">{formatTime(elapsedSeconds)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-10 space-y-12">
        <FeatureHeader
          title="Medical Scans"
          subtitle="View and manage your medical imaging results"
        >
          <button
            onClick={() => setIsAnalyzerOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-nescafe px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-nescafe-hover transition"
          >
            <Activity className="h-4 w-4" />
            Quick Analyze
          </button>
        </FeatureHeader>

        {/* Master-Detail Layout */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] items-start">
          
          {/* MASTER COLUMN */}
          <aside className="grid gap-6">
            <div className="rounded-2xl bg-surface-card p-5 text-center shadow-sm">
              <div className="text-[1.75rem] font-bold text-sand-900">{completedScansCount}</div>
              <div className="mt-1 text-[0.78rem] font-semibold uppercase tracking-wide text-sand-500">Total Completed Scans</div>
            </div>

            <div className="flex flex-col gap-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
              {sortedScans.map((scan) => (
                <button
                  key={scan.id}
                  type="button"
                  className={cn(
                    "text-left rounded-2xl bg-surface-card shadow-sm overflow-hidden transition hover:shadow-md flex min-h-[110px]",
                    selectedScan?.id === scan.id ? "ring-1 ring-sand-300 shadow-md bg-white" : "hover:bg-sand-50/50"
                  )}
                  onClick={() => handleScanClick(scan)}
                >
                  {/* Master thumbnail instead of 2x2 grid */}
                  <div className="w-32 shrink-0 bg-sand-100 relative border-r border-sand-100">
                    {scan.images[0] ? (
                      <img
                        src={scan.images[0].url}
                        alt={scan.images[0].caption || scan.type}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[0.6rem] text-sand-400 font-medium p-2 text-center leading-tight">
                        No image
                      </div>
                    )}
                  </div>
                  
                  {/* Content area */}
                  <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-sand-900 truncate">{scan.type}</h3>
                        <span className={cn('shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider', PRIORITY_BADGE_CLASSES[scan.priority] || 'border-sand-200 bg-sand-100 text-sand-600')}>
                          {scan.priority}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1 mt-2">
                      <div className="text-[0.7rem] font-medium text-sand-500">
                        {new Date(scan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <span className={cn('text-[0.7rem] font-bold uppercase tracking-wide', STATUS_TEXT_CLASSES[scan.status] || 'text-sand-500')}>
                        {formatStatus(scan.status)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {sortedScans.length === 0 && (
                <div className="rounded-2xl bg-surface-card p-10 text-center shadow-sm">
                  <p className="text-sm text-sand-600">No scans available.</p>
                </div>
              )}
            </div>
          </aside>

          {/* DETAIL COLUMN */}
          <main className="min-w-0 rounded-2xl bg-surface-card shadow-sm min-h-[500px]">
            {selectedScan ? (
              <div className="grid gap-8 p-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                {/* Images Viewer */}
                <div className="grid gap-5">
                  {selectedScan.images.length > 0 ? (
                    <>
                      <div className="rounded-2xl overflow-hidden bg-[#0a0a0a] shadow-sm flex items-center justify-center relative min-h-[300px] max-h-[450px]">
                        <img
                          src={selectedScan.images[selectedImageIndex]?.url}
                          alt={selectedScan.images[selectedImageIndex]?.caption || selectedScan.type}
                          className="w-full h-full object-contain max-h-[450px]"
                        />
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white/90 text-xs font-semibold px-3 py-1.5 rounded-lg">
                          {selectedScan.images[selectedImageIndex]?.caption || 'Scan image'}
                        </div>
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white/90 text-xs font-semibold px-3 py-1.5 rounded-lg tracking-wider">
                          {selectedImageIndex + 1} / {selectedScan.images.length}
                        </div>
                      </div>

                      {selectedScan.images.length > 1 && (
                        <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x">
                          {selectedScan.images.map((image, index) => (
                            <button
                              key={image.id}
                              type="button"
                              onClick={() => setSelectedImageIndex(index)}
                              className={cn(
                                'relative h-20 w-28 shrink-0 snap-start overflow-hidden rounded-xl transition-all',
                                index === selectedImageIndex
                                  ? 'ring-2 ring-sand-900 ring-offset-2 ring-offset-surface-card opacity-100'
                                  : 'opacity-50 hover:opacity-100 hover:ring-2 hover:ring-sand-200 hover:ring-offset-2 hover:ring-offset-surface-card',
                              )}
                            >
                              <img
                                src={image.url}
                                alt={image.caption || 'Scan image'}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-2xl bg-sand-50 border border-sand-100 h-64 flex items-center justify-center text-sm font-medium text-sand-500">
                      No images available for this scan.
                    </div>
                  )}
                </div>

                {/* Scan Metadata */}
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-2xl font-bold text-sand-900 leading-tight">{selectedScan.type}</h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider', PRIORITY_BADGE_CLASSES[selectedScan.priority] || 'border-sand-200 bg-sand-100 text-sand-600')}>
                      {selectedScan.priority}
                    </span>
                    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider', STATUS_BADGE_CLASSES[selectedScan.status] || 'border-sand-200 bg-sand-100 text-sand-600')}>
                      {formatStatus(selectedScan.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-sand-50 rounded-2xl p-5 border border-sand-100">
                    <div>
                      <span className="block text-[0.65rem] font-bold uppercase tracking-widest text-sand-400 mb-1">Date</span>
                      <span className="text-sm font-semibold text-sand-900">{new Date(selectedScan.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div>
                      <span className="block text-[0.65rem] font-bold uppercase tracking-widest text-sand-400 mb-1">Radiologist</span>
                      <span className="text-sm font-semibold text-sand-900">{selectedScan.radiologist}</span>
                    </div>
                  </div>

                  {selectedScan.findings && (
                    <div className="rounded-2xl bg-surface-card border border-sand-200 shadow-sm overflow-hidden">
                      <div className="bg-sand-50/50 border-b border-sand-100 px-5 py-3">
                        <h3 className="text-[0.7rem] font-bold uppercase tracking-widest text-sand-900">Findings</h3>
                      </div>
                      <div className="p-5">
                        <p className="text-sm text-sand-700 leading-relaxed whitespace-pre-line">{selectedScan.findings}</p>
                      </div>
                    </div>
                  )}

                  {selectedScan.images[selectedImageIndex]?.annotations && selectedScan.images[selectedImageIndex].annotations!.length > 0 && (
                    <div className="rounded-2xl bg-surface-card border border-sand-200 shadow-sm overflow-hidden">
                      <div className="bg-sand-50/50 border-b border-sand-100 px-5 py-3">
                        <h3 className="text-[0.7rem] font-bold uppercase tracking-widest text-sand-900">AI Annotations</h3>
                      </div>
                      <div className="p-5">
                        <div className="grid gap-3 text-sm text-sand-700">
                          {selectedScan.images[selectedImageIndex].annotations!.map((annotation, index) => (
                            <div key={index} className="flex items-start gap-3">
                              <span className={cn('inline-flex h-2.5 w-2.5 rounded-full shadow-sm mt-1 shrink-0', getAnnotationClass(annotation.color))} />
                              <span className="font-medium leading-relaxed">{annotation.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-4 flex flex-col gap-3">
                    {selectedScan.reportUrl && (
                      <div className="flex gap-3">
                        <a 
                          href={selectedScan.reportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex flex-1 items-center justify-center rounded-xl bg-nescafe px-4 py-3 text-sm font-bold text-white hover:bg-nescafe-hover shadow-sm transition no-underline text-center"
                        >
                          PDF Report (EN)
                        </a>
                        <a 
                          href={`/api/scans/${selectedScan.id}/files/report_ar.pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex flex-1 items-center justify-center rounded-xl bg-sand-100 px-4 py-3 text-sm font-bold text-sand-800 hover:bg-sand-200 transition no-underline text-center"
                        >
                          PDF Report (AR)
                        </a>
                      </div>
                    )}
                    <button 
                      onClick={() => handleDeleteScan(selectedScan.id)}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-transparent border-2 border-red-100 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 hover:border-red-200 transition"
                    >
                      Delete Scan
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-10 min-h-[500px]">
                <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mb-4">
                  <Activity className="w-8 h-8 text-sand-400" />
                </div>
                <h3 className="font-serif text-xl font-bold text-sand-900 mb-2">Select a scan</h3>
                <p className="text-sm text-sand-500 max-w-xs mx-auto">
                  Choose a scan from the list on the left to view its detailed AI analysis, annotations, and reports.
                </p>
              </div>
            )}
          </main>
        </div>

        <AnalyzeScanDrawer 
          isOpen={isAnalyzerOpen} 
          onClose={() => setIsAnalyzerOpen(false)} 
        />
      </div>
    </div>
  );
};

export default ScansPage;
