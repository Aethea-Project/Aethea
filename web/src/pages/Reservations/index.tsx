import { useMemo, useState } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import './styles.css';
import { useReservations } from '../../hooks/useReservations';

export default function ReservationsPage() {
  const { reservations, loading, error, cancel } = useReservations();
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
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setCancelling(null);
    }
  };

  const canCancel = (status: string, deadline: string) =>
    !['cancelled', 'completed', 'no_show'].includes(status) &&
    new Date() < new Date(deadline);

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
        <p className="loading">No appointments yet. Use Doctor Finder to book one.</p>
      ) : (
        sorted.map((res) => {
          const doctorName = res.doctor
            ? `Dr. ${res.doctor.firstName} ${res.doctor.lastName}`
            : 'Unknown Doctor';
          const specialty = res.doctor?.specialty ?? '';
          const clinic = res.doctor?.clinicName ?? res.doctor?.city ?? '';

          return (
            <div key={res.id} className="res-card">
              <div className="res-row"><span className="res-label">Doctor</span><span>{doctorName}</span></div>
              {specialty && <div className="res-row"><span className="res-label">Specialty</span><span>{specialty}</span></div>}
              {clinic && <div className="res-row"><span className="res-label">Clinic</span><span>{clinic}</span></div>}
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
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}