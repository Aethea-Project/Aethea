import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FeatureHeader } from '../../components/FeatureHeader';
import { Modal } from '../../components/Modal';
import { imageAssets } from '../../constants/imageAssets';
import { useMarketplaceSchedules } from '../../hooks/useDoctors';
import { useReservations } from '../../hooks/useReservations';
import { useAuth } from '@core/auth/useAuth';
import { useUiNotifications } from '../../contexts/UiNotificationsProvider';
import { decodeJWT } from '@core/auth/token-manager';
import type { AccountType } from '@core/auth/auth-types';
import type { MarketplaceSchedulePost } from '../../services/medicalApi';
import './styles.css';

const SPECIALTIES = [
  'All Specialties',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'Orthopedics',
  'Neurology',
  'Ophthalmology',
  'Gynecology',
  'Psychiatry',
  'General Practice',
];

function buildMapsSearchLink(address: string | null | undefined): string | null {
  if (!address || !address.trim()) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function getAccountType(accessToken?: string): AccountType | null {
  if (!accessToken) return null;
  const decoded = decodeJWT(accessToken);
  if (!decoded || typeof decoded !== 'object') return null;
  const claim = (decoded as { account_type?: unknown }).account_type;
  return claim === 'patient' || claim === 'doctor' || claim === 'pharmacist' || claim === 'admin' ? claim : null;
}

function resolveAccountType(tokenAccountType: AccountType | null, profileAccountType: AccountType | null | undefined): AccountType | null {
  return tokenAccountType ?? profileAccountType ?? null;
}

function ReserveModal({
  post,
  onClose,
  onBooked,
}: {
  post: MarketplaceSchedulePost;
  onClose: () => void;
  onBooked: () => void;
}) {
  const { book } = useReservations();
  const { notifySuccess, notifyError } = useUiNotifications();
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [shareHealthData, setShareHealthData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const availableSlots = useMemo(
    () => Array.from({ length: post.schedule.maxPatients }, (_, i) => i).filter((i) => !post.schedule.bookedSlotIndexes.includes(i)),
    [post.schedule.maxPatients, post.schedule.bookedSlotIndexes],
  );

  const clinicAddress = post.doctor.address || [post.doctor.clinicName, post.doctor.city].filter(Boolean).join(', ');
  const clinicMapLink = buildMapsSearchLink(clinicAddress);

  const slotDurationMs = post.schedule.slotDurationMins * 60_000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlotIndex === null || !reason.trim()) return;
    setSubmitting(true);
    try {
      await book({
        doctorScheduleId: post.schedule.id,
        slotIndex: selectedSlotIndex,
        reason: reason.trim(),
        shareHealthData,
      });
      notifySuccess(
        'Appointment booked',
        `Your reservation with Dr. ${post.doctor.firstName} ${post.doctor.lastName} is confirmed.`,
      );
      onBooked();
    } catch (err) {
      notifyError(
        'Booking failed',
        'We could not complete your reservation.',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="marketplace-modal">
      <h3>Reserve with Dr. {post.doctor.firstName} {post.doctor.lastName}</h3>
      <p className="marketplace-modal-subtitle">
        {post.doctor.specialty} · {new Date(post.schedule.scheduleDate).toLocaleDateString()}
      </p>
      {clinicAddress && (
        <p className="marketplace-modal-subtitle">Clinic: {clinicAddress}</p>
      )}
      {clinicMapLink && (
        <a className="view-profile-btn" href={clinicMapLink} target="_blank" rel="noreferrer">
          Open Clinic Location
        </a>
      )}

      <div className="marketplace-slot-list">
        {availableSlots.length === 0 ? (
          <p className="error">No slots available for this post.</p>
        ) : (
          availableSlots.map((slotIndex) => {
            const slotStart = new Date(new Date(post.schedule.startAt).getTime() + slotIndex * slotDurationMs);
            const slotEnd = new Date(slotStart.getTime() + slotDurationMs);
            return (
              <button
                key={slotIndex}
                type="button"
                className={`time-slot-btn${selectedSlotIndex === slotIndex ? ' selected' : ''}`}
                onClick={() => setSelectedSlotIndex(slotIndex)}
              >
                {slotStart.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                {' - '}
                {slotEnd.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </button>
            );
          })
        )}
      </div>

      {availableSlots.length > 0 && (
        <form onSubmit={handleSubmit} className="marketplace-form">
          <label>
            Reason for visit *
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe your visit reason (e.g. Back pain, Checkup)"
              required
              minLength={2}
              maxLength={500}
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

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="book-btn" disabled={submitting || selectedSlotIndex === null || !reason.trim()}>
              {submitting ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function AppointmentsMarketplacePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const accountType = resolveAccountType(getAccountType(session?.access_token), profile?.accountType);
  const canBook = accountType !== 'admin';

  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [specialty, setSpecialty] = useState(() => {
    const specialtyParam = searchParams.get('specialty');
    return specialtyParam && SPECIALTIES.includes(specialtyParam) ? specialtyParam : 'All Specialties';
  });
  const [city, setCity] = useState(() => searchParams.get('city') ?? '');
  const [date, setDate] = useState(() => searchParams.get('date') ?? '');
  const [selectedPost, setSelectedPost] = useState<MarketplaceSchedulePost | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [alertMessages, setAlertMessages] = useState<Record<string, string>>({});
  const [alertLoading, setAlertLoading] = useState<Record<string, boolean>>({});

  const { posts, loading, error, search: searchPosts } = useMarketplaceSchedules();
  const { alertOnAvailability } = useReservations();

  const clearFilters = () => {
    setSearch('');
    setCity('');
    setDate('');
    setSpecialty('All Specialties');
  };

  const emptyState = useMemo(() => {
    if (accountType === 'doctor') {
      return {
        message: 'No published schedule posts match the current filters.',
        hint: 'Create or publish availability from Availability Manager so patients can book.',
        showDoctorAction: true,
      };
    }

    if (accountType === 'patient') {
      return {
        message: 'No doctor posts match your current filters.',
        hint: 'Try clearing filters or choosing a different date or city.',
        showDoctorAction: false,
      };
    }

    if (accountType === 'admin') {
      return {
        message: 'No published schedule posts match the current filters.',
        hint: 'Admin view is read-only. You can clear filters to inspect more posts.',
        showDoctorAction: false,
      };
    }

    return {
      message: 'No posts found for your filters.',
      hint: 'Try clearing filters or changing search criteria.',
      showDoctorAction: false,
    };
  }, [accountType]);

  const handleAlertSubscription = async (doctorScheduleId: string) => {
    setAlertLoading((prev) => ({ ...prev, [doctorScheduleId]: true }));
    try {
      const message = await alertOnAvailability(doctorScheduleId);
      setAlertMessages((prev) => ({ ...prev, [doctorScheduleId]: message }));
    } catch (err) {
      setAlertMessages((prev) => ({
        ...prev,
        [doctorScheduleId]: err instanceof Error ? err.message : 'Failed to subscribe to availability alerts',
      }));
    } finally {
      setAlertLoading((prev) => ({ ...prev, [doctorScheduleId]: false }));
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    void searchPosts({
      search: debouncedSearch || undefined,
      specialty: specialty === 'All Specialties' ? undefined : specialty,
      city: city.trim() || undefined,
      date: date || undefined,
      page: 1,
      limit: 50,
    });
  }, [debouncedSearch, specialty, city, date, searchPosts]);

  return (
    <div className="appointments-marketplace-page">
      <FeatureHeader
        title="Appointments Marketplace"
        subtitle="Browse doctor availability posts and reserve a timing"
        variant="doc"
        imageSrc={imageAssets.headers.doctor}
        imageAlt="Appointments Marketplace"
      />

      {!canBook && (
        <p className="error">Admin accounts are read-only and cannot create bookings.</p>
      )}

      <div className="finder-controls">
        <input
          className="search-input"
          type="text"
          placeholder="Search doctor name, specialty, clinic, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="specialty-select" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          className="search-input"
          type="text"
          placeholder="Filter by city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className="search-input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <p className="loading">Loading availability posts...</p>
      ) : posts.length === 0 ? (
        <div className="marketplace-empty-state">
          <p className="loading">{emptyState.message}</p>
          <p className="marketplace-empty-state-hint">{emptyState.hint}</p>
          <div className="marketplace-empty-actions">
            <button type="button" className="btn btn-ghost" onClick={clearFilters}>
              Clear Filters
            </button>
            {emptyState.showDoctorAction && (
              <button
                type="button"
                className="book-btn"
                onClick={() => navigate('/availability-manager')}
              >
                Open Availability Manager
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="doctors-grid appointments-posts-grid">
          {posts.map((post) => {
            const availableSlots = post.schedule.maxPatients - post.schedule.bookedSlotIndexes.length;
            const name = `Dr. ${post.doctor.firstName} ${post.doctor.lastName}`;
            const locationValue = post.doctor.address || [post.doctor.clinicName, post.doctor.city].filter(Boolean).join(', ');
            const location = locationValue || 'Location unknown';
            const clinicMapLink = buildMapsSearchLink(locationValue);

            return (
              <div key={post.schedule.id} className="doctor-card appointments-post-card">
                <div className="doctor-card-header">
                  <div className="doctor-avatar">
                   {post.doctor.photoUrl ? (
                      <img src={post.doctor.photoUrl} alt={name} />
                    ) : (
                      <span>{post.doctor.firstName[0]}{post.doctor.lastName[0]}</span>
                    )}
                  </div>
                  <div className="doctor-info">
                    <div className="doctor-name-row">
                      <h3>{name}</h3>
                      {post.doctor.verified && (
                        <span className="verified-badge" title="Verified">✓</span>
                      )}
                    </div>
                    <p className="doctor-specialty">{post.doctor.specialty}</p>
                  </div>
                </div>

                <div className="doctor-details">
                  <div className="detail-row">
                    <span className="detail-icon">📅</span>
                    <span>{new Date(post.schedule.scheduleDate).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon">⏰</span>
                    <span>
                      {new Date(post.schedule.startAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(post.schedule.endAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {location && (
                    <div className="detail-row">
                      <span className="detail-icon">📍</span>
                      <span>{location}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-icon">👥</span>
                    <span>{post.schedule.slotDurationMins} min slots · {availableSlots}/{post.schedule.maxPatients} available</span>
                  </div>
                </div>

                <div className="doctor-actions layout-col">
                  <button
                    className="book-btn"
                    type="button"
                    disabled={!canBook || availableSlots <= 0}
                    onClick={() => {
                      setSelectedPost(post);
                      setBookingSuccess(false);
                    }}
                  >
                    {availableSlots <= 0 ? 'Fully Booked' : canBook ? 'Reserve Slot' : 'Read Only'}
                  </button>
                  {availableSlots <= 0 && canBook && (
                    <button
                      className="view-profile-btn"
                      type="button"
                      disabled={alertLoading[post.schedule.id] === true}
                      onClick={() => void handleAlertSubscription(post.schedule.id)}
                    >
                      {alertLoading[post.schedule.id] ? 'Saving...' : 'Notify Me If Slot Opens'}
                    </button>
                  )}
                  {clinicMapLink && (
                    <a className="view-profile-btn" href={clinicMapLink} target="_blank" rel="noreferrer">
                      View Clinic on Map
                    </a>
                  )}
                  {alertMessages[post.schedule.id] && (
                    <p className="appointments-alert-message">{alertMessages[post.schedule.id]}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPost && (
        <Modal isOpen={Boolean(selectedPost)} onClose={() => setSelectedPost(null)}>
          {bookingSuccess ? (
            <div className="booking-success">
              <p>✓ Booking confirmed. You can review it in your appointments list.</p>
            </div>
          ) : (
            <ReserveModal
              post={selectedPost}
              onClose={() => setSelectedPost(null)}
              onBooked={() => {
                setBookingSuccess(true);
                void searchPosts({
                  search: debouncedSearch || undefined,
                  specialty: specialty === 'All Specialties' ? undefined : specialty,
                  city: city.trim() || undefined,
                  date: date || undefined,
                  page: 1,
                  limit: 50,
                });
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
