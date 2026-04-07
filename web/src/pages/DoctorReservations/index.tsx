import { useState, useEffect } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import type { AddressCandidate, DoctorProfile, DoctorSchedule, ScheduleSlot } from '../../services/medicalApi';
import { useDoctorSchedules, useMarketplaceSchedules } from '../../hooks/useDoctors';
import { useScheduleSlots } from '../../hooks/useDoctors';
import { medicalApi } from '../../services/medicalApi';
import { useAuth } from '@core/auth/useAuth';
import { Modal } from '../../components/Modal';
import './styles.css';

function SlotRow({ slot }: { slot: ScheduleSlot }) {
  const label = slot.patientLabel ?? 'Available';
  const start = new Date(slot.startAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const end = new Date(slot.endAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return (
    <div className={`dr-slot-row dr-slot-${slot.status}`}>
      <span className="dr-slot-time">{start} – {end}</span>
      <span className="dr-slot-label">{label}</span>
      <span className={`dr-slot-status dr-status-${slot.status}`}>{slot.status.replace(/_/g, ' ')}</span>
    </div>
  );
}

function ScheduleDetail({ scheduleId, onBack }: { scheduleId: string; onBack: () => void }) {
  const { slotView, loading, error } = useScheduleSlots(scheduleId);
  return (
    <div className="dr-schedule-detail">
      <button className="btn btn-ghost dr-back-btn" onClick={onBack}>← Back to schedules</button>
      {loading && <p className="loading">Loading slots...</p>}
      {error && <p className="error">{error}</p>}
      {slotView && (
        <>
          <h3>{new Date(slotView.scheduleDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
          <p className="dr-schedule-meta">{new Date(slotView.startAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} – {new Date(slotView.endAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · {slotView.slotDurationMins} min slots</p>
          <div className="dr-slot-list">
            {slotView.slots.map((slot) => (
              <SlotRow key={slot.slotIndex} slot={slot} />
            ))}
          </div>
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
    <form className="dr-create-form" onSubmit={handleSubmit}>
      <h3>Create New Schedule</h3>
      <label>
        Date
        <input type="date" name="scheduleDate" value={form.scheduleDate} min={new Date().toISOString().split('T')[0]} onChange={handleChange} required />
      </label>
      <label>
        Start Time
        <input type="time" name="startAt" value={form.startAt} onChange={handleChange} required />
      </label>
      <label>
        End Time
        <input type="time" name="endAt" value={form.endAt} onChange={handleChange} required />
      </label>
      <label>
        Slot Duration (minutes)
        <input type="number" name="slotDurationMins" value={form.slotDurationMins} onChange={handleChange} min={10} max={120} required />
      </label>
      <p className="dr-create-helper">
        Calculated available slots: <strong>{slotCapacity > 0 ? slotCapacity : 'Invalid time range'}</strong>
      </p>
      {validationReasons.length > 0 && (
        <div className="dr-create-warnings" role="alert">
          <strong>Please review before creating:</strong>
          <ul>
            {validationReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      <label className="checkbox-label">
        <input type="checkbox" name="isPublished" checked={form.isPublished} onChange={handleChange} />
        Publish immediately
      </label>
      {error && <p className="error">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="book-btn" disabled={submitting || !maxPatientsValid}>{submitting ? 'Creating...' : 'Create Schedule'}</button>
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
    <div className="dr-schedule-card">
      <div className="dr-schedule-info">
        <span className="dr-schedule-date">{date}</span>
        <span className="dr-schedule-time">{start} – {end} (Cairo Time)</span>
        <span className="dr-schedule-slots">{available}/{schedule.maxPatients} slots available</span>
        {!schedule.isPublished && <span className="dr-badge-draft">Draft</span>}
      </div>
      <div className="dr-schedule-actions" style={{ display: 'flex', gap: '8px' }}>
        <button className="btn btn-ghost" onClick={() => onView(schedule.id)}>View Slots</button>
        <button className="btn outline" style={{ color: 'var(--error)' }} onClick={() => setShowCancel(true)}>Cancel Schedule</button>
      </div>

      <Modal isOpen={showCancel} onClose={() => setShowCancel(false)} ariaLabel="Cancel Schedule">
        <h2 style={{ marginBottom: '8px' }}>Cancel Schedule</h2>
        <div style={{ padding: '16px', background: 'rgba(255,0,0,0.05)', border: '1px solid var(--error)', borderRadius: '6px', marginBottom: '16px', color: 'var(--error)' }}>
          <strong>Warning:</strong> You are about to cancel this schedule. All booked patients will be notified. Frequent unexcused cancellations will be reviewed by administration and may result in penalties or account suspension.
        </div>
        <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>
          Please provide a reason for the cancellation. This reason will be sent to all patients who have reservations on this schedule.
        </p>
        <div className="dr-form-group">
          <label>Cancellation Reason *</label>
          <textarea 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
            placeholder="e.g. Unexpected personal emergency"
            rows={3}
            style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface)' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="btn btn-ghost" onClick={() => setShowCancel(false)}>Keep Schedule</button>
          <button 
            className="btn book-btn" 
            style={{ background: 'var(--error)' }} 
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
        consultFee: profile.consultFee ?? undefined,
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
    <section className="dr-location-editor" aria-labelledby="clinic-location-title">
      <div className="dr-location-header">
        <h3 id="clinic-location-title">Clinic Location</h3>
        <p>Set your clinic address so patients can navigate to your reservation location.</p>
      </div>

      <div className="dr-location-grid">
        <label>
          Clinic Name
          <input value={clinicName} onChange={(event) => setClinicName(event.target.value)} placeholder="Clinic or hospital name" />
        </label>
        <label>
          City
          <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" />
        </label>
      </div>

      <label className="dr-location-address-label">
        Clinic Address
        <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, district, city" />
      </label>

      <div className="dr-location-search-row">
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search exact address"
        />
        <button type="button" className="btn btn-ghost" onClick={() => void runSearch()} disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => void resolveCurrentLocation()} disabled={searching}>
          Use Current Location
        </button>
      </div>

      {candidates.length > 0 && (
        <div className="dr-location-candidates" role="listbox" aria-label="Address suggestions">
          {candidates.map((candidate) => (
            <button
              type="button"
              key={candidate.placeId}
              className="dr-location-candidate"
              onClick={() => {
                setAddress(candidate.formattedAddress);
                setCity(candidate.city ?? city);
                setSearchText(candidate.formattedAddress);
                setCandidates([]);
              }}
            >
              <strong>{candidate.formattedAddress}</strong>
              <span>{candidate.city ?? 'Unknown city'}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {success && <p className="dr-location-success">{success}</p>}

      <div className="dr-location-actions">
        <button type="button" className="book-btn" onClick={() => void saveLocation()} disabled={saving}>
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
      <div className="dr-reservations-page">
        <FeatureHeader
          title="Availability Manager"
          subtitle="Read-only view of published doctor availability posts"
          variant="doc"
          imageSrc={imageAssets.headers.doctor}
          imageAlt="Availability Manager"
        />
        {adminError && <p className="error">{adminError}</p>}
        {adminLoading ? (
          <p className="loading">Loading availability posts...</p>
        ) : adminPosts.length === 0 ? (
          <p className="loading">No published availability posts yet.</p>
        ) : (
          <div className="dr-schedule-list">
            {adminPosts.map((post) => (
              <div className="dr-schedule-card" key={post.schedule.id}>
                <div className="dr-schedule-info">
                  <span className="dr-schedule-date">
                    {new Date(post.schedule.scheduleDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="dr-schedule-time">
                    Dr. {post.doctor.firstName} {post.doctor.lastName} · {post.doctor.specialty}
                  </span>
                  <span className="dr-schedule-slots">
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

  if (profileLoading) return <div className="dr-reservations-page"><p className="loading">Loading profile...</p></div>;
  if (profileError) return (
    <div className="dr-reservations-page">
      <FeatureHeader title="Availability Manager" subtitle="Manage your doctor availability posts" variant="doc" imageSrc={imageAssets.headers.doctor} imageAlt="Availability Manager" />
      <p className="error">{profileError}</p>
      <p>Make sure your doctor profile is set up before managing schedules.</p>
      <div className="dr-toolbar">
        <button className="book-btn" onClick={() => void handleCreateProfile()} disabled={creatingProfile}>
          {creatingProfile ? 'Creating profile...' : 'Create Doctor Profile'}
        </button>
      </div>
    </div>
  );

  if (viewingScheduleId) {
    return (
      <div className="dr-reservations-page">
        <FeatureHeader title="Availability Manager" subtitle="Manage your doctor availability posts" variant="doc" imageSrc={imageAssets.headers.doctor} imageAlt="Availability Manager" />
        <ScheduleDetail scheduleId={viewingScheduleId} onBack={() => setViewingScheduleId(null)} />
      </div>
    );
  }

  return (
    <div className="dr-reservations-page">
      <FeatureHeader
        title="Availability Manager"
        subtitle="Create and manage your published availability posts"
        variant="doc"
        imageSrc={imageAssets.headers.doctor}
        imageAlt="Availability Manager"
      />

      {myProfile && (
        <ClinicLocationEditor
          profile={myProfile}
          onSaved={(updatedProfile) => {
            setMyProfile(updatedProfile);
          }}
        />
      )}

      <div className="dr-toolbar">
        <button className="book-btn" onClick={() => setShowCreate(true)}>+ New Schedule</button>
      </div>

      {showCreate && (
        <CreateScheduleForm
          onCreated={() => { setShowCreate(false); refresh(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {schedulesError && <p className="error">{schedulesError}</p>}

      {schedulesLoading ? (
        <p className="loading">Loading schedules...</p>
      ) : schedules.length === 0 ? (
        <p className="loading">No schedules yet. Create one to get started.</p>
      ) : (
        <div className="dr-schedule-list">
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