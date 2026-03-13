import React, { useState } from 'react';
import type { DoctorProfile, DoctorSchedule } from '../../services/medicalApi';
import { useDoctorSchedules } from '../../hooks/useDoctors';
import { useReservations } from '../../hooks/useReservations';

interface BookingModalProps {
  doctor: DoctorProfile;
  onClose: () => void;
  onBooked: () => void;
}

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
    <div className="booking-form">
      <h3>Book with Dr. {doctor.firstName} {doctor.lastName}</h3>
      <p className="booking-specialty">{doctor.specialty}</p>

      {schedulesLoading && <p>Loading available schedules...</p>}
      {schedulesError && <p className="error">{schedulesError}</p>}

      {!schedulesLoading && schedules.length === 0 && (
        <p>No published schedules available at this time.</p>
      )}

      {!schedulesLoading && schedules.length > 0 && (
        <>
          <div className="schedule-list">
            <h4>Select a Date</h4>
            {schedules.map((sch) => {
              const full = sch.bookedSlotIndexes.length >= sch.maxPatients;
              return (
                <button
                  key={sch.id}
                  type="button"
                  className={`schedule-option${selectedSchedule?.id === sch.id ? ' active' : ''}`}
                  disabled={full}
                  onClick={() => {
                    setSelectedSchedule(sch);
                    setSelectedSlotIndex(null);
                  }}
                >
                  {formatDate(sch.scheduleDate)} — {formatTime(sch.startAt)} to {formatTime(sch.endAt)}
                  <span className="slot-count">
                    {full ? ' (Full)' : ` (${sch.maxPatients - sch.bookedSlotIndexes.length} slots left)`}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedSchedule && (
            <div className="slot-selection">
              <h4>Availability ({selectedSchedule.slotDurationMins} min per slot)</h4>
              {selectedSchedule.bookedSlotIndexes.length >= selectedSchedule.maxPatients ? (
                <p className="slot-full">This schedule is fully booked.</p>
              ) : (
                <>
                  <p className="slot-available">
                    {selectedSchedule.maxPatients - selectedSchedule.bookedSlotIndexes.length} slot(s) available — select a time below.
                  </p>
                  <div className="time-slots">
                    {Array.from({ length: selectedSchedule.maxPatients }, (_, slotIndex) => {
                      const slotStart = new Date(new Date(selectedSchedule.startAt).getTime() + slotIndex * selectedSchedule.slotDurationMins * 60_000);
                      const slotEnd = new Date(slotStart.getTime() + selectedSchedule.slotDurationMins * 60_000);
                      const isBooked = selectedSchedule.bookedSlotIndexes.includes(slotIndex);
                      const isSelected = selectedSlotIndex === slotIndex;
                      return (
                        <button
                          key={slotIndex}
                          type="button"
                          className={`time-slot-btn${isSelected ? ' selected' : ''}`}
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

          {selectedSchedule && selectedSchedule.bookedSlotIndexes.length < selectedSchedule.maxPatients && (
            <form onSubmit={handleSubmit} className="booking-fields">
              <label>
                Reason for visit *
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="Brief description of your visit reason"
                />
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={shareHealthData}
                  onChange={(e) => setShareHealthData(e.target.checked)}
                />
                Share my health records with this doctor
              </label>

              {submitError && <p className="error">{submitError}</p>}

              {selectedSlotIndex === null && <p className="error">Select a slot time before confirming booking.</p>}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="book-btn" disabled={submitting || !reason.trim() || selectedSlotIndex === null}>
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {!selectedSchedule && !schedulesLoading && schedules.length > 0 && (
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      )}
    </div>
  );
};