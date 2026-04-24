import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { useMarketplaceSchedules } from '../../hooks/useDoctors';
import { useReservations } from '../../hooks/useReservations';
import { useAuth } from '@core/auth/useAuth';
import { useUiNotifications } from '../../contexts/UiNotificationsProvider';
import { decodeJWT } from '@core/auth/token-manager';
import type { AccountType } from '@core/auth/auth-types';
import type { MarketplaceSchedulePost } from '../../services/medicalApi';
import { cn } from '../../lib/cn';
const SPECIALTIES = [
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
    <div className="flex flex-col gap-3 min-h-0">
      <h3 className="m-0 text-xl font-bold text-gray-900">Reserve with Dr. {post.doctor.firstName} {post.doctor.lastName}</h3>  
      <p className="m-0 text-gray-500 text-[0.95rem]">
        {post.doctor.specialty} • {new Date(post.schedule.scheduleDate).toLocaleDateString()}
      </p>
      {clinicAddress && (
        <p className="m-0 text-gray-500 text-[0.95rem]">Clinic: {clinicAddress}</p>   
      )}
      {clinicMapLink && (
        <a className="inline-flex items-center justify-center w-fit border border-gray-200 rounded-lg px-3 py-2 no-underline text-gray-900 bg-white text-sm font-medium hover:bg-gray-50 transition-colors" href={clinicMapLink} target="_blank" rel="noreferrer">
          Open Clinic Location
        </a>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2 max-h-[min(30dvh,240px)] sm:max-h-none overflow-y-auto pr-1 content-start mt-2">
        {availableSlots.length === 0 ? (
          <p className="text-sm text-red-600">No slots available for this post.</p>
        ) : (
          availableSlots.map((slotIndex) => {
            const slotStart = new Date(new Date(post.schedule.startAt).getTime() + slotIndex * slotDurationMs);
            const slotEnd = new Date(slotStart.getTime() + slotDurationMs);
            return (
              <button
                key={slotIndex}
                type="button"
                className={cn(
                  "bg-white border p-2 rounded-lg cursor-pointer text-gray-900 text-sm font-inherit transition-colors hover:border-blue-400",
                  selectedSlotIndex === slotIndex ? "bg-blue-50 border-blue-600 text-blue-700 font-semibold" : "border-gray-200"
                )}
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-900">
            Reason for visit *
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe your visit reason (e.g. Back pain, Checkup)"
              required
              minLength={2}
              maxLength={500}
              className="w-full border border-gray-200 rounded-lg p-2.5 font-inherit text-[0.95rem] resize-y min-h-[80px] bg-white text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-shadow"
            />
          </label>

          <label className="flex flex-row items-center gap-2 font-normal text-gray-500 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={shareHealthData}
              onChange={(e) => setShareHealthData(e.target.checked)}
              className="w-4 h-4 m-0 accent-teal-600 shrink-0"
            />
            Share my health records with this doctor
          </label>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 mt-2 pt-2.5 border-t border-gray-200 sticky bottom-0 bg-white z-10 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_14px_-12px_rgba(15,23,42,0.4)] sm:shadow-none sm:pb-0 sm:static">
            <button type="button" className="w-full sm:w-auto bg-transparent border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 px-3.5 py-2 rounded-lg font-inherit text-[0.95rem] font-medium cursor-pointer transition-colors" onClick={onClose}>Cancel</button>
            <button type="submit" className="w-full sm:w-auto bg-blue-600 border border-transparent text-white hover:bg-blue-700 px-3.5 py-2 rounded-lg font-inherit text-[0.95rem] font-medium cursor-pointer disabled:opacity-65 disabled:cursor-not-allowed transition-colors" disabled={submitting || selectedSlotIndex === null || !reason.trim()}>
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
    <div className="max-w-[1200px] mx-auto p-4 sm:p-6 pb-20">
      <h1 className="m-0 mb-5 text-[1.75rem] font-bold text-gray-900">Appointments Marketplace</h1>

      {!canBook && (
        <p className="text-red-600 m-0 mb-4 bg-red-50 p-3 rounded-lg text-sm border border-red-200">Admin accounts are read-only and cannot create bookings.</p>
      )}

      <div className="grid grid-[repeat(auto-fit,minmax(180px,1fr))] lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 mb-5">
        <input
          className="border border-gray-200 rounded-lg px-3 py-2.5 font-inherit bg-white text-gray-900 min-h-[40px] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-shadow"
          type="text"
          placeholder="Search doctor name, specialty, clinic, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="border border-gray-200 rounded-lg px-3 py-2.5 font-inherit bg-white text-gray-900 min-h-[40px] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-shadow" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          className="border border-gray-200 rounded-lg px-3 py-2.5 font-inherit bg-white text-gray-900 min-h-[40px] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-shadow"
          type="text"
          placeholder="Filter by city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className="border border-gray-200 rounded-lg px-3 py-2.5 font-inherit bg-white text-gray-900 min-h-[40px] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-shadow"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {error && <div className="text-red-600 m-0 mb-4 bg-red-50 p-3 rounded-lg text-sm border border-red-200">{error}</div>}
      {loading ? (
        <p className="text-gray-500 italic mt-2">Loading availability posts...</p>
      ) : posts.length === 0 ? (
        <div className="mt-3 border border-gray-200 rounded-[10px] bg-white p-4">
          <p className="text-gray-900 font-medium m-0">{emptyState.message}</p>
          <p className="m-0 mt-2 text-gray-500 text-sm">{emptyState.hint}</p>     
          <div className="mt-3 flex flex-wrap gap-2.5">
            <button type="button" className="bg-transparent border border-gray-200 text-gray-700 hover:bg-gray-50 px-3.5 py-2 rounded-lg font-inherit text-[0.95rem] font-medium cursor-pointer transition-colors" onClick={clearFilters}>
              Clear Filters
            </button>
            {emptyState.showDoctorAction && (
              <button
                type="button"
                className="bg-blue-600 border border-transparent text-white hover:bg-blue-700 px-3.5 py-2 rounded-lg font-inherit text-[0.95rem] font-medium cursor-pointer transition-colors"
                onClick={() => navigate('/availability-manager')}
              >
                Open Availability Manager
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-6 mt-3.5">
          {posts.map((post, index) => {
            const availableSlots = post.schedule.maxPatients - post.schedule.bookedSlotIndexes.length;
            const name = `Dr. ${post.doctor.firstName} ${post.doctor.lastName}`;
            const locationValue = post.doctor.address || [post.doctor.clinicName, post.doctor.city].filter(Boolean).join(', ');
            const location = locationValue || 'Location unknown';
            const clinicMapLink = buildMapsSearchLink(locationValue);

            const cardTones = ['apc-tone-1', 'apc-tone-2', 'apc-tone-3'];
            const cardToneClass = cardTones[index % cardTones.length];

            return (
              <div key={post.schedule.id} className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col min-h-[470px] sm:min-h-0 transition-transform duration-150 hover:-translate-y-[2px]"> 
                {/* Top Image Area */}
                <div className="relative h-[190px] bg-[#27272a] shrink-0">
                  {post.doctor.photoUrl ? (
                    <img src={post.doctor.photoUrl} alt={name} className="w-full h-full object-cover block" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#2c2c2e]">
                      <span className="text-[#a1a1aa] text-[11px] tracking-[0.08em] font-semibold">IMAGE PLACEHOLDER</span>
                    </div>
                  )}
                  <div className="absolute top-0 right-[14px] bg-[#f59e0b] text-white font-bold py-[5px] px-[12px] rounded-b-lg text-[13px]">
                    {post.doctor.consultFee ? `${post.doctor.consultFee} EGP` : 'Free'}
                  </div>
                </div>

                {/* Bottom Content Area */}
                <div className={cn("text-white p-4 flex flex-col flex-1", cardToneClass === 'apc-tone-1' ? 'bg-[#151b3d]' : cardToneClass === 'apc-tone-2' ? 'bg-[#1e293b]' : 'bg-[#2c2c2e]')}>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_max-content_1fr] gap-3">
                    {/* Left Col */}
                    <div className="min-w-0">
                      <h3 className="m-0 text-[18px] font-bold leading-tight">{name}</h3>
                      <p className="m-0 mt-1 text-[12px] leading-[1.35] text-white/90">{post.doctor.specialty}</p>       
                      <div className="mt-2.5 flex gap-[2px]">
                        <span className="text-amber-400">★</span>
                        <span className="text-amber-400">★</span>
                        <span className="text-amber-400">★</span>
                        <span className="text-amber-400">★</span>
                        <span className="text-amber-400">★</span>
                      </div>
                    </div>
                    <div className="hidden sm:block w-px bg-white/20"></div>
                    {/* Right Col */}
                    <div className="min-w-0">
                      <h4 className="m-0 text-[10px] font-bold tracking-[0.06em] text-white/95">DETAILS</h4>
                      <p className="m-0 mt-1 text-[12px] leading-[1.35] text-white/90">
                        {new Date(post.schedule.scheduleDate).toLocaleDateString()}
                        <br />
                        {new Date(post.schedule.startAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - {new Date(post.schedule.endAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <h4 className="m-0 mt-2 text-[10px] font-bold tracking-[0.06em] text-white/95">LOCATION</h4>
                      <p className="m-0 mt-1 text-[12px] leading-[1.35] text-white/90">{location}</p>
                      {clinicMapLink && (
                        <a className="inline-block mt-1.5 text-[12px] text-slate-200 underline" href={clinicMapLink} target="_blank" rel="noreferrer">
                          Open Map
                        </a>
                      )}
                      <h4 className="m-0 mt-2 text-[10px] font-bold tracking-[0.06em] text-white/95">AVAILABILITY</h4>       
                      <p className="m-0 mt-1 text-[12px] leading-[1.35] text-white/90">
                        {availableSlots}/{post.schedule.maxPatients} slots open 
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-2 items-center pt-3.5">
                    <button
                      className="min-w-[150px] bg-white text-gray-900 border-none rounded-lg px-4 py-2 text-[12px] font-bold cursor-pointer hover:bg-slate-100 disabled:bg-white/60 disabled:text-gray-900/55 disabled:cursor-not-allowed transition-colors"
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
                        className="bg-transparent text-white border border-white/45 rounded-lg px-3.5 py-1.5 text-[12px] cursor-pointer hover:bg-white/10 transition-colors"
                        type="button"
                        disabled={alertLoading[post.schedule.id] === true}      
                        onClick={() => void handleAlertSubscription(post.schedule.id)}
                      >
                        {alertLoading[post.schedule.id] ? 'Saving...' : 'Notify Me'}
                      </button>
                    )}
                  </div>
                  {alertMessages[post.schedule.id] && (
                    <p className="m-0 mt-2.5 text-[12px] text-slate-50 text-center">{alertMessages[post.schedule.id]}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPost && (
        <Modal
          isOpen={Boolean(selectedPost)}
          onClose={() => setSelectedPost(null)}
          contentClassName="w-full max-w-[560px] max-h-[calc(100dvh-2rem)] overflow-y-auto"
          ariaLabel="Reserve appointment slot"
        >
          {bookingSuccess ? (
            <div className="m-0 p-3 rounded-lg border border-green-500 bg-green-50 text-green-800">
              <p>Booking confirmed. You can review it in your appointments list.</p>
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
