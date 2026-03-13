import { useEffect, useMemo, useState } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { Modal } from '../../components/Modal';
import { imageAssets } from '../../constants/imageAssets';
import { useMarketplaceSchedules } from '../../hooks/useDoctors';
import { useReservations } from '../../hooks/useReservations';
import { useAuth } from '@core/auth/useAuth';
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

function getAccountType(accessToken?: string): AccountType | null {
  if (!accessToken) return null;
  const decoded = decodeJWT(accessToken);
  if (!decoded || typeof decoded !== 'object') return null;
  const claim = (decoded as { account_type?: unknown }).account_type;
  return claim === 'patient' || claim === 'doctor' || claim === 'pharmacist' || claim === 'admin' ? claim : null;
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
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [shareHealthData, setShareHealthData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableSlots = useMemo(
    () => Array.from({ length: post.schedule.maxPatients }, (_, i) => i).filter((i) => !post.schedule.bookedSlotIndexes.includes(i)),
    [post.schedule.maxPatients, post.schedule.bookedSlotIndexes],
  );

  const slotDurationMs = post.schedule.slotDurationMins * 60_000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlotIndex === null || !reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await book({
        doctorScheduleId: post.schedule.id,
        slotIndex: selectedSlotIndex,
        reason: reason.trim(),
        shareHealthData,
      });
      onBooked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
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
              placeholder="Describe your visit reason"
              required
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

          {error && <p className="error">{error}</p>}
          {selectedSlotIndex === null && <p className="error">Select a slot time before booking.</p>}

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
  const { session } = useAuth();
  const accountType = getAccountType(session?.access_token);
  const canBook = accountType !== 'admin';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [specialty, setSpecialty] = useState('All Specialties');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [selectedPost, setSelectedPost] = useState<MarketplaceSchedulePost | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const { posts, loading, error, search: searchPosts } = useMarketplaceSchedules();

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
        <p className="loading">No posts found for your filters.</p>
      ) : (
        <div className="appointments-posts-grid">
          {posts.map((post) => {
            const availableSlots = post.schedule.maxPatients - post.schedule.bookedSlotIndexes.length;
            return (
              <div key={post.schedule.id} className="appointments-post-card">
                <div className="appointments-post-header">
                  <h3>Dr. {post.doctor.firstName} {post.doctor.lastName}</h3>
                  <span className="appointments-post-badge">{post.doctor.specialty}</span>
                </div>
                <p className="appointments-post-meta">
                  {post.doctor.clinicName ?? 'Clinic not set'} · {post.doctor.city ?? 'City not set'}
                </p>
                <p className="appointments-post-meta">
                  {new Date(post.schedule.scheduleDate).toLocaleDateString()} ·
                  {' '}
                  {new Date(post.schedule.startAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {new Date(post.schedule.endAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="appointments-post-meta">
                  {post.schedule.slotDurationMins} min slots · {availableSlots}/{post.schedule.maxPatients} available
                </p>
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
