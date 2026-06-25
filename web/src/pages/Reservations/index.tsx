import { useMemo, useState } from 'react';
import { useReservations } from '../../hooks/useReservations';
import { useUiNotifications } from '../../contexts/UiNotificationsProvider';
import { cn } from '../../lib/utils';
import { FeatureHeader } from '../../components/FeatureHeader';
import { LiveQueueTracker } from '../../components/LiveQueueTracker';
import { Calendar, MapPin, DollarSign, Clock, FileText, XCircle, Stethoscope, Ticket } from 'lucide-react';

const STATUS_CLASSES: Record<string, string> = {
  scheduled: 'bg-sky-50 text-sky-700 border-sky-200 shadow-[0_0_10px_rgba(224,242,254,0.5)]',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-[0_0_10px_rgba(209,250,229,0.5)]',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200 shadow-[0_0_10px_rgba(254,243,199,0.5)]',
  completed: 'bg-sand-100 text-sand-700 border-sand-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  no_show: 'bg-sand-100 text-sand-600 border-sand-200',
};

function buildMapsSearchLink(address: string | null | undefined): string | null {
  if (!address || !address.trim()) {
    return null;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function ReservationsPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const { reservations, loading, error, cancel } = useReservations(activeTab);
  const { notifySuccess, notifyError } = useUiNotifications();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const displayedReservations = useMemo(
    () => [...reservations].sort((a, b) => 
      activeTab === 'upcoming' 
        ? new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        : new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
    ),
    [reservations, activeTab]
  );

  const handleCancel = async (id: string, deadline: string) => {
    if (new Date() > new Date(deadline)) {
      setCancelError('Cancellation deadline has passed (24-hour window).');
      return;
    }
    setCancelling(id);
    setCancelError(null);
    try {
      await cancel(id);
      notifySuccess('Reservation cancelled', 'Your appointment was cancelled successfully.');
    } catch (err) {
      notifyError(
        'Cancellation failed',
        `Unable to cancel this reservation. ${err instanceof Error ? err.message : 'Unknown error'}`
      );
      setCancelError(err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setCancelling(null);
    }
  };

  const canCancel = (status: string, deadline: string) =>
    !['cancelled', 'completed', 'no_show'].includes(status) &&
    new Date() < new Date(deadline);

  const renderReservationCard = (res: typeof reservations[number]) => {
    const doctorName = res.doctor
      ? `Dr. ${res.doctor.firstName} ${res.doctor.lastName}`
      : 'Unknown Doctor';
    const specialty = res.doctor?.specialty ?? 'Specialist';
    const clinic = res.doctor?.clinicName ?? res.doctor?.city ?? 'Clinic';
    const clinicAddress = res.doctor?.address ?? null;
    const mapLink = buildMapsSearchLink(clinicAddress ?? clinic);
    const photoUrl = res.doctor?.photoUrl;
    
    const isToday = new Date(res.startAt).toDateString() === new Date().toDateString();
    const isActiveQueue = !['cancelled', 'no_show', 'completed'].includes(res.status);

    return (
      <div 
        key={res.id} 
        className={cn(
          "group relative overflow-hidden bg-white/70 backdrop-blur-md border rounded-2xl p-6 transition-all duration-300",
          isToday && isActiveQueue 
            ? "border-olive-400 shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgb(118,138,99,0.2)]" 
            : "border-sand-200 shadow-sm hover:shadow-md hover:-translate-y-0.5",
          res.status === 'cancelled' && "opacity-75 bg-sand-50/50"
        )}
      >
        {/* Decorative Top Gradient for Active Cards */}
        {isActiveQueue && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-aethea-300 via-olive-400 to-nescafe opacity-80" />
        )}

        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {/* Doctor Avatar Profile */}
          <div className="flex-shrink-0 flex items-center gap-4 sm:flex-col sm:items-center">
            {photoUrl ? (
              <img src={photoUrl} alt={doctorName} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-surface-card shadow-sm" />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-sand-100 border-2 border-white shadow-sm flex items-center justify-center text-sand-400">
                <Stethoscope size={28} strokeWidth={1.5} />
              </div>
            )}
            <div className="sm:hidden flex flex-col">
              <h3 className="text-base font-bold text-sand-900">{doctorName}</h3>
              <p className="text-sm text-sand-500 font-medium">{specialty}</p>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            {/* Header info (Desktop) */}
            <div className="hidden sm:flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-sand-900">{doctorName}</h3>
                <p className="text-sm text-sand-500 font-medium">{specialty}</p>
              </div>
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border capitalize tracking-wide', STATUS_CLASSES[res.status] || 'bg-sand-100 text-sand-600 border-sand-200')}>
                {res.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Mobile Status Badge */}
            <div className="sm:hidden">
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border capitalize tracking-wide', STATUS_CLASSES[res.status] || 'bg-sand-100 text-sand-600 border-sand-200')}>
                {res.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
              <div className="flex items-center gap-2.5 text-sm text-sand-700">
                <div className="w-6 flex justify-center text-olive-500"><MapPin size={16} /></div>
                <span className="font-medium text-sand-900">{clinic}</span>
              </div>
              
              {res.doctorSchedule?.bookingMode === 'token' ? (
                <div className="flex items-center gap-2.5 text-sm text-sand-700">
                  <div className="w-6 flex justify-center text-aethea-500"><Ticket size={16} /></div>
                  <span className="font-medium text-sand-900">Queue Token #{res.slotIndex + 1}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-sm text-sand-700">
                  <div className="w-6 flex justify-center text-aethea-500"><Calendar size={16} /></div>
                  <span className="font-medium text-sand-900">
                    {new Date(res.startAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}

              {res.doctor?.consultFee && (
                <div className="flex items-center gap-2.5 text-sm text-sand-700">
                  <div className="w-6 flex justify-center text-nescafe"><DollarSign size={16} /></div>
                  <span className="font-medium text-sand-900">{res.doctor.consultFee} EGP</span>
                </div>
              )}

              {res.doctorSchedule?.bookingMode !== 'token' && (
                <div className="flex items-center gap-2.5 text-sm text-sand-700">
                  <div className="w-6 flex justify-center text-nescafe"><Clock size={16} /></div>
                  <span className="font-medium text-sand-900">
                    {new Date(res.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              )}

              {res.reason && (
                <div className="flex items-start gap-2.5 text-sm text-sand-700 sm:col-span-2 mt-1">
                  <div className="w-6 flex justify-center text-sand-400 mt-0.5"><FileText size={16} /></div>
                  <span className="italic text-sand-600 line-clamp-2">{res.reason}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-3 mt-2 border-t border-sand-100">
              {canCancel(res.status, res.cancelDeadlineAt) && (
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={cancelling === res.id}
                  onClick={() => handleCancel(res.id, res.cancelDeadlineAt)}
                >
                  <XCircle size={16} />
                  {cancelling === res.id ? 'Cancelling...' : 'Cancel Appointment'}
                </button>
              )}
              {mapLink && (
                <a className="inline-flex items-center gap-1.5 rounded-lg border border-sand-200 bg-white px-4 py-2 text-sm font-bold text-sand-700 transition-colors hover:bg-sand-50 hover:text-sand-900 shadow-sm" href={mapLink} target="_blank" rel="noreferrer">
                  <MapPin size={16} />
                  Get Directions
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Live Queue Tracker - Immediate Visibility for active reservations */}
        {isActiveQueue && (
          <div className="mt-5 w-full">
            <LiveQueueTracker scheduleId={res.doctorScheduleId} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-10 space-y-10">
      <FeatureHeader title="My Appointments" subtitle="Manage your upcoming and past medical reservations" />

      {/* Medicine-Guide Styled Tabs (Always Visible) */}
      <div className="relative z-10 flex flex-wrap justify-start gap-3" role="tablist" aria-label="Appointment Filters">
        {(['upcoming', 'past', 'cancelled'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={cn(
              'rounded-full px-5 py-2 text-[0.85rem] font-bold transition-all shadow-sm backdrop-blur-sm capitalize',
              activeTab === tab 
                ? 'bg-olive-600 text-white shadow-md' 
                : 'bg-sand-200/50 text-sand-800 hover:bg-sand-300/60 border border-transparent hover:border-white/30'
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            <span className={cn("ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs", activeTab === tab ? "bg-white/20 text-white" : "bg-white/50 text-sand-600")}>
              {activeTab === tab ? displayedReservations.length : '...'}
            </span>
          </button>
        ))}
      </div>

      {(error || cancelError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 shadow-sm flex items-center gap-2">
          <XCircle size={20} />
          <span className="font-medium">{error ?? cancelError}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sand-200 border-t-olive-600" />
        </div>
      ) : displayedReservations.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-sm border border-sand-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-sand-100 text-sand-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} />
          </div>
          <h3 className="text-xl font-bold text-sand-900 mb-2">No {activeTab} appointments</h3>
          <p className="text-sand-600 mb-6 max-w-md mx-auto">
            {activeTab === 'upcoming' 
               ? "You haven't booked any upcoming medical reservations. Head over to the marketplace to find the right specialist."
               : `You don't have any ${activeTab} medical reservations.`}
          </p>
          {activeTab === 'upcoming' && (
            <a href="/doctors" className="inline-flex items-center justify-center rounded-full bg-olive-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-olive-700 hover:shadow-lg">
              Find a Doctor
            </a>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {displayedReservations.map(renderReservationCard)}
        </div>
      )}
    </div>
  );
}