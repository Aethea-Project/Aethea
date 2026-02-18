import React, { useEffect, useMemo, useState } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import './styles.css';
import { medicalApi, ReservationPayload, ReservationStatus } from '../../services/medicalApi';

interface ReservationView {
  id: string;
  doctorName: string;
  specialty: string;
  reason: string;
  location: string;
  startAt: string;
  endAt?: string | null;
  status: ReservationStatus;
  notes?: string | null;
}

const statusOptions: ReservationStatus[] = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<ReservationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ReservationPayload>({
    doctorName: '',
    specialty: '',
    reason: '',
    location: '',
    startAt: new Date().toISOString().slice(0, 16), // yyyy-MM-ddTHH:mm
    endAt: '',
    status: 'scheduled',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await medicalApi.fetchReservations();
      setReservations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (field: keyof ReservationPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await medicalApi.createReservation({
        ...form,
        startAt: new Date(form.startAt).toISOString(),
        endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
      });
      await fetchData();
      setForm({ ...form, reason: '', notes: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reservation');
    }
  };

  const handleStatusUpdate = async (id: string, status: ReservationStatus) => {
    try {
      await medicalApi.updateReservation(id, { status });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reservation');
    }
  };

  const sortedReservations = useMemo(
    () => [...reservations].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [reservations]
  );

  return (
    <div className="reservations-page">
      <FeatureHeader
        title="Appointments"
        subtitle="View and manage your reservations"
        variant="doc"
        imageSrc={imageAssets.headers.doctor}
        imageAlt="Medical appointments"
      />

      {error && <div className="error">{error}</div>}

      <div className="form-card">
        <h3>Book a new appointment</h3>
        <form onSubmit={handleCreate} className="form-grid">
          <div className="form-control">
            <label>Doctor</label>
            <input value={form.doctorName} onChange={(e) => handleChange('doctorName', e.target.value)} required />
          </div>
          <div className="form-control">
            <label>Specialty</label>
            <input value={form.specialty} onChange={(e) => handleChange('specialty', e.target.value)} required />
          </div>
          <div className="form-control">
            <label>Location</label>
            <input value={form.location} onChange={(e) => handleChange('location', e.target.value)} required />
          </div>
          <div className="form-control">
            <label>Start</label>
            <input type="datetime-local" value={form.startAt} onChange={(e) => handleChange('startAt', e.target.value)} required />
          </div>
          <div className="form-control">
            <label>End (optional)</label>
            <input type="datetime-local" value={form.endAt} onChange={(e) => handleChange('endAt', e.target.value)} />
          </div>
          <div className="form-control">
            <label>Status</label>
            <select value={form.status} onChange={(e) => handleChange('status', e.target.value as ReservationStatus)}>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="form-control" style={{ gridColumn: '1 / -1' }}>
            <label>Reason</label>
            <textarea value={form.reason} onChange={(e) => handleChange('reason', e.target.value)} required />
          </div>
          <div className="form-control" style={{ gridColumn: '1 / -1' }}>
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} />
          </div>
          <div className="res-actions" style={{ gridColumn: '1 / -1', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Create</button>
          </div>
        </form>
      </div>

      {loading ? (
        <p className="loading">Loading appointments…</p>
      ) : (
        sortedReservations.map((res) => (
          <div key={res.id} className="res-card">
            <div className="res-row"><span className="res-label">Doctor</span><span>{res.doctorName}</span></div>
            <div className="res-row"><span className="res-label">Specialty</span><span>{res.specialty}</span></div>
            <div className="res-row"><span className="res-label">Reason</span><span>{res.reason}</span></div>
            <div className="res-row"><span className="res-label">Location</span><span>{res.location}</span></div>
            <div className="res-row"><span className="res-label">Start</span><span>{new Date(res.startAt).toLocaleString()}</span></div>
            <div className="res-row"><span className="res-label">End</span><span>{res.endAt ? new Date(res.endAt).toLocaleString() : '—'}</span></div>
            <div className="res-row"><span className="res-label">Status</span><span className={`res-status ${res.status}`}>{res.status.replace('_', ' ')}</span></div>
            <div className="res-row"><span className="res-label">Notes</span><span>{res.notes || '—'}</span></div>
            <div className="res-buttons">
              {statusOptions.map((s) => (
                <button key={s} className="btn btn-ghost" onClick={() => handleStatusUpdate(res.id, s)} disabled={res.status === s}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
