import React, { useState } from 'react';
import type { DoctorProfile, DoctorSchedule } from '../../services/medicalApi';
import { useDoctorSchedules } from '../../hooks/useDoctors';
import { useReservations } from '../../hooks/useReservations';
import { cn } from '../../lib/utils';

interface BookingModalProps {
  doctor: DoctorProfile;
  onClose: () => void;
  onBooked: () => void;
}

const ghostBtnClass = 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50';
const primaryBtnClass = 'rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed';

export const BookingModal: React.FC<BookingModalProps> = ({ doctor, onClose, onBooked }) => {
  const { schedules, loading: schedulesLoading, error: schedulesError } = useDoctorSchedules(doctor.id);
  const { book } = useReservations();

  const [selectedSchedule, setSelectedSchedule] = useState<DoctorSchedule | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [shareHealthData, setShareHealthData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule || selectedSlotIndex === null || !reason.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await book({
        doctorScheduleId: selectedSchedule.id,
        slotIndex: selectedSlotIndex,
        reason: reason.trim(),
        shareHealthData,
      });
      onBooked();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

  const formatTime = (isoStr: string) =>
    new Date(isoStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col gap-4">
      <h3 className="m-0 text-lg font-bold text-slate-900">Book with Dr. {doctor.firstName} {doctor.lastName}</h3>
      <p className="m-0 text-sm text-slate-500">{doctor.specialty}</p>

      {schedulesLoading && <p className="text-sm text-slate-500">Loading available schedules...</p>}
      {schedulesError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{schedulesError}</p>
      )}

      {!schedulesLoading && schedules.length === 0 && (
        <p className="text-sm text-slate-500">No published schedules available at this time.</p>
      )}

      {!schedulesLoading && schedules.length > 0 && (
        <>
          {/* ── Schedule picker ────────── */}
          <div className="flex flex-col gap-2">
            <h4 className="m-0 text-sm font-semibold text-slate-800">Select a Date</h4>
            {schedules.map((sch) => {
              const full = sch.bookedSlotIndexes.length >= sch.maxPatients;
              return (
                <button
                  key={sch.id}
                  type="button"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                    selectedSchedule?.id === sch.id
                      ? 'border-teal-600 bg-teal-50 text-teal-800 font-semibold'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                    full && 'opacity-50 cursor-not-allowed',
                  )}
                  disabled={full}
                  onClick={() => {
                    setSelectedSchedule(sch);
                    setSelectedSlotIndex(null);
                  }}
                >
                  {formatDate(sch.scheduleDate)} — {formatTime(sch.startAt)} to {formatTime(sch.endAt)}
                  <span className="ml-2 text-xs text-slate-500">
                    {full ? ' (Full)' : ` (${sch.maxPatients - sch.bookedSlotIndexes.length} slots left)`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Slot picker ────────────── */}
          {selectedSchedule && (
            <div className="flex flex-col gap-2">
              <h4 className="m-0 text-sm font-semibold text-slate-800">
                Availability ({selectedSchedule.slotDurationMins} min per slot)
              </h4>
              {selectedSchedule.bookedSlotIndexes.length >= selectedSchedule.maxPatients ? (
                <p className="text-sm text-red-600">This schedule is fully booked.</p>
              ) : (
                <>
                  <p className="text-xs text-slate-500">
                    {selectedSchedule.maxPatients - selectedSchedule.bookedSlotIndexes.length} slot(s) available — select a time below.
                  </p>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                    {Array.from({ length: selectedSchedule.maxPatients }, (_, slotIndex) => {
                      const slotStart = new Date(new Date(selectedSchedule.startAt).getTime() + slotIndex * selectedSchedule.slotDurationMins * 60_000);
                      const slotEnd = new Date(slotStart.getTime() + selectedSchedule.slotDurationMins * 60_000);
                      const isBooked = selectedSchedule.bookedSlotIndexes.includes(slotIndex);
                      const isSelected = selectedSlotIndex === slotIndex;
                      return (
                        <button
                          key={slotIndex}
                          type="button"
                          className={cn(
                            'rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors',
                            isSelected
                              ? 'border-teal-600 bg-teal-50 text-teal-800'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                            isBooked && 'opacity-40 line-through cursor-not-allowed',
                          )}
                          disabled={isBooked}
                          onClick={() => setSelectedSlotIndex(slotIndex)}
                          title={isBooked ? 'Booked' : 'Available'}
                        >
                          {slotStart.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {slotEnd.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          {isBooked ? ' (Booked)' : ''}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Booking form ───────────── */}
          {selectedSchedule && selectedSchedule.bookedSlotIndexes.length < selectedSchedule.maxPatients && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-slate-200 pt-4">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">
                Reason for visit *
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="Brief description of your visit reason"
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-100"
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareHealthData}
                  onChange={(e) => setShareHealthData(e.target.checked)}
                  className="h-4 w-4 accent-teal-600"
                />
                Share my health records with this doctor
              </label>

              {submitError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{submitError}</p>
              )}

              {selectedSlotIndex === null && (
                <p className="text-xs text-amber-700">Select a slot time before confirming booking.</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className={ghostBtnClass} onClick={onClose}>Cancel</button>
                <button type="submit" className={primaryBtnClass} disabled={submitting || !reason.trim() || selectedSlotIndex === null}>
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {!selectedSchedule && !schedulesLoading && schedules.length > 0 && (
        <div className="flex justify-end pt-2">
          <button type="button" className={ghostBtnClass} onClick={onClose}>Close</button>
        </div>
      )}
    </div>
  );
};