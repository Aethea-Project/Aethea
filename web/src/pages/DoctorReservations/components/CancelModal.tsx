import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import type { DoctorSchedule } from '../../../services/medicalApi';

interface CancelModalProps {
  deletingId: string | null;
  selectedScheduleForDelete: DoctorSchedule | undefined;
  activeReservationsCount: number;
  deleteReason: string;
  setDeleteReason: (reason: string) => void;
  deleteError: string | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CancelModal = React.memo(function CancelModal({
  deletingId,
  selectedScheduleForDelete,
  activeReservationsCount,
  deleteReason,
  setDeleteReason,
  deleteError,
  deleting,
  onClose,
  onConfirm,
}: CancelModalProps) {
  if (!deletingId) return null;

  const getScheduleStatus = (isPublished: boolean) => {
    if (!isPublished) return { isDraft: true, label: 'Draft' };
    return { isDraft: false, label: 'Live' };
  };

  const isDraft = selectedScheduleForDelete ? getScheduleStatus(selectedScheduleForDelete.isPublished).isDraft : false;

  return (
    <div className="fixed inset-0 bg-sand-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg border border-sand-200 shadow-sm max-w-md w-full p-6 space-y-4">
        <div>
          <h3 className="text-lg font-serif font-medium text-sand-900">
            {selectedScheduleForDelete && isDraft ? 'Delete Draft Schedule?' : 'Cancel Scheduled Day?'}
          </h3>
          <p className="text-xs text-sand-500 mt-1">
            {selectedScheduleForDelete && isDraft
              ? 'This schedule is in Draft state and is hidden from patients. Deleting it now is completely silent and has zero patient impact.'
              : 'This schedule is active and live. Deleting it will permanently cancel all slots on this date and automatically notify booked patients.'}
          </p>
        </div>

        {activeReservationsCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 font-semibold leading-relaxed">
            ⚠️ Warning: There are {activeReservationsCount} active patient booking(s) on this date.
            Canceling will automatically issue email/in-app alert warnings to all affected patients.
          </div>
        )}

        {!selectedScheduleForDelete || !isDraft ? (
          <div className="space-y-1.5">
            <Label className="text-xs">Cancellation Reason (Sent to Patients)</Label>
            <Input
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g. Doctor out of town, clinic maintenance"
              required
              className="h-12"
            />
          </div>
        ) : null}

        {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}

        <div className="flex gap-2 justify-end pt-3 border-t border-sand-200">
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            Go Back
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            onClick={onConfirm}
            disabled={deleting || (!isDraft && !deleteReason.trim())}
          >
            {deleting ? 'Deleting...' : 'Confirm Cancellation'}
          </Button>
        </div>
      </div>
    </div>
  );
});
