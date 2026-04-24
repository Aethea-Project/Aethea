import { useMemo, useState } from 'react';
import { useReservations } from '../../hooks/useReservations';
import { useUiNotifications } from '../../contexts/UiNotificationsProvider';
import { cn } from '../../lib/utils';

const STATUS_CLASSES: Record<string, string> = {
  scheduled: 'bg-sky-100 text-sky-700',
  confirmed: 'bg-teal-100 text-teal-700',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-slate-100 text-slate-600',
};

function buildMapsSearchLink(address: string | null | undefined): string | null {
  if (!address || !address.trim()) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function ReservationsPage() {
  const { reservations, loading, error, cancel } = useReservations();
  const { notifySuccess, notifyError } = useUiNotifications();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...reservations].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [reservations],
  );

  const handleCancel = async (id: string, deadline: string) => {
    if (new Date() > new Date(deadline)) {
      setCancelError('Cancellation deadline has passed (6-hour window).');
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
        'Unable to cancel this reservation.',
        err instanceof Error ? err.message : 'Unknown error',
      );
      setCancelError(err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setCancelling(null);
    }
  };

  const canCancel = (status: string, deadline: string) =>
    !['cancelled', 'completed', 'no_show'].includes(status) &&
    new Date() < new Date(deadline);

  const now = new Date();
  const currentReservations = sorted.filter((res) =>
    res.status !== 'cancelled' &&
    !['completed', 'no_show'].includes(res.status) &&
    new Date(res.endAt) >= now,
  );
  const pastReservations = sorted.filter((res) =>
    res.status !== 'cancelled' &&
    (['completed', 'no_show'].includes(res.status) || new Date(res.endAt) < now),
  );
  const cancelledReservations = sorted.filter((res) => res.status === 'cancelled');

  const renderReservationCard = (res: typeof reservations[number]) => {
    const doctorName = res.doctor
      ? `Dr. ${res.doctor.firstName} ${res.doctor.lastName}`
      : 'Unknown Doctor';
    const specialty = res.doctor?.specialty ?? '';
    const clinic = res.doctor?.clinicName ?? res.doctor?.city ?? '';
    const clinicAddress = res.doctor?.address ?? null;
    const mapLink = buildMapsSearchLink(clinicAddress ?? clinic);

    return (
      <div key={res.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex gap-2 text-sm text-slate-700"><span className="text-slate-500 font-semibold min-w-24">Doctor</span><span>{doctorName}</span></div>
        {specialty && <div className="flex gap-2 text-sm text-slate-700"><span className="text-slate-500 font-semibold min-w-24">Specialty</span><span>{specialty}</span></div>}
        {clinic && <div className="flex gap-2 text-sm text-slate-700"><span className="text-slate-500 font-semibold min-w-24">Clinic</span><span>{clinic}</span></div>}
        {res.doctor?.consultFee && <div className="flex gap-2 text-sm text-slate-700"><span className="text-slate-500 font-semibold min-w-24">Fee</span><span>{res.doctor.consultFee} EGP</span></div>}
        {clinicAddress && <div className="flex gap-2 text-sm text-slate-700"><span className="text-slate-500 font-semibold min-w-24">Address</span><span>{clinicAddress}</span></div>}
        <div className="flex gap-2 text-sm text-slate-700"><span className="text-slate-500 font-semibold min-w-24">Reason</span><span>{res.reason}</span></div>
        <div className="flex gap-2 text-sm text-slate-700"><span className="text-slate-500 font-semibold min-w-24">Start</span><span>{new Date(res.startAt).toLocaleString()}</span></div>
        <div className="flex gap-2 text-sm text-slate-700"><span className="text-slate-500 font-semibold min-w-24">End</span><span>{new Date(res.endAt).toLocaleString()}</span></div>
        <div className="flex gap-2 text-sm text-slate-700">
          <span className="text-slate-500 font-semibold min-w-24">Status</span>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize', STATUS_CLASSES[res.status] || 'bg-slate-100 text-slate-600')}>
            {res.status.replace(/_/g, ' ')}
          </span>
        </div>
        {res.notes && <div className="flex gap-2 text-sm text-slate-700"><span className="text-slate-500 font-semibold min-w-24">Notes</span><span>{res.notes}</span></div>}
        <div className="flex gap-2 text-sm text-slate-700">
          <span className="text-slate-500 font-semibold min-w-24">Cancel by</span>
          <span>{new Date(res.cancelDeadlineAt).toLocaleString()}</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-2 sm:col-span-2">
          {canCancel(res.status, res.cancelDeadlineAt) && (
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={cancelling === res.id}
              onClick={() => handleCancel(res.id, res.cancelDeadlineAt)}
            >
              {cancelling === res.id ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
          {mapLink && (
            <a className="no-underline inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50" href={mapLink} target="_blank" rel="noreferrer">
              Open Clinic Location
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[900px] px-6 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-5">My Appointments</h1>

      {(error || cancelError) && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error ?? cancelError}
        </div>
      )}

      {loading ? (
        <p className="text-slate-700 py-4">Loading appointments...</p>
      ) : sorted.length === 0 ? (
        <p className="text-slate-700 py-4">No appointments yet. Use Appointments Marketplace to book one.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="current-reservations-title">
            <div className="flex items-center justify-between mb-3">
              <h2 id="current-reservations-title" className="text-base font-bold text-slate-900">Current Reservations</h2>
              <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                {currentReservations.length}
              </span>
            </div>
            {currentReservations.length === 0 ? (
              <p className="text-slate-700 py-2">No current reservations.</p>
            ) : (
              currentReservations.map((res) => renderReservationCard(res))
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="past-reservations-title">
            <div className="flex items-center justify-between mb-3">
              <h2 id="past-reservations-title" className="text-base font-bold text-slate-900">Past Reservations</h2>
              <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                {pastReservations.length}
              </span>
            </div>
            {pastReservations.length === 0 ? (
              <p className="text-slate-700 py-2">No past reservations.</p>
            ) : (
              pastReservations.map((res) => renderReservationCard(res))
            )}
          </section>

          {cancelledReservations.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="cancelled-reservations-title">
              <div className="flex items-center justify-between mb-3">
                <h2 id="cancelled-reservations-title" className="text-base font-bold text-slate-900">Cancelled Reservations</h2>
                <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                  {cancelledReservations.length}
                </span>
              </div>
              {cancelledReservations.map((res) => renderReservationCard(res))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}