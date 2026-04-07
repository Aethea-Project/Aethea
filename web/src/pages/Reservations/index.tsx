import { useMemo, useState } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import './styles.css';
import { useReservations } from '../../hooks/useReservations';
import { useUiNotifications } from '../../contexts/UiNotificationsProvider';

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
      <div key={res.id} className="res-card">
        <div className="res-row"><span className="res-label">Doctor</span><span>{doctorName}</span></div>
        {specialty && <div className="res-row"><span className="res-label">Specialty</span><span>{specialty}</span></div>}
        {clinic && <div className="res-row"><span className="res-label">Clinic</span><span>{clinic}</span></div>}
        {clinicAddress && <div className="res-row"><span className="res-label">Address</span><span>{clinicAddress}</span></div>}
        <div className="res-row"><span className="res-label">Reason</span><span>{res.reason}</span></div>
        <div className="res-row"><span className="res-label">Start</span><span>{new Date(res.startAt).toLocaleString()}</span></div>
        <div className="res-row"><span className="res-label">End</span><span>{new Date(res.endAt).toLocaleString()}</span></div>
        <div className="res-row">
          <span className="res-label">Status</span>
          <span className={`res-status ${res.status}`}>{res.status.replace(/_/g, ' ')}</span>
        </div>
        {res.notes && <div className="res-row"><span className="res-label">Notes</span><span>{res.notes}</span></div>}
        <div className="res-row">
          <span className="res-label">Cancel by</span>
          <span>{new Date(res.cancelDeadlineAt).toLocaleString()}</span>
        </div>
        <div className="res-buttons">
          {canCancel(res.status, res.cancelDeadlineAt) && (
            <button
              className="btn btn-ghost"
              disabled={cancelling === res.id}
              onClick={() => handleCancel(res.id, res.cancelDeadlineAt)}
            >
              {cancelling === res.id ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
          {mapLink && (
            <a className="btn btn-ghost" href={mapLink} target="_blank" rel="noreferrer">
              Open Clinic Location
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="reservations-page">
      <FeatureHeader
        title="My Appointments"
        subtitle="View and manage your upcoming reservations"
        variant="doc"
        imageSrc={imageAssets.headers.doctor}
        imageAlt="Medical appointments"
      />

      {(error || cancelError) && (
        <div className="error">{error ?? cancelError}</div>
      )}

      {loading ? (
        <p className="loading">Loading appointments...</p>
      ) : sorted.length === 0 ? (
        <p className="loading">No appointments yet. Use Appointments Marketplace to book one.</p>
      ) : (
        <div className="res-sections">
          <section className="res-section" aria-labelledby="current-reservations-title">
            <div className="res-section-head">
              <h2 id="current-reservations-title" className="res-section-title">Current Reservations</h2>
              <span className="res-count">{currentReservations.length}</span>
            </div>
            {currentReservations.length === 0 ? (
              <p className="loading">No current reservations.</p>
            ) : (
              currentReservations.map((res) => renderReservationCard(res))
            )}
          </section>

          <section className="res-section" aria-labelledby="past-reservations-title">
            <div className="res-section-head">
              <h2 id="past-reservations-title" className="res-section-title">Past Reservations</h2>
              <span className="res-count">{pastReservations.length}</span>
            </div>
            {pastReservations.length === 0 ? (
              <p className="loading">No past reservations.</p>
            ) : (
              pastReservations.map((res) => renderReservationCard(res))
            )}
          </section>

          {cancelledReservations.length > 0 && (
            <section className="res-section" aria-labelledby="cancelled-reservations-title">
              <div className="res-section-head">
                <h2 id="cancelled-reservations-title" className="res-section-title">Cancelled Reservations</h2>
                <span className="res-count">{cancelledReservations.length}</span>
              </div>
              {cancelledReservations.map((res) => renderReservationCard(res))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}