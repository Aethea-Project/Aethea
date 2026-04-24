/**
 * Medical Scans Page - Web
 * Grid view for medical scans with filters, zoom modal, and comparison features
 */

import { useMemo, useState } from 'react';
import type { MedicalScan, ScanStatus, ScanType } from '@core/types/medical';
import { useScans } from '../../hooks/useScans';
import { FeatureHeader } from '../../components/FeatureHeader';
import { Modal } from '../../components/Modal';
import { imageAssets } from '../../constants/imageAssets';
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
  gray: 'bg-slate-400',
  '#64748b': 'bg-slate-500',
};

const getAnnotationClass = (value?: string) => {
  const key = (value ?? '').toLowerCase();
  return ANNOTATION_COLOR_CLASSES[key] ?? 'bg-slate-400';
};

const formatStatus = (value: string) => value.replace(/_/g, ' ');

const ScansPage = () => {
  const { scans, loading, error } = useScans();
  const [selectedScan, setSelectedScan] = useState<MedicalScan | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [filterType, setFilterType] = useState<ScanType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ScanStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'type'>('date');

  const filteredScans = useMemo(() => {
    return scans
      .filter((scan) => filterType === 'all' || scan.type === filterType)
      .filter((scan) => filterStatus === 'all' || scan.status === filterStatus)
      .sort((a, b) => {
        if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'priority') {
          const priorityOrder = { emergency: 3, urgent: 2, routine: 1 } as const;
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return a.type.localeCompare(b.type);
      });
  }, [scans, filterType, filterStatus, sortBy]);

  const handleScanClick = (scan: MedicalScan) => {
    setSelectedScan(scan);
    setSelectedImageIndex(0);
  };

  const closeModal = () => {
    setSelectedScan(null);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <p className="text-slate-700">Loading scans...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">Failed to load scans: {error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-6 pb-10 pt-6">
      <FeatureHeader
        title="Medical Scans"
        subtitle="View and manage your medical imaging results"
        variant="scan"
        imageSrc={imageAssets.headers.scan}
        imageAlt="MRI and CT scan equipment"
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="grid gap-6">
          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
              <div className="font-['Fraunces'] text-[1.75rem] font-bold text-slate-900">{scans.length}</div>
              <div className="mt-1 text-[0.78rem] text-slate-500">Total Scans</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
              <div className="font-['Fraunces'] text-[1.75rem] font-bold text-slate-900">{scans.filter((scan) => scan.status === 'completed').length}</div>
              <div className="mt-1 text-[0.78rem] text-slate-500">Completed</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
              <div className="font-['Fraunces'] text-[1.75rem] font-bold text-slate-900">{scans.filter((scan) => scan.priority === 'urgent' || scan.priority === 'emergency').length}</div>
              <div className="mt-1 text-[0.78rem] text-slate-500">High Priority</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm grid gap-4">
            <h3 className="text-sm font-semibold text-slate-900">Filters</h3>

            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sort By</label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'priority' | 'type')}
              >
                <option value="date">Most Recent</option>
                <option value="priority">Priority</option>
                <option value="type">Type</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scan Type</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                    filterType === 'all'
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                  onClick={() => setFilterType('all')}
                >
                  All Types
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                    filterType === 'X-Ray'
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                  onClick={() => setFilterType('X-Ray')}
                >
                  X-Ray
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                    filterType === 'CT Scan'
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                  onClick={() => setFilterType('CT Scan')}
                >
                  CT Scan
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                    filterType === 'MRI'
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                  onClick={() => setFilterType('MRI')}
                >
                  MRI
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                    filterStatus === 'all'
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                  onClick={() => setFilterStatus('all')}
                >
                  All Status
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                    filterStatus === 'completed'
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                  onClick={() => setFilterStatus('completed')}
                >
                  Completed
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                    filterStatus === 'pending'
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                  onClick={() => setFilterStatus('pending')}
                >
                  Pending
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredScans.map((scan) => (
              <button
                key={scan.id}
                type="button"
                className="text-left rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition hover:shadow-md"
                onClick={() => handleScanClick(scan)}
              >
                <div className="grid grid-cols-2 gap-1 bg-slate-100">
                  {scan.images.slice(0, 4).map((image, index) => (
                    <div key={image.id} className="relative h-24 sm:h-28 overflow-hidden">
                      <img
                        src={image.url}
                        alt={image.caption || scan.type}
                        className="h-full w-full object-cover"
                      />
                      {index === 3 && scan.images.length > 4 && (
                        <div className="absolute inset-0 bg-slate-900/70 text-white text-base font-semibold flex items-center justify-center">
                          +{scan.images.length - 4}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-4 grid gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{scan.type}</h3>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase',
                        PRIORITY_BADGE_CLASSES[scan.priority] || 'border-slate-200 bg-slate-100 text-slate-600',
                      )}
                    >
                      {scan.priority}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600">{scan.bodyPart}</p>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{new Date(scan.date).toLocaleDateString()}</span>
                    <div className="flex items-center gap-3">
                      <span>{scan.images.length} images</span>
                      <span className={cn('font-semibold', STATUS_TEXT_CLASSES[scan.status] || 'text-slate-500')}>
                        {formatStatus(scan.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredScans.length === 0 && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
              No scans found matching your filters.
            </div>
          )}
        </main>
      </div>

      <Modal
        isOpen={!!selectedScan}
        onClose={closeModal}
        contentClassName="w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        ariaLabel="Scan details"
      >
        {selectedScan && (
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <img
                  src={selectedScan.images[selectedImageIndex].url}
                  alt={selectedScan.images[selectedImageIndex].caption || selectedScan.type}
                  className="w-full max-h-[420px] rounded-xl object-cover"
                />
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{selectedScan.images[selectedImageIndex].caption || 'Scan image'}</span>
                  <span>{selectedImageIndex + 1} / {selectedScan.images.length}</span>
                </div>
              </div>

              {selectedScan.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {selectedScan.images.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={cn(
                        'rounded-lg border transition',
                        index === selectedImageIndex
                          ? 'border-teal-500 ring-2 ring-teal-200'
                          : 'border-transparent hover:border-slate-200',
                      )}
                    >
                      <img
                        src={image.url}
                        alt={image.caption || 'Scan image'}
                        className="h-20 w-24 rounded-lg object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 grid gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedScan.type}</h2>
                <p className="text-sm text-slate-500">{selectedScan.bodyPart}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase',
                    PRIORITY_BADGE_CLASSES[selectedScan.priority] || 'border-slate-200 bg-slate-100 text-slate-600',
                  )}
                >
                  {selectedScan.priority.toUpperCase()}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase',
                    STATUS_BADGE_CLASSES[selectedScan.status] || 'border-slate-200 bg-slate-100 text-slate-600',
                  )}
                >
                  {formatStatus(selectedScan.status).toUpperCase()}
                </span>
              </div>

              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-medium text-slate-900">{new Date(selectedScan.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Radiologist:</span>
                  <span className="font-medium text-slate-900">{selectedScan.radiologist}</span>
                </div>
              </div>

              {selectedScan.findings && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Findings</h3>
                  <p className="mt-1 text-sm text-slate-600">{selectedScan.findings}</p>
                </div>
              )}

              {selectedScan.images[selectedImageIndex].annotations && selectedScan.images[selectedImageIndex].annotations!.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Annotations</h3>
                  <div className="mt-2 grid gap-2 text-sm text-slate-600">
                    {selectedScan.images[selectedImageIndex].annotations!.map((annotation, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className={cn('inline-flex h-2.5 w-2.5 rounded-full', getAnnotationClass(annotation.color))} />
                        <span>{annotation.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
                  Download Report
                </button>
                <button className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Share
                </button>
                <button className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Print
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScansPage;
