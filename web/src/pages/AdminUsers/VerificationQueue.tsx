import React, { useState } from 'react';
import { VerificationStatus } from '../../services/staffVerificationApi';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Label } from '../../components/ui/Label';
import { Textarea } from '../../components/ui/Textarea';
import { cn } from '../../lib/utils';

const DocumentPreview: React.FC<{ url: string; title: string }> = ({ url, title }) => {
  // Supabase signed URLs contain the filename before the query string
  const isPdf = url.split('?')[0].toLowerCase().endsWith('.pdf');
  
  return (
    <div className="flex flex-col gap-1 border border-sand-200 rounded-md p-2 bg-white flex-1 min-w-[250px]">
      <span className="text-xs font-semibold text-sand-600">{title}</span>
      {isPdf ? (
        <iframe 
          src={url} 
          className="w-full h-48 border-none rounded" 
          title={title}
        />
      ) : (
        <img 
          src={url} 
          alt={title} 
          className="w-full h-auto max-h-48 object-contain rounded" 
        />
      )}
      <a 
        href={url} 
        target="_blank" 
        rel="noreferrer"
        className="text-[10px] text-amber-600 hover:underline mt-1 self-start"
      >
        Open in new tab ↗
      </a>
    </div>
  );
};

export interface VerificationQueueItem {
  user_id: string;
  staff_type: 'doctor' | 'pharmacist';
  specialty: string | null;
  affiliation_name: string | null;
  national_id: string | null;
  syndicate_id: string | null;
  ministry_license: string | null;
  verification_status: VerificationStatus;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface DocumentLinks {
  governmentIdUrl: string | null;
  certificateUrl: string | null;
  selfieUrl: string | null;
}

interface VerificationQueueProps {
  queue: VerificationQueueItem[];
  loading: boolean;
  error: string | null;
  queueStatus: VerificationStatus;
  submitting: boolean;
  onStatusChange: (status: VerificationStatus) => void;
  onLoadDocuments: (userId: string) => Promise<DocumentLinks>;
  onReview: (userId: string, status: 'verified' | 'rejected', notes?: string) => Promise<void>;
}

export const VerificationQueue: React.FC<VerificationQueueProps> = React.memo(({
  queue,
  loading,
  error,
  queueStatus,
  submitting,
  onStatusChange,
  onLoadDocuments,
  onReview,
}) => {
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [documentLinks, setDocumentLinks] = useState<Record<string, DocumentLinks>>({});
  const [loadingDocs, setLoadingDocs] = useState<Record<string, boolean>>({});

  const handleNotesChange = (userId: string, value: string) => {
    setReviewNotes((prev) => ({ ...prev, [userId]: value }));
  };

  const handleLoadDocs = async (userId: string) => {
    setLoadingDocs((prev) => ({ ...prev, [userId]: true }));
    try {
      const links = await onLoadDocuments(userId);
      setDocumentLinks((prev) => ({ ...prev, [userId]: links }));
    } catch {
      // Handled silently or already handled by caller
    } finally {
      setLoadingDocs((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleReviewClick = async (userId: string, status: 'verified' | 'rejected') => {
    const notes = reviewNotes[userId]?.trim();
    await onReview(userId, status, notes);
    // Clear local state upon success
    setReviewNotes((prev) => ({ ...prev, [userId]: '' }));
  };

  const getStatusChipStyles = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return 'bg-sand-100 text-sand-800 border-sand-200/60';
      case 'under_review':
        return 'bg-sand-50 text-sand-900 border-sand-200/60';
      case 'rejected':
        return 'bg-surface-card text-sand-500 border-sand-200/60';
      case 'unverified':
        return 'bg-sand-100 text-sand-700 border-sand-200';
      default:
        return 'bg-sand-50 text-sand-800 border-sand-200';
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <CardTitle className="text-sm font-semibold text-sand-500 uppercase tracking-wider font-sans">
          Verification Queue
        </CardTitle>
        <Select
          id="queueStatusFilter"
          name="queueStatus"
          value={queueStatus}
          onChange={(e) => onStatusChange(e.target.value as VerificationStatus)}
          className="h-10 text-sm font-sans w-full sm:w-48"
        >
          <option value="under_review">Under Review</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="unverified">Unverified</option>
        </Select>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-sand-200 bg-surface-card p-3.5 text-xs text-sand-900 font-sans" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-sand-500">
            Loading verification queue...
          </div>
        ) : queue.length === 0 ? (
          <div className="py-12 text-center text-sm text-sand-500 font-sans">
            No verification requests found in this queue.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {queue.map((item) => {
              const links = documentLinks[item.user_id];
              const notes = reviewNotes[item.user_id] ?? '';
              const isRejectedDisabled = !notes.trim(); // notes are required for rejection
              const isDocLoading = loadingDocs[item.user_id];

              return (
                <div
                  key={item.user_id}
                  className="border border-sand-200/80 rounded-lg p-5 bg-surface transition-shadow hover:shadow-sm space-y-4"
                >
                  {/* Grid fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Name */}
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">
                        Name
                      </span>
                      <span className="text-sm font-medium text-sand-900">
                        {[item.first_name, item.last_name].filter(Boolean).join(' ') || '—'}
                      </span>
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">
                        Email
                      </span>
                      <span className="text-sm text-sand-600 truncate block">
                        {item.email || '—'}
                      </span>
                    </div>

                    {/* Staff Type */}
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">
                        Staff Type
                      </span>
                      <span className="text-sm text-sand-600 capitalize block">
                        {item.staff_type}
                      </span>
                    </div>

                    {/* Specialty */}
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">
                        Specialty
                      </span>
                      <span className="text-sm text-sand-600 block">
                        {item.specialty || '—'}
                      </span>
                    </div>

                    {/* Affiliation */}
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">
                        Affiliation
                      </span>
                      <span className="text-sm text-sand-600 block truncate">
                        {item.affiliation_name || '—'}
                      </span>
                    </div>

                    {/* National ID */}
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">
                        National ID
                      </span>
                      <span className="text-sm text-sand-600 block truncate">
                        {item.national_id || '—'}
                      </span>
                    </div>

                    {/* Syndicate ID */}
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">
                        Syndicate ID
                      </span>
                      <span className="text-sm text-sand-600 block truncate">
                        {item.syndicate_id || '—'}
                      </span>
                    </div>

                    {/* Ministry License */}
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">
                        Ministry License
                      </span>
                      <span className="text-sm text-sand-600 block truncate">
                        {item.ministry_license || '—'}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">
                        Verification Status
                      </span>
                      <div>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                            getStatusChipStyles(item.verification_status)
                          )}
                        >
                          {item.verification_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Review Notes Textarea */}
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor={`notes-${item.user_id}`} className="text-xs text-sand-500 font-sans">
                      Review Notes (Required to Reject)
                    </Label>
                    <Textarea
                      id={`notes-${item.user_id}`}
                      name={`notes-${item.user_id}`}
                      autoComplete="off"
                      value={notes}
                      onChange={(e) => handleNotesChange(item.user_id, e.target.value)}
                      placeholder="Add review notes or reason for approval/rejection"
                      disabled={submitting}
                      className="min-h-[70px] text-xs py-2 px-3 border-sand-200 focus:border-sand-300"
                    />
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-sand-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleLoadDocs(item.user_id)}
                      disabled={submitting || isDocLoading}
                      className="h-9 px-3 text-xs text-sand-700 border-sand-200 hover:bg-sand-50"
                    >
                      {isDocLoading ? 'Loading Documents...' : 'Load Documents'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleReviewClick(item.user_id, 'verified')}
                      disabled={submitting}
                      className="h-9 px-3 text-xs border-sand-200 text-sand-700 hover:bg-sand-50 hover:text-sand-900 disabled:opacity-50"
                    >
                      Approve Verification
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleReviewClick(item.user_id, 'rejected')}
                      disabled={submitting || isRejectedDisabled}
                      className="h-9 px-3 text-xs border-sand-200 text-sand-900 hover:bg-sand-50 disabled:opacity-50"
                    >
                      Reject Verification
                    </Button>
                  </div>

                  {/* Document Links Section (renders if documents are loaded) */}
                  {links && (
                    <div className="flex flex-col gap-2 p-3 bg-sand-50/50 border border-sand-100 rounded-lg animate-fade-in">
                      <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">
                        Loaded Documents
                      </span>
                      <div className="flex flex-wrap gap-3">
                        {links.governmentIdUrl ? (
                          <DocumentPreview url={links.governmentIdUrl} title="Government ID" />
                        ) : (
                          <span className="text-xs text-sand-400 self-center p-2 border border-dashed border-sand-200 rounded text-center">No Government ID</span>
                        )}
                        {links.certificateUrl ? (
                          <DocumentPreview url={links.certificateUrl} title="Professional Certificate" />
                        ) : (
                          <span className="text-xs text-sand-400 self-center p-2 border border-dashed border-sand-200 rounded text-center">No Certificate</span>
                        )}
                        {links.selfieUrl ? (
                          <DocumentPreview url={links.selfieUrl} title="Selfie" />
                        ) : (
                          <span className="text-xs text-sand-400 self-center p-2 border border-dashed border-sand-200 rounded text-center">No Selfie</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
