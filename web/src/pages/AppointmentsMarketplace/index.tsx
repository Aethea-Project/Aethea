import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMarketplaceSchedules } from '../../hooks/useDoctors';
import { useReservations } from '../../hooks/useReservations';
import { useAuth } from '@core/auth/useAuth';
import { useUiNotifications } from '../../contexts/UiNotificationsProvider';
import { decodeJWT } from '@core/auth/auth-utils';
import type { AccountType } from '@core/auth/auth-types';
import { medicalApi, type MarketplaceSchedulePost } from '../../services/medicalApi';
import { cn } from '../../lib/utils';
import { FeatureHeader } from '../../components/FeatureHeader';
import { SearchBar } from '../../components/ui/SearchBar';
import { MEDICAL_SPECIALTIES } from '../../constants/medicalSpecialties';

const SPECIALTIES = [
  'All Specialties',
  ...MEDICAL_SPECIALTIES,
];

function getMapLink(locationUrl: string | null | undefined, address: string | null | undefined): string | null {
  if (locationUrl && locationUrl.trim()) {
    return locationUrl.trim();
  }
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
  patientCoords,
  onClose,
  onBooked,
}: {
  post: MarketplaceSchedulePost;
  patientCoords: { lat: number; lng: number } | null;
  onClose: () => void;
  onBooked: () => void;
}) {
  const { book } = useReservations();
  const { notifySuccess, notifyError } = useUiNotifications();
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [shareHealthData, setShareHealthData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [travelDurationSeconds, setTravelDurationSeconds] = useState<number | null>(null);

  const isBookingClosed = useMemo(() => {
    const startAtDate = new Date(post.schedule.startAt);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    
    const slotParts = formatter.formatToParts(startAtDate);
    const slotY = Number(slotParts.find(p => p.type === 'year')?.value);
    const slotM = Number(slotParts.find(p => p.type === 'month')?.value);
    const slotD = Number(slotParts.find(p => p.type === 'day')?.value);

    const nowParts = formatter.formatToParts(new Date());
    const nowY = Number(nowParts.find(p => p.type === 'year')?.value);
    const nowM = Number(nowParts.find(p => p.type === 'month')?.value);
    const nowD = Number(nowParts.find(p => p.type === 'day')?.value);

    const isDayBeforeOrEarlier =
      nowY < slotY ||
      (nowY === slotY && nowM < slotM) ||
      (nowY === slotY && nowM === slotM && nowD < slotD);

    return !isDayBeforeOrEarlier;
  }, [post.schedule.startAt]);

  const clinicInfo = post.schedule.clinicInfo as {
    clinicName?: string;
    city?: string;
    consultFee?: number;
    address?: string;
    locationUrl?: string;
  } | null | undefined;

  const clinicAddress = clinicInfo?.address || post.doctor.address || [clinicInfo?.clinicName || post.doctor.clinicName, clinicInfo?.city || post.doctor.city].filter(Boolean).join(', ');
  const slotDurationMs = post.schedule.slotDurationMins * 60_000;

  const activeSlotsCount = useMemo(() => {
    if (isBookingClosed) return 0;
    let count = 0;
    const now = Date.now();
    for (let i = 0; i < post.schedule.maxPatients; i++) {
      if (post.schedule.bookedSlotIndexes.includes(i)) continue;
      const slotStart = new Date(post.schedule.startAt).getTime() + i * slotDurationMs;
      if (slotStart > now) {
        count++;
      }
    }
    return count;
  }, [post.schedule.maxPatients, post.schedule.bookedSlotIndexes, post.schedule.startAt, slotDurationMs, isBookingClosed]);

  useEffect(() => {
    if (!patientCoords || !clinicAddress) return;

    let isMounted = true;
    const loadTravelTime = async () => {
      try {
        const candidates = await medicalApi.fetchAddressCandidates(clinicAddress);
        if (candidates && candidates.length > 0 && isMounted) {
          const clinicLat = candidates[0].location.lat;
          const clinicLng = candidates[0].location.lng;

          const route = await medicalApi.fetchFastestRoute({
            originLat: patientCoords.lat,
            originLng: patientCoords.lng,
            destinationLat: clinicLat,
            destinationLng: clinicLng,
          });
          
          if (isMounted) {
            setTravelDurationSeconds(route.durationSeconds);
          }
        }
      } catch (err) {
        console.error('Error fetching travel time:', err);
      }
    };

    void loadTravelTime();

    return () => {
      isMounted = false;
    };
  }, [patientCoords, clinicAddress]);

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
        patientLat: patientCoords?.lat,
        patientLng: patientCoords?.lng,
      });
      notifySuccess(
        'Appointment booked',
        `Your reservation with Dr. ${post.doctor.firstName} ${post.doctor.lastName} is confirmed.`,
      );
      onBooked();
    } catch (err) {
      notifyError(
        'Booking failed',
        `We could not complete your reservation. ${err instanceof Error ? err.message : 'Unknown error'}`
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-card">
      {/* Premium Header Section */}
      <div className="relative p-8 pb-6 border-b border-sand-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-lg bg-sand-50 flex items-center justify-center border border-sand-200 shadow-sm">
            {post.doctor.photoUrl ? (
              <img src={post.doctor.photoUrl} alt={post.doctor.firstName} loading="lazy" className="w-full h-full object-cover rounded-lg" />
            ) : (
              <span className="text-xl font-black text-amber-600 uppercase">{post.doctor.firstName[0]}{post.doctor.lastName[0]}</span>
            )}
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] block mb-1">Appointment Booking</span>
            <h3 className="text-2xl font-black text-sand-900 tracking-tight m-0">Dr. {post.doctor.firstName} {post.doctor.lastName}</h3>  
            <p className="text-sm font-bold text-sand-400 mt-1 uppercase tracking-wider">{post.doctor.specialty}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-lg border border-sand-100">
            <svg className="w-3.5 h-3.5 text-sand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="text-[11px] font-black text-sand-600">{new Date(post.schedule.scheduleDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
          {clinicAddress && (
             <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-lg border border-sand-100 max-w-[200px]">
                <svg className="w-3.5 h-3.5 text-sand-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-[11px] font-black text-sand-600 truncate">{clinicAddress}</span>
             </div>
          )}
          {travelDurationSeconds !== null && (
             <div className="flex items-center gap-2 px-3 py-1.5 bg-sand-50 border border-sand-200 rounded-lg max-w-[220px]" title="Estimated driving/travel duration to clinic">
                <span className="text-xs">🚗</span>
                <span className="text-[11px] font-black text-sand-900 truncate">
                  Est. Travel: {Math.round(travelDurationSeconds / 60)} mins
                </span>
             </div>
          )}
        </div>
      </div>

      <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh] scrollbar-hide">
        {/* Slot Selection */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[10px] font-black text-sand-400 uppercase tracking-widest">
              {post.schedule.bookingMode === 'token' ? 'Select Walk-in Queue Ticket' : 'Select Appointment Time Slot'}
            </h4>
            <span className="text-[10px] font-bold text-amber-600 bg-sand-50 px-2 py-0.5 rounded-lg">
              {activeSlotsCount} {post.schedule.bookingMode === 'token' ? 'tickets' : 'appointments'} open
            </span>
          </div>

          {isBookingClosed && (
            <div className="p-4 mb-4 bg-amber-50/60 border border-amber-200/50 rounded-lg text-amber-800 text-[11px] font-semibold leading-relaxed">
              ⚠️ Booking is closed for today. Appointments must be booked at least the day before the schedule calendar date.
            </div>
          )}

          {activeSlotsCount === 0 && !isBookingClosed && (
            <div className="p-4 mb-4 bg-red-50/50 rounded-lg border border-red-100/50 text-center">
              <p className="text-[11px] font-black text-red-600 uppercase tracking-widest m-0">
                {post.schedule.bookingMode === 'token' ? 'Walk-in Queue has no active tickets for this date' : 'No active appointments remaining for this date'}
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: post.schedule.maxPatients }, (_, i) => i).map((slotIndex) => {
              const slotStart = new Date(new Date(post.schedule.startAt).getTime() + slotIndex * slotDurationMs);
              const isBooked = post.schedule.bookedSlotIndexes.includes(slotIndex);
              const isPast = slotStart.getTime() < Date.now() || isBookingClosed;
              const isSelected = selectedSlotIndex === slotIndex;

              let buttonClasses = "";
              let content = null;
              let isDisabled = false;

              if (isBooked) {
                isDisabled = true;
                buttonClasses = "bg-amber-50 border-amber-200 text-amber-700 cursor-not-allowed opacity-80";
                content = (
                  <>
                    <p className="text-xs font-black text-amber-800">
                      {post.schedule.bookingMode === 'token'
                        ? `Ticket #${slotIndex + 1}`
                        : slotStart.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                    <p className="text-[9px] font-bold mt-1 text-amber-600 uppercase tracking-wider">Reserved</p>
                  </>
                );
              } else if (isPast) {
                isDisabled = true;
                buttonClasses = "bg-sand-100/50 border-sand-200/50 text-sand-400 cursor-not-allowed opacity-60";
                content = (
                  <>
                    <p className="text-xs font-black text-sand-500">
                      {post.schedule.bookingMode === 'token'
                        ? `Ticket #${slotIndex + 1}`
                        : slotStart.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                    <p className="text-[9px] font-bold mt-1 text-sand-400 uppercase tracking-wider">
                      {isBookingClosed ? 'Expired' : 'Time Passed'}
                    </p>
                  </>
                );
              } else {
                buttonClasses = isSelected
                  ? "bg-nescafe border-nescafe text-white shadow-sm shadow-nescafe/30 scale-[1.02]"
                  : "bg-surface-card border-sand-100 hover:border-sand-500 hover:shadow-sm text-sand-900";
                content = post.schedule.bookingMode === 'token' ? (
                  <>
                    <p className={cn("text-xs font-black", isSelected ? "text-white" : "text-sand-900 group-hover:text-amber-600")}>
                      Ticket #{slotIndex + 1}
                    </p>
                    <p className={cn("text-[9px] font-bold mt-1", isSelected ? "text-sand-100" : "text-sand-400")}>
                      Est. wait: ~{slotIndex * 15} mins
                    </p>
                  </>
                ) : (
                  <>
                    <p className={cn("text-xs font-black", isSelected ? "text-white" : "text-sand-900 group-hover:text-amber-600")}>
                      {slotStart.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                    <p className={cn("text-[9px] font-bold mt-1", isSelected ? "text-sand-100" : "text-sand-400")}>
                      {post.schedule.slotDurationMins} min slot
                    </p>
                  </>
                );
              }

              return (
                <button
                  key={slotIndex}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setSelectedSlotIndex(slotIndex)}
                  className={cn(
                    "p-3 rounded-lg border transition-all text-center group min-h-[72px] flex flex-col items-center justify-center",
                    buttonClasses
                  )}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </section>

        {activeSlotsCount > 0 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Reason for Visit */}
            <div>
              <h4 className="text-[10px] font-black text-sand-400 uppercase tracking-widest mb-4">Consultation Details</h4>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe your symptoms or reason for the visit..."
                required
                className="w-full bg-surface border border-sand-100 rounded-lg p-4 text-sm font-medium text-sand-900 placeholder:text-sand-400 focus:bg-surface-card focus:ring-2 focus:ring-sand-100 focus:border-nescafe transition-all outline-none min-h-[100px]"
              />
            </div>

            {/* Health Data Sharing */}
            <div 
              onClick={() => setShareHealthData(!shareHealthData)}
              className={cn(
                "p-4 rounded-lg border transition-all cursor-pointer flex items-center gap-4",
                shareHealthData ? "bg-sand-50/50 border-sand-200 shadow-sm" : "bg-surface-card border-sand-100 hover:bg-surface"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                shareHealthData ? "bg-nescafe text-white shadow-sm shadow-nescafe/20" : "bg-sand-100 text-sand-400"
              )}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-black text-sand-900 uppercase tracking-wider">Share Health Records</p>
                <p className="text-[10px] font-bold text-sand-400 mt-0.5">Let Dr. {post.doctor.lastName} review your past results</p>
              </div>
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                shareHealthData ? "border-nescafe bg-nescafe" : "border-sand-200"
              )}>
                {shareHealthData && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 px-6 py-3.5 text-xs font-black text-sand-400 uppercase tracking-widest hover:text-sand-600 transition-colors"
              >
                Go Back
              </button>
              <button 
                type="submit" 
                disabled={submitting || selectedSlotIndex === null || !reason.trim()}
                className="flex-[1.5] px-8 py-3.5 bg-nescafe text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-sm shadow-nescafe/30 hover:bg-nescafe-hover hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0"
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
  const [patientCoords, setPatientCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPatientCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Error obtaining patient geolocation:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

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
    <div className="max-w-5xl mx-auto p-10 space-y-12">
      <FeatureHeader title="Book a Doctor" subtitle="Schedule an appointment with specialists in your area" />

      {!canBook && (
        <p className="text-red-600 m-0 mb-4 bg-red-50 p-3 rounded-lg text-sm border border-red-200">Admin accounts are read-only and cannot create bookings.</p>
      )}

      <div className="space-y-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search doctor name, specialty, clinic, city..."
          className="max-w-3xl mb-0"
        />
        
        <div className="flex flex-wrap items-center gap-3">
          <select className="border border-sand-200 rounded-lg px-3 py-2.5 font-inherit bg-surface-card text-sand-900 min-h-[40px] focus:outline-none focus:border-nescafe focus:ring-1 focus:ring-nescafe transition-shadow" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            className="border border-sand-200 rounded-lg px-3 py-2.5 font-inherit bg-surface-card text-sand-900 min-h-[40px] focus:outline-none focus:border-nescafe focus:ring-1 focus:ring-nescafe transition-shadow"
            type="text"
            placeholder="Filter by city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <input
            className="border border-sand-200 rounded-lg px-3 py-2.5 font-inherit bg-surface-card text-sand-900 min-h-[40px] focus:outline-none focus:border-nescafe focus:ring-1 focus:ring-nescafe transition-shadow"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="text-red-600 m-0 mb-4 bg-red-50 p-3 rounded-lg text-sm border border-red-200">{error}</div>}
      {loading ? (
        <p className="text-sand-500 italic mt-2">Loading availability posts...</p>
      ) : posts.length === 0 ? (
        <div className="mt-3 border border-sand-200 rounded-[10px] bg-surface-card p-4">
          <p className="text-sand-900 font-medium m-0">{emptyState.message}</p>
          <p className="m-0 mt-2 text-sand-500 text-sm">{emptyState.hint}</p>     
          <div className="mt-3 flex flex-wrap gap-2.5">
            <button type="button" className="bg-transparent border border-sand-200 text-sand-700 hover:bg-sand-50 px-3.5 py-2 rounded-lg font-inherit text-[0.95rem] font-medium cursor-pointer transition-colors" onClick={clearFilters}>
              Clear Filters
            </button>
            {emptyState.showDoctorAction && (
              <button
                type="button"
                className="bg-nescafe border border-transparent text-white hover:bg-nescafe-hover px-3.5 py-2 rounded-lg font-inherit text-[0.95rem] font-medium cursor-pointer transition-colors shadow-sm"
                onClick={() => navigate('/clinic-hours')}
              >
                Open Clinic Hours
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-6 mt-3.5">
          {posts.map((post) => {
            const now = Date.now();
            const slotDurationMs = post.schedule.slotDurationMins * 60_000;
            const startMs = new Date(post.schedule.startAt).getTime();
            const activeSlotsCount = Array.from({ length: post.schedule.maxPatients }, (_, i) => i)
              .filter(i => {
                if (post.schedule.bookedSlotIndexes.includes(i)) return false;
                const slotStart = startMs + i * slotDurationMs;
                return slotStart > now;
              }).length;
            const name = `Dr. ${post.doctor.firstName} ${post.doctor.lastName}`;
            const clinicInfo = post.schedule.clinicInfo as {
              clinicName?: string;
              city?: string;
              consultFee?: number;
              address?: string;
              locationUrl?: string;
            } | null | undefined;

            const locationValue = clinicInfo?.address || post.doctor.address || [clinicInfo?.clinicName || post.doctor.clinicName, clinicInfo?.city || post.doctor.city].filter(Boolean).join(', ');
            const location = locationValue || 'Location unknown';
            const clinicMapLink = getMapLink(clinicInfo?.locationUrl || post.doctor.locationUrl, locationValue);
            const consultFee = clinicInfo?.consultFee ?? post.doctor.consultFee;

            return (
              <div key={post.schedule.id} className="bg-surface-card rounded-lg border border-sand-200 border-t-4 border-t-nescafe shadow-sm overflow-hidden flex flex-col transition-all duration-150 hover:shadow-md"> 
                {/* Top Image Area */}
                <div className="relative h-[190px] bg-sand-50 shrink-0">
                  {post.doctor.photoUrl ? (
                    <img src={post.doctor.photoUrl} alt={name} loading="lazy" className="w-full h-full object-cover block" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-sand-100">
                      <span className="text-sand-400 text-[11px] tracking-[0.08em] font-semibold">NO PHOTO</span>
                    </div>
                  )}
                  <div className="absolute top-0 right-[14px] bg-nescafe text-white font-bold py-[5px] px-[12px] rounded-b-lg text-[13px]">
                    {consultFee ? `${consultFee} EGP` : 'Free'}
                  </div>
                </div>

                {/* Bottom Content Area */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_max-content_1fr] gap-3">
                    {/* Left Col */}
                    <div className="min-w-0">
                      <h3 className="m-0 text-[18px] font-bold text-sand-900 leading-tight">{name}</h3>
                      <p className="m-0 mt-1 text-[12px] leading-[1.35] text-sand-500">{post.doctor.specialty}</p>       
                      <p className="text-xs text-sand-400 mt-2 italic">Ratings available after visit</p>
                    </div>
                    <div className="hidden sm:block w-px bg-sand-200"></div>
                    {/* Right Col */}
                    <div className="min-w-0">
                      <h4 className="m-0 text-[10px] font-bold tracking-[0.06em] text-sand-400">DETAILS</h4>
                      <p className="m-0 mt-1 text-[12px] leading-[1.35] text-sand-700">
                        {new Date(post.schedule.scheduleDate).toLocaleDateString()}
                        <br />
                        {post.schedule.bookingMode === 'token' ? (
                          <>Starts at {new Date(post.schedule.startAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} (Walk-in Queue)</>
                        ) : (
                          <>{new Date(post.schedule.startAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - {new Date(post.schedule.endAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</>
                        )}
                      </p>
                      <h4 className="m-0 mt-2 text-[10px] font-bold tracking-[0.06em] text-sand-400">LOCATION</h4>
                      <p className="m-0 mt-1 text-[12px] leading-[1.35] text-sand-700">{location}</p>
                      {clinicMapLink && (
                        <a className="inline-block mt-1.5 text-[12px] text-amber-600 underline hover:text-sand-900" href={clinicMapLink} target="_blank" rel="noreferrer">
                          Open Map
                        </a>
                      )}
                      <h4 className="m-0 mt-2 text-[10px] font-bold tracking-[0.06em] text-sand-400">AVAILABILITY</h4>       
                      <p className="m-0 mt-1 text-[12px] leading-[1.35] text-sand-700">
                        {activeSlotsCount}/{post.schedule.maxPatients} {post.schedule.bookingMode === 'token' ? 'tickets' : 'appointments'} open 
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-2 pt-4">
                    <button
                      className="w-full bg-nescafe text-white rounded-lg px-4 py-2.5 text-[13px] font-bold cursor-pointer hover:bg-nescafe-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                      type="button"
                      disabled={!canBook || activeSlotsCount <= 0}
                      onClick={() => {
                        setSelectedPost(post);
                        setBookingSuccess(false);
                      }}
                    >
                      {activeSlotsCount <= 0 ? 'Fully Booked' : canBook ? 'Reserve Slot' : 'Read Only'}
                    </button>
                    {activeSlotsCount <= 0 && canBook && (
                      <button
                        className="w-full bg-surface text-sand-700 border border-sand-300 rounded-lg px-4 py-2 text-[12px] font-medium cursor-pointer hover:bg-sand-50 transition-colors"
                        type="button"
                        disabled={alertLoading[post.schedule.id] === true}      
                        onClick={() => void handleAlertSubscription(post.schedule.id)}
                      >
                        {alertLoading[post.schedule.id] ? 'Saving...' : 'Notify Me'}
                      </button>
                    )}
                  </div>
                  {alertMessages[post.schedule.id] && (
                    <p className="m-0 mt-2.5 text-[12px] text-sand-500 text-center">{alertMessages[post.schedule.id]}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-out Drawer for Booking */}
      <div 
        className={cn(
          "fixed inset-0 bg-sand-900/40 backdrop-blur-sm z-[150] transition-opacity duration-300",
          selectedPost ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSelectedPost(null)}
      />
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-full sm:max-w-[560px] bg-surface border-l border-sand-200 z-[160] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out transform overflow-hidden",
          selectedPost ? "translate-x-0" : "translate-x-full"
        )}
      >
        {selectedPost && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-sand-200 bg-surface-card shrink-0">
              <h2 className="font-serif text-xl font-medium text-sand-900">Reserve Slot</h2>
              <button 
                type="button" 
                onClick={() => setSelectedPost(null)}
                className="w-10 h-10 rounded-full hover:bg-sand-100 flex items-center justify-center text-sand-600 transition-colors"
                aria-label="Close drawer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {bookingSuccess ? (
                <div className="p-8">
                  <div className="p-6 rounded-lg border border-green-200 bg-green-50 text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h3 className="text-lg font-serif font-medium text-green-900">Booking Confirmed</h3>
                    <p className="text-sm text-green-800">Your reservation has been confirmed. You can review it in your appointments list.</p>
                  </div>
                </div>
              ) : (
                <ReserveModal
                  post={selectedPost}
                  patientCoords={patientCoords}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
