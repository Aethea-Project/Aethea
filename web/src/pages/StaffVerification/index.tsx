import React from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { MEDICAL_SPECIALTIES } from '../../constants/medicalSpecialties';

import { useStaffVerification } from '../../hooks/useStaffVerification';

export default function StaffVerificationPage() {
  const { profile, loading, submitting, error, form, setField, submit } = useStaffVerification();

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await submit();
  };

  const status = profile?.verification_status ?? 'unverified';
  const statusTone = status === 'verified'
    ? 'bg-green-50 text-green-700'
    : status === 'rejected'
      ? 'bg-red-50 text-red-700'
      : 'bg-surface text-sand-700';

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <FeatureHeader
        title="Staff Verification"
        subtitle="Submit your documents for identity and affiliation review"
      />

      {error && (
        <div className="rounded-lg border border-sand-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <section className="bg-surface-card border border-sand-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-sand-400 uppercase tracking-wider mb-2">Current Status</h3>
        {loading ? (
          <p className="text-sm text-sand-600">Loading status...</p>
        ) : (
          <>
            <p className="text-sm text-sand-600">
              <span className="font-medium text-sand-900">Status:</span>{' '}
              <span className={`inline-flex items-center rounded-md border border-sand-200 px-2 py-1 text-xs font-medium ${statusTone}`}>
                {status}
              </span>
            </p>
            {profile?.verification_notes && (
              <p className="text-sm text-sand-600">
                <span className="font-medium text-sand-900">Notes:</span> {profile.verification_notes}
              </p>
            )}
          </>
        )}
      </section>

      <section className="bg-surface-card border border-sand-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-sand-400 uppercase tracking-wider mb-4">Verification Submission</h3>
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-sand-700">National ID (14 digits)</label>
            <input
              value={form.nationalId}
              onChange={(e) => setField('nationalId', e.target.value)}
              required
              pattern="^\d{14}$"
              title="Must be exactly 14 digits"
              className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm text-sand-900 focus:border-sand-300 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-sand-700">Medical Syndicate ID</label>
            <input
              value={form.syndicateId}
              onChange={(e) => setField('syndicateId', e.target.value)}
              required
              className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm text-sand-900 focus:border-sand-300 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-sand-700">Ministry of Health License</label>
            <input
              value={form.ministryLicense}
              onChange={(e) => setField('ministryLicense', e.target.value)}
              required
              className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm text-sand-900 focus:border-sand-300 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-sand-700">Specialty</label>
            <select
              value={form.specialty}
              onChange={(e) => setField('specialty', e.target.value)}
              required
              className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm text-sand-900 focus:border-sand-300 focus:outline-none"
            >
              <option value="" disabled>Select a specialty...</option>
              {MEDICAL_SPECIALTIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-sand-700">Affiliation Name</label>
            <input
              value={form.affiliationName}
              onChange={(e) => setField('affiliationName', e.target.value)}
              required
              className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm text-sand-900 focus:border-sand-300 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-sand-700">Affiliation Type</label>
            <select
              value={form.affiliationType}
              onChange={(e) => setField('affiliationType', e.target.value as 'hospital' | 'clinic' | 'pharmacy' | 'other')}
              className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm text-sand-900 focus:border-sand-300 focus:outline-none"
            >
              <option value="hospital">Hospital</option>
              <option value="clinic">Clinic</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-sand-700">Government ID (image/pdf)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setField('governmentIdFile', e.target.files?.[0] ?? null)}
              required
              className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm text-sand-900 file:mr-3 file:rounded-md file:border-0 file:bg-sand-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-sand-700"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-sand-700">Certificate Document (image/pdf)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setField('certificateFile', e.target.files?.[0] ?? null)}
              required
              className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm text-sand-900 file:mr-3 file:rounded-md file:border-0 file:bg-sand-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-sand-700"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-sand-700">Live Selfie (image)</label>
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={(e) => setField('selfieFile', e.target.files?.[0] ?? null)}
              required
              className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm text-sand-900 file:mr-3 file:rounded-md file:border-0 file:bg-sand-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-sand-700"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              className="bg-nescafe text-white text-sm px-4 py-2 rounded-lg hover:bg-nescafe-hover transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={submitting || loading}
            >
              {submitting ? 'Submitting...' : 'Submit For Review'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
