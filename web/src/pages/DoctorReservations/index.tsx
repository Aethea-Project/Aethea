import { useState, useEffect } from 'react';
import type { AddressCandidate, DoctorProfile, DoctorSchedule, ScheduleSlot } from '../../services/medicalApi';
import { useDoctorSchedules, useMarketplaceSchedules } from '../../hooks/useDoctors';
import { useScheduleSlots } from '../../hooks/useDoctors';
import { medicalApi } from '../../services/medicalApi';
import { useAuth } from '@core/auth/useAuth';
import { Modal } from '../../components/Modal';
import { cn } from '../../lib/utils';
import type { PatientHealthData } from '../../services/medicalApi';

const SLOT_BORDER_COLORS: Record<string, string> = {
  available: 'border-l-green-500',
  scheduled: 'border-l-blue-500',
  confirmed: 'border-l-blue-500',
  in_progress: 'border-l-orange-500',
  completed: 'border-l-slate-400',
  cancelled: 'border-l-red-400',
  no_show: 'border-l-red-400',
};

const SLOT_BADGE_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-900',
  completed: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-red-100 text-red-800',
};

function SlotRow({ slot, scheduleDate, onDataClick }: { slot: ScheduleSlot; scheduleDate: string; onDataClick: (reservationId: string) => void }) {
  const label = slot.patientLabel ?? 'Available';
  const start = new Date(slot.startAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const end = new Date(slot.endAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  
  // Check if within timeframe (today = reservation day)
  const now = new Date();
  const resDay = new Date(scheduleDate);
  const isSameDay = now.getFullYear() === resDay.getFullYear() && 
                    now.getMonth() === resDay.getMonth() && 
                    now.getDate() === resDay.getDate();

  const showDataButton = slot.shareHealthData && slot.reservationId && isSameDay;

  return (
    <div className={cn("flex items-center gap-4 py-2.5 px-4 rounded-lg bg-slate-50 border-l-4", SLOT_BORDER_COLORS[slot.status] || 'border-l-transparent')}>
      <span className="text-[0.85rem] text-slate-500 min-w-[120px]">{start} – {end}</span>
      <span className="flex-1 font-medium">{label}</span>
      {showDataButton && (
        <button
          onClick={() => onDataClick(slot.reservationId!)}
          className="rounded border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
        >
          View Health Data
        </button>
      )}
      <span className={cn("text-[0.75rem] capitalize py-0.5 px-2.5 rounded-full", SLOT_BADGE_COLORS[slot.status] || 'bg-slate-100 text-slate-800')}>{slot.status.replace(/_/g, ' ')}</span>
    </div>
  );
}

function PatientDataModal({ reservationId, onClose }: { reservationId: string | null; onClose: () => void }) {
  const [data, setData] = useState<PatientHealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reservationId) return;
    setLoading(true);
    medicalApi.fetchPatientDataForReservation(reservationId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to fetch patient data'))
      .finally(() => setLoading(false));
  }, [reservationId]);

  return (
    <Modal isOpen={!!reservationId} onClose={onClose} ariaLabel="Patient Health Data">
      <div className="max-w-2xl max-h-[80vh] overflow-y-auto w-full">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Patient Health Data</h2>
        
        {loading && <p className="text-slate-600">Loading patient records...</p>}
        {error && <p className="text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}
        
        {data && !loading && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="font-semibold text-slate-800 border-b pb-2 mb-3">Lab Tests ({data.labTests.length})</h3>
              {data.labTests.length === 0 ? <p className="text-sm text-slate-500">No lab tests found.</p> : (
                <div className="flex flex-col gap-2">
                  {data.labTests.map(test => (
                    <div key={test.id} className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm text-slate-900">{test.testName}</div>
                        <div className="text-xs text-slate-500">{new Date(test.date ?? Date.now()).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className={cn("text-sm font-bold", test.status !== 'normal' ? 'text-red-600' : 'text-slate-700')}>
                          {test.value} {test.unit}
                        </div>
                        <div className="text-xs text-slate-500 capitalize">{test.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold text-slate-800 border-b pb-2 mb-3">Medical Scans ({data.scans.length})</h3>
              {data.scans.length === 0 ? <p className="text-sm text-slate-500">No scans found.</p> : (
                <div className="flex flex-col gap-2">
                  {data.scans.map(scan => (
                    <div key={scan.id} className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <div className="font-medium text-sm text-slate-900">{scan.type} - {scan.bodyPart}</div>
                      <div className="text-xs text-slate-500 mb-2">{new Date(scan.date ?? Date.now()).toLocaleDateString()}</div>
                      {scan.findings && <p className="text-sm text-slate-700 bg-white p-2 border rounded">{scan.findings}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 border-b pb-2 mb-3">Health Conditions ({data.conditions.length})</h3>
              {data.conditions.length === 0 ? <p className="text-sm text-slate-500">No reported conditions.</p> : (
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                  {data.conditions.map(c => (
                    <li key={c.id}>
                      <span className="font-medium">{c.condition}</span> 
                      <span className="text-slate-400 text-xs ml-2">({new Date(c.detectedAt).toLocaleDateString()})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-sm font-semibold transition-colors">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ScheduleDetail({ scheduleId, onBack }: { scheduleId: string; onBack: () => void }) {
  const { slotView, loading, error } = useScheduleSlots(scheduleId);
  const [selectedResId, setSelectedResId] = useState<string | null>(null);

  return (
    <div className="mt-4">
      <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 mb-5" onClick={onBack}>← Back to schedules</button>
      {loading && <p className="text-sm text-slate-500">Loading slots...</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      {slotView && (
        <>
          <h3 className="text-xl font-bold text-slate-800 mb-1">{new Date(slotView.scheduleDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
          <p className="text-[0.9rem] text-slate-500 mb-4">{new Date(slotView.startAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} – {new Date(slotView.endAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · {slotView.slotDurationMins} min slots</p>
          <div className="flex flex-col gap-2">
            {slotView.slots.map((slot) => (
              <SlotRow key={slot.slotIndex} slot={slot} scheduleDate={slotView.scheduleDate} onDataClick={setSelectedResId} />
            ))}
          </div>
          <PatientDataModal reservationId={selectedResId} onClose={() => setSelectedResId(null)} />
        </>
      )}
    </div>
  );
}

interface CreateScheduleFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

function CreateScheduleForm({ onCreated, onCancel }: CreateScheduleFormProps) {
  const [form, setForm] = useState({
    scheduleDate: '',
    startAt: '',
    endAt: '',
    slotDurationMins: 30,
    isPublished: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSlotCapacity = () => {
    if (!form.startAt || !form.endAt || form.slotDurationMins <= 0) {
      return 0;
    }

    const [startHour, startMinute] = form.startAt.split(':').map(Number);
    const [endHour, endMinute] = form.endAt.split(':').map(Number);

    const startTotalMins = startHour * 60 + startMinute;
    const endTotalMins = endHour * 60 + endMinute;

    if (endTotalMins <= startTotalMins) {
      return 0;
    }

    const durationMins = endTotalMins - startTotalMins;
    return Math.floor(durationMins / form.slotDurationMins);
  };

  const slotCapacity = getSlotCapacity();
  const maxPatientsValid = slotCapacity > 0;

  const getStartAndEndMinutes = () => {
    if (!form.startAt || !form.endAt) {
      return { startTotalMins: null as number | null, endTotalMins: null as number | null };
    }

    const [startHour, startMinute] = form.startAt.split(':').map(Number);
    const [endHour, endMinute] = form.endAt.split(':').map(Number);

    return {
      startTotalMins: startHour * 60 + startMinute,
      endTotalMins: endHour * 60 + endMinute,
    };
  };

  const { startTotalMins, endTotalMins } = getStartAndEndMinutes();
  const hasTimeRange = startTotalMins !== null && endTotalMins !== null;
  const endAfterStart = hasTimeRange && endTotalMins! > startTotalMins!;

  const validationReasons: string[] = [];
  if (hasTimeRange && !endAfterStart) {
    validationReasons.push('End time must be after start time.');
  }
  if (endAfterStart && slotCapacity === 0) {
    validationReasons.push('Current time range with this slot duration creates 0 bookable slots.');
  }
  if (!form.isPublished) {
    validationReasons.push('Schedule is draft only. Patients cannot see or book it until published.');
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked
               : type === 'number' ? Number(value)
               : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.scheduleDate || !form.startAt || !form.endAt) return;

    if (slotCapacity === 0) {
      setError('End time must be after start time and long enough to fit at least one slot.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const [year, month, day] = form.scheduleDate.split('-').map(Number);
      const [startHour, startMinute] = form.startAt.split(':').map(Number);
      const [endHour, endMinute] = form.endAt.split(':').map(Number);

      const dtStart = new Date(year, month - 1, day, startHour, startMinute, 0, 0);
      const dtEnd = new Date(year, month - 1, day, endHour, endMinute, 0, 0);

      await medicalApi.createMySchedule({
        scheduleDate: form.scheduleDate,
        startAt: dtStart.toISOString(),
        endAt: dtEnd.toISOString(),
        slotDurationMins: form.slotDurationMins,
        maxPatients: slotCapacity, // Automatically set max patients to available time slots
        isPublished: form.isPublished,
      });
      onCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create schedule';
      if (message.includes('endAt must be after startAt')) {
        setError('End time must be later than start time. Please adjust the selected period.');
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="bg-white border border-slate-200 rounded-xl p-6 mb-6 flex flex-col gap-4" onSubmit={handleSubmit}>
      <h3 className="text-lg font-bold text-slate-800 m-0">Create New Schedule</h3>
      <label className="flex flex-col gap-1.5 text-[0.9rem] font-medium text-slate-800">
        Date
        <input
          className="p-2 border border-slate-200 rounded-md text-[0.95rem] w-full"
          type="date"
          name="scheduleDate"
          value={form.scheduleDate}
          min={new Date().toISOString().split('T')[0]}
          onChange={handleChange}
          required
        />
      </label>
      <label className="flex flex-col gap-1.5 text-[0.9rem] font-medium text-slate-800">
        Start Time
        <input
          className="p-2 border border-slate-200 rounded-md text-[0.95rem] w-full"
          type="time"
          name="startAt"
          value={form.startAt}
          onChange={handleChange}
          required
        />
      </label>
      <label className="flex flex-col gap-1.5 text-[0.9rem] font-medium text-slate-800">
        End Time
        <input
          className="p-2 border border-slate-200 rounded-md text-[0.95rem] w-full"
          type="time"
          name="endAt"
          value={form.endAt}
          onChange={handleChange}
          required
        />
      </label>
      <label className="flex flex-col gap-1.5 text-[0.9rem] font-medium text-slate-800">
        Slot Duration (minutes)
        <input
          className="p-2 border border-slate-200 rounded-md text-[0.95rem] w-full"
          type="number"
          name="slotDurationMins"
          value={form.slotDurationMins}
          onChange={handleChange}
          min={10}
          max={120}
          required
        />
      </label>
      <p className="m-0 -mt-1 text-[0.92rem] text-slate-600">
        Calculated available slots: <strong>{slotCapacity > 0 ? slotCapacity : 'Invalid time range'}</strong>
      </p>
      {validationReasons.length > 0 && (
        <div className="border border-red-200 bg-red-50 text-red-900 rounded-lg py-2.5 px-3.5" role="alert">
          <strong className="block mb-1.5">Please review before creating:</strong>
          <ul className="m-0 pl-4 list-disc">
            {validationReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      <label className="flex items-center gap-2 text-[0.95rem] text-slate-700 cursor-pointer">
        <input type="checkbox" name="isPublished" checked={form.isPublished} onChange={handleChange} />
        Publish immediately
      </label>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex gap-2 justify-end mt-2 pt-4 border-t border-slate-100">
        <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50" onClick={onCancel}>Cancel</button>
        <button type="submit" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled={submitting || !maxPatientsValid}>{submitting ? 'Creating...' : 'Create Schedule'}</button>
      </div>
    </form>
  );
}

function ScheduleCard({ schedule, onView, onDelete }: { schedule: DoctorSchedule; onView: (id: string) => void; onDelete: (id: string, reason: string) => void }) {
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');
  
  const date = new Date(schedule.scheduleDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const start = new Date(schedule.startAt).toLocaleTimeString('en-US', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' });
  const end = new Date(schedule.endAt).toLocaleTimeString('en-US', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' });
  const available = schedule.maxPatients - schedule.bookedCount;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-slate-800">{date}</span>
        <span className="text-[0.9rem] text-slate-500">{start} – {end} (Cairo Time)</span>
        <span className="text-[0.85rem] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">{available}/{schedule.maxPatients} slots available</span>
        {!schedule.isPublished && <span className="text-[0.75rem] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">Draft</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50" onClick={() => onView(schedule.id)}>View Slots</button>
        <button className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:border-red-300" onClick={() => setShowCancel(true)}>Cancel Schedule</button>
      </div>

      <Modal isOpen={showCancel} onClose={() => setShowCancel(false)} ariaLabel="Cancel Schedule">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Cancel Schedule</h2>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4 text-red-700">
          <strong>Warning:</strong> You are about to cancel this schedule. All booked patients will be notified. Frequent unexcused cancellations will be reviewed by administration and may result in penalties or account suspension.
        </div>
        <p className="mb-4 text-slate-500">
          Please provide a reason for the cancellation. This reason will be sent to all patients who have reservations on this schedule.
        </p>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700">Cancellation Reason *</label>
          <textarea
            className="w-full p-2 border border-slate-200 rounded-md bg-white"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Unexpected personal emergency"
            rows={3}
          />
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50" onClick={() => setShowCancel(false)}>Keep Schedule</button>
          <button
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!reason.trim()}
            onClick={() => {
              if (!reason.trim()) return;
              onDelete(schedule.id, reason.trim());
              setShowCancel(false);
            }}
          >
            Confirm Cancellation
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ClinicLocationEditor({
  profile,
  onSaved,
}: {
  profile: DoctorProfile;
  onSaved: (profile: DoctorProfile) => void;
}) {
  const [clinicName, setClinicName] = useState(profile.clinicName ?? '');
  const [address, setAddress] = useState(profile.address ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [consultFee, setConsultFee] = useState(profile.consultFee?.toString() ?? '');
  const [searchText, setSearchText] = useState(profile.address ?? '');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<AddressCandidate[]>([]);

  useEffect(() => {
    setClinicName(profile.clinicName ?? '');
    setAddress(profile.address ?? '');
    setCity(profile.city ?? '');
    setConsultFee(profile.consultFee?.toString() ?? '');
    setSearchText(profile.address ?? '');
    setCandidates([]);
    setSuccess(null);
    setError(null);
  }, [profile]);

  const runSearch = async () => {
    if (!searchText.trim()) {
      setCandidates([]);
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const items = await medicalApi.searchAddressCandidates(searchText.trim(), 5);
      setCandidates(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search addresses');
    } finally {
      setSearching(false);
    }
  };

  const resolveCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.');
      return;
    }

    setSearching(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const candidate = await medicalApi.reverseGeocode(position.coords.latitude, position.coords.longitude);
          if (!candidate) {
            setError('Could not resolve your location to an address.');
            return;
          }

          setAddress(candidate.formattedAddress);
          setCity(candidate.city ?? city);
          setSearchText(candidate.formattedAddress);
          setCandidates([]);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to resolve location');
        } finally {
          setSearching(false);
        }
      },
      (geoError) => {
        setError(geoError.message || 'Could not read your current location');
        setSearching(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const saveLocation = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await medicalApi.upsertMyDoctorProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        specialty: profile.specialty,
        bio: profile.bio ?? undefined,
        clinicName: clinicName.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        consultFee: consultFee ? parseInt(consultFee, 10) : undefined,
        languages: profile.languages.length > 0 ? profile.languages : undefined,
      });

      onSaved(updated);
      setSuccess('Clinic location updated successfully.');
      setCandidates([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save clinic location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="border border-emerald-100 rounded-xl p-4 bg-white mb-4" aria-labelledby="clinic-location-title">
      <div className="mb-4">
        <h3 id="clinic-location-title" className="m-0 text-emerald-900 font-semibold">Clinic Location</h3>
        <p className="mt-1 text-sm text-slate-600">Set your clinic address so patients can navigate to your reservation location.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mt-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800">
          Clinic Name
          <input
            className="h-11 px-3 border border-slate-200 rounded-lg"
            value={clinicName}
            onChange={(event) => setClinicName(event.target.value)}
            placeholder="Clinic or hospital name"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800">
          City
          <input
            className="h-11 px-3 border border-slate-200 rounded-lg"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="City"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800">
          Consultation Fee (EGP)
          <input
            className="h-11 px-3 border border-slate-200 rounded-lg"
            type="number"
            min="0"
            value={consultFee}
            onChange={(event) => setConsultFee(event.target.value)}
            placeholder="e.g. 500"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800 mt-3">
        Clinic Address
        <input
          className="h-11 px-3 border border-slate-200 rounded-lg"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Street, district, city"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          className="flex-1 min-w-[220px] h-11 px-3 border border-slate-200 rounded-lg"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search exact address"
        />
        <button type="button" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => void runSearch()} disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </button>
        <button type="button" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => void resolveCurrentLocation()} disabled={searching}>
          Use Current Location
        </button>
      </div>

      {candidates.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-2" role="listbox" aria-label="Address suggestions">
          {candidates.map((candidate) => (
            <button
              type="button"
              key={candidate.placeId}
              className="text-left border border-emerald-100 rounded-lg bg-slate-50 p-2.5 hover:bg-slate-100 transition-colors flex flex-col gap-0.5"
              onClick={() => {
                setAddress(candidate.formattedAddress);
                setCity(candidate.city ?? city);
                setSearchText(candidate.formattedAddress);
                setCandidates([]);
              }}
            >
              <strong className="text-sm text-slate-900">{candidate.formattedAddress}</strong>
              <span className="text-xs text-slate-500">{candidate.city ?? 'Unknown city'}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      {success && <p className="mt-2 text-emerald-700 font-semibold">{success}</p>}

      <div className="mt-3 flex justify-end">
        <button type="button" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => void saveLocation()} disabled={saving}>
          {saving ? 'Saving...' : 'Save Clinic Location'}
        </button>
      </div>
    </section>
  );
}

export default function DoctorReservationsPage() {
  const { session, user, profile } = useAuth();
  
  // Resolve account type at page level to stay aligned with route guards in App.tsx.
  const tokenType = session?.user?.app_metadata?.account_type 
                 || session?.user?.user_metadata?.account_type 
                 || undefined;
  const accountType = profile?.accountType || tokenType;
  
  const isAdminReadonly = accountType === 'admin';

  const {
    posts: adminPosts,
    loading: adminLoading,
    error: adminError,
  } = useMarketplaceSchedules({ page: 1, limit: 100 }, isAdminReadonly);

  // Load the authenticated doctor's profile ID first, then request schedules.
  const [profileId, setProfileId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<DoctorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);

  const [viewingScheduleId, setViewingScheduleId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Fetch own profile on mount
  useEffect(() => {
    medicalApi.fetchMyDoctorProfile()
      .then((profile) => {
        setProfileId(profile.id);
        setMyProfile(profile);
        setProfileLoading(false);
      })
      .catch((err) => { setProfileError(err instanceof Error ? err.message : 'Could not load your doctor profile.'); setProfileLoading(false); });
  }, []);

  const handleCreateProfile = async () => {
    const emailPrefix = user?.email?.split('@')[0] ?? 'doctor';
    const safeName = emailPrefix.replace(/[^a-zA-Z]/g, ' ').trim() || 'Doctor';
    const [first = 'Doctor', ...rest] = safeName.split(/\s+/);
    const last = rest.length > 0 ? rest.join(' ') : 'Account';

    setCreatingProfile(true);
    setProfileError(null);
    try {
      const profile = await medicalApi.upsertMyDoctorProfile({
        firstName: first.slice(0, 50),
        lastName: last.slice(0, 50),
        specialty: 'General Practice',
        bio: 'Auto-created profile for schedule posting.',
        clinicName: 'Aethea Clinic',
        city: 'Cairo',
        consultFee: 0,
        languages: ['Arabic', 'English'],
      });
      setProfileId(profile.id);
      setMyProfile(profile);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not create your doctor profile.');
    } finally {
      setCreatingProfile(false);
    }
  };

  const { schedules, loading: schedulesLoading, error: schedulesError, refresh } = useDoctorSchedules(profileId ?? '');

  if (isAdminReadonly) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-5">Availability Manager</h1>
        {adminError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{adminError}</p>}
        {adminLoading ? (
          <p className="text-sm text-slate-500">Loading availability posts...</p>
        ) : adminPosts.length === 0 ? (
          <p className="text-sm text-slate-500">No published availability posts yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {adminPosts.map((post) => (
              <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 flex flex-col gap-3" key={post.schedule.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-slate-800">
                    {new Date(post.schedule.scheduleDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-[0.9rem] text-slate-500">
                    Dr. {post.doctor.firstName} {post.doctor.lastName} · {post.doctor.specialty}
                  </span>
                  <span className="text-[0.85rem] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
                    {post.schedule.maxPatients - post.schedule.bookedCount}/{post.schedule.maxPatients} slots available
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (profileLoading) return <div className="mx-auto max-w-[900px] px-6 py-6"><p className="text-sm text-slate-500">Loading profile...</p></div>;
  if (profileError) return (
    <div className="mx-auto max-w-[900px] px-6 py-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-5">Availability Manager</h1>
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{profileError}</p>
      <p className="mt-2 text-sm text-slate-600">Make sure your doctor profile is set up before managing schedules.</p>
      <div className="flex justify-end mb-6">
        <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => void handleCreateProfile()} disabled={creatingProfile}>
          {creatingProfile ? 'Creating profile...' : 'Create Doctor Profile'}
        </button>
      </div>
    </div>
  );

  if (viewingScheduleId) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-5">Availability Manager</h1>
        <ScheduleDetail scheduleId={viewingScheduleId} onBack={() => setViewingScheduleId(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-5">Availability Manager</h1>

      {myProfile && (
        <ClinicLocationEditor
          profile={myProfile}
          onSaved={(updatedProfile) => {
            setMyProfile(updatedProfile);
          }}
        />
      )}

      <div className="flex justify-end mb-6">
        <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700" onClick={() => setShowCreate(true)}>+ New Schedule</button>
      </div>

      {showCreate && (
        <CreateScheduleForm
          onCreated={() => { setShowCreate(false); refresh(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {schedulesError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{schedulesError}</p>}

      {schedulesLoading ? (
        <p className="text-sm text-slate-500">Loading schedules...</p>
      ) : schedules.length === 0 ? (
        <p className="text-sm text-slate-500">No schedules yet. Create one to get started.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {schedules.map((sch) => (
            <ScheduleCard key={sch.id} schedule={sch} onView={setViewingScheduleId} onDelete={async (id, reason) => {
              try {
                await medicalApi.deleteMySchedule(id, reason);
                refresh();
              } catch (err) {
                alert('Failed to delete: ' + (err instanceof Error ? err.message : 'Unknown error'));
              }
            }} />
          ))}
        </div>
      )}
    </div>
  );
}