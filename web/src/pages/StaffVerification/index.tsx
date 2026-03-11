import React from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import { useStaffVerification } from '../../hooks/useStaffVerification';
import './styles.css';

export default function StaffVerificationPage() {
  const { profile, loading, submitting, error, form, setField, submit } = useStaffVerification();

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await submit();
  };

  return (
    <div className="staff-verification-page">
      <FeatureHeader
        title="Staff Verification"
        subtitle="Submit your documents for identity and affiliation review"
        variant="doc"
        imageSrc={imageAssets.headers.doctor}
        imageAlt="Staff verification"
      />

      {error && <div className="error-banner">{error}</div>}

      <section className="status-card">
        <h3>Current Status</h3>
        {loading ? (
          <p>Loading status...</p>
        ) : (
          <>
            <p>
              <strong>Status:</strong>{' '}
              <span className={`status-chip ${profile?.verification_status ?? 'unverified'}`}>
                {profile?.verification_status ?? 'unverified'}
              </span>
            </p>
            {profile?.verification_notes && (
              <p><strong>Notes:</strong> {profile.verification_notes}</p>
            )}
          </>
        )}
      </section>

      <section className="form-card">
        <h3>Verification Submission</h3>
        <form className="verification-form" onSubmit={onSubmit}>
          <div className="form-control">
            <label>Specialty</label>
            <input value={form.specialty} onChange={(e) => setField('specialty', e.target.value)} required />
          </div>

          <div className="form-control">
            <label>Affiliation Name</label>
            <input value={form.affiliationName} onChange={(e) => setField('affiliationName', e.target.value)} required />
          </div>

          <div className="form-control">
            <label>Affiliation Type</label>
            <select value={form.affiliationType} onChange={(e) => setField('affiliationType', e.target.value as 'hospital' | 'clinic' | 'pharmacy' | 'other')}>
              <option value="hospital">Hospital</option>
              <option value="clinic">Clinic</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-control">
            <label>Government ID (image/pdf)</label>
            <input type="file" accept="image/*,.pdf" onChange={(e) => setField('governmentIdFile', e.target.files?.[0] ?? null)} required />
          </div>

          <div className="form-control">
            <label>Certificate Document (image/pdf)</label>
            <input type="file" accept="image/*,.pdf" onChange={(e) => setField('certificateFile', e.target.files?.[0] ?? null)} required />
          </div>

          <div className="form-control">
            <label>Live Selfie (image)</label>
            <input type="file" accept="image/*" capture="user" onChange={(e) => setField('selfieFile', e.target.files?.[0] ?? null)} required />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting || loading}>
              {submitting ? 'Submitting...' : 'Submit For Review'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
