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
    <div className="flex flex-col h-full bg-white">
      {/* Premium Header Section */}
      <div className="relative p-8 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center border border-teal-100 shadow-sm">
            {post.doctor.photoUrl ? (
              <img src={post.doctor.photoUrl} alt={post.doctor.firstName} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span className="text-xl font-black text-teal-600 uppercase">{post.doctor.firstName[0]}{post.doctor.lastName[0]}</span>
            )}
          </div>
          <div>
            <span className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] block mb-1">Appointment Booking</span>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight m-0">Dr. {post.doctor.firstName} {post.doctor.lastName}</h3>  
            <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-wider">{post.doctor.specialty}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="text-[11px] font-black text-gray-600">{new Date(post.schedule.scheduleDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
          {clinicAddress && (
             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 max-w-[200px]">
                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-[11px] font-black text-gray-600 truncate">{clinicAddress}</span>
             </div>
          )}
        </div>
      </div>

      <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh] scrollbar-hide">
        {/* Slot Selection */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Available Time</h4>
            <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg">{availableSlots.length} slots open</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableSlots.length === 0 ? (
              <div className="col-span-full p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
                <p className="text-[11px] font-black text-red-600 uppercase tracking-widest">No slots remaining for this date</p>
              </div>
            ) : (
              availableSlots.map((slotIndex) => {
                const slotStart = new Date(new Date(post.schedule.startAt).getTime() + slotIndex * slotDurationMs);
                const slotEnd = new Date(slotStart.getTime() + slotDurationMs);
                const isSelected = selectedSlotIndex === slotIndex;
                return (
                  <button
                    key={slotIndex}
                    type="button"
                    onClick={() => setSelectedSlotIndex(slotIndex)}
                    className={cn(
                      "p-3 rounded-2xl border transition-all text-center group",
                      isSelected 
                        ? "bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-600/30 scale-[1.02]" 
                        : "bg-white border-slate-100 hover:border-teal-500 hover:shadow-md"
                    )}
                  >
                    <p className={cn("text-xs font-black", isSelected ? "text-white" : "text-gray-900 group-hover:text-teal-600")}>
                      {slotStart.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                    <p className={cn("text-[9px] font-bold mt-1", isSelected ? "text-teal-100" : "text-gray-400")}>
                      {post.schedule.slotDurationMins} min session
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {availableSlots.length > 0 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Reason for Visit */}
            <div>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Consultation Details</h4>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe your symptoms or reason for the visit..."
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-600 transition-all outline-none min-h-[100px]"
              />
            </div>

            {/* Health Data Sharing */}
            <div 
              onClick={() => setShareHealthData(!shareHealthData)}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4",
                shareHealthData ? "bg-teal-50/50 border-teal-100 shadow-sm" : "bg-white border-slate-100 hover:bg-slate-50"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                shareHealthData ? "bg-teal-600 text-white shadow-md shadow-teal-600/20" : "bg-slate-100 text-slate-400"
              )}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-black text-gray-900 uppercase tracking-wider">Share Health Records</p>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5">Let Dr. {post.doctor.lastName} review your past results</p>
              </div>
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                shareHealthData ? "border-teal-600 bg-teal-600" : "border-slate-200"
              )}>
                {shareHealthData && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 px-6 py-3.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
              >
                Go Back
              </button>
              <button 
                type="submit" 
                disabled={submitting || selectedSlotIndex === null || !reason.trim()}
                className="flex-[1.5] px-8 py-3.5 bg-teal-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-teal-600/30 hover:bg-teal-700 hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0"
              >
                {submitting ? 'Processing...' : 'Confirm Appointment'}
              </button>
            </div>
          </form>
        )}
      </div>
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
