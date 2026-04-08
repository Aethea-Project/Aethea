import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { validatePassword } from '@core/auth/auth-utils';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import { adminApi, type AccountType, type AdminProfileUpdatePayload, type AdminUserDetail } from '../../services/adminApi';
import './styles.css';

const accountTypes: AccountType[] = ['patient', 'doctor', 'pharmacist', 'admin'];
const TEMP_PASSWORD_MIN = 8;
const bloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

interface PasswordRequirement {
  id: 'length' | 'uppercase' | 'lowercase' | 'number' | 'special';
  label: string;
  met: boolean;
}

const normalizeDateOnly = (value: string | null | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  return String(value).slice(0, 10);
};

const normalizeGender = (value: unknown): 'male' | 'female' | undefined => {
  return value === 'male' || value === 'female' ? value : undefined;
};

const normalizeBloodType = (value: unknown): AdminProfileUpdatePayload['bloodType'] => {
  return bloodTypeOptions.includes(value as (typeof bloodTypeOptions)[number])
    ? (value as AdminProfileUpdatePayload['bloodType'])
    : undefined;
};

export default function AdminUserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);

  const [profileForm, setProfileForm] = useState<AdminProfileUpdatePayload>({});
  const [nextAccountType, setNextAccountType] = useState<AccountType>('patient');

  const loadUser = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const data = await adminApi.getUserById(id);
      setDetail(data);
      setNextAccountType(data.accountType);
      setProfileForm({
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        gender: normalizeGender(data.gender),
        phone: data.phone ?? '',
        dateOfBirth: normalizeDateOnly(data.dateOfBirth) ?? '',
        bloodType: normalizeBloodType(data.bloodType),
        allergies: data.allergies ?? '',
        chronicConditions: data.chronicConditions ?? '',
        heightCm: data.heightCm ?? undefined,
        weightKg: data.weightKg ?? undefined,
        emergencyContactName: data.emergencyContactName ?? '',
        emergencyContactPhone: data.emergencyContactPhone ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canSubmitProfile = useMemo(() => {
    return Boolean(profileForm.firstName?.trim() && profileForm.lastName?.trim());
  }, [profileForm.firstName, profileForm.lastName]);

  const isSelfProfile = useMemo(() => {
    return Boolean(detail?.id && user?.id && detail.id === user.id);
  }, [detail?.id, user?.id]);

  const normalizedTemporaryPassword = useMemo(() => temporaryPassword.trim(), [temporaryPassword]);

  const temporaryPasswordRequirements = useMemo<PasswordRequirement[]>(() => {
    const value = normalizedTemporaryPassword;
    return [
      { id: 'length', label: 'At least 8 characters', met: value.length >= TEMP_PASSWORD_MIN },
      { id: 'uppercase', label: 'One uppercase letter', met: /[A-Z]/.test(value) },
      { id: 'lowercase', label: 'One lowercase letter', met: /[a-z]/.test(value) },
      { id: 'number', label: 'One number', met: /[0-9]/.test(value) },
      { id: 'special', label: 'One special character', met: /[^A-Za-z0-9\s]/.test(value) },
    ];
  }, [normalizedTemporaryPassword]);

  const temporaryPasswordValidation = useMemo(
    () => validatePassword(normalizedTemporaryPassword),
    [normalizedTemporaryPassword],
  );

  const canApplyTemporaryPassword = useMemo(() => {
    return !saving && !isSelfProfile && temporaryPasswordValidation.valid;
  }, [saving, isSelfProfile, temporaryPasswordValidation.valid]);

  const canSendPasswordResetLink = useMemo(() => {
    return !saving && !isSelfProfile;
  }, [saving, isSelfProfile]);

  const buildProfileUpdatePayload = (currentDetail: AdminUserDetail, form: AdminProfileUpdatePayload): AdminProfileUpdatePayload => {
    const payload: AdminProfileUpdatePayload = {};

    const firstName = form.firstName?.trim() ?? '';
    const lastName = form.lastName?.trim() ?? '';
    const phone = form.phone?.trim() ?? '';
    const allergies = form.allergies?.trim() ?? '';
    const chronicConditions = form.chronicConditions?.trim() ?? '';
    const emergencyContactName = form.emergencyContactName?.trim() ?? '';
    const emergencyContactPhone = form.emergencyContactPhone?.trim() ?? '';
    const dateOfBirth = normalizeDateOnly(form.dateOfBirth);
    const detailDateOfBirth = normalizeDateOnly(currentDetail.dateOfBirth);

    if (firstName && firstName !== (currentDetail.firstName?.trim() ?? '')) payload.firstName = firstName;
    if (lastName && lastName !== (currentDetail.lastName?.trim() ?? '')) payload.lastName = lastName;

    const gender = normalizeGender(form.gender);
    const detailGender = normalizeGender(currentDetail.gender);
    if (gender && gender !== detailGender) payload.gender = gender;

    if (phone && phone !== (currentDetail.phone?.trim() ?? '')) payload.phone = phone;

    const bloodType = normalizeBloodType(form.bloodType);
    const detailBloodType = normalizeBloodType(currentDetail.bloodType);
    if (bloodType && bloodType !== detailBloodType) payload.bloodType = bloodType;

    if (dateOfBirth && dateOfBirth !== detailDateOfBirth) payload.dateOfBirth = dateOfBirth;

    if (allergies && allergies !== (currentDetail.allergies?.trim() ?? '')) payload.allergies = allergies;
    if (chronicConditions && chronicConditions !== (currentDetail.chronicConditions?.trim() ?? '')) {
      payload.chronicConditions = chronicConditions;
    }

    if (typeof form.heightCm === 'number' && Number.isFinite(form.heightCm) && form.heightCm !== currentDetail.heightCm) {
      payload.heightCm = form.heightCm;
    }

    if (typeof form.weightKg === 'number' && Number.isFinite(form.weightKg) && form.weightKg !== currentDetail.weightKg) {
      payload.weightKg = form.weightKg;
    }

    if (emergencyContactName && emergencyContactName !== (currentDetail.emergencyContactName?.trim() ?? '')) {
      payload.emergencyContactName = emergencyContactName;
    }

    if (emergencyContactPhone && emergencyContactPhone !== (currentDetail.emergencyContactPhone?.trim() ?? '')) {
      payload.emergencyContactPhone = emergencyContactPhone;
    }

    return payload;
  };

  const onSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !detail || !canSubmitProfile) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = buildProfileUpdatePayload(detail, profileForm);

      if (Object.keys(payload).length === 0) {
        setMessage('No profile changes to save.');
        return;
      }

      const updated = await adminApi.updateUserProfile(id, payload);
      setDetail(updated);
      setProfileForm({
        firstName: updated.firstName ?? '',
        lastName: updated.lastName ?? '',
        gender: normalizeGender(updated.gender),
        phone: updated.phone ?? '',
        dateOfBirth: normalizeDateOnly(updated.dateOfBirth) ?? '',
        bloodType: normalizeBloodType(updated.bloodType),
        allergies: updated.allergies ?? '',
        chronicConditions: updated.chronicConditions ?? '',
        heightCm: updated.heightCm ?? undefined,
        weightKg: updated.weightKg ?? undefined,
        emergencyContactName: updated.emergencyContactName ?? '',
        emergencyContactPhone: updated.emergencyContactPhone ?? '',
      });
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const onChangeAccountType = async () => {
    if (!id || !detail || detail.accountType === nextAccountType) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await adminApi.updateUserAccountType(id, nextAccountType);
      await loadUser();
      setMessage('Account type updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account type');
    } finally {
      setSaving(false);
    }
  };

  const onResetTemporaryPassword = async () => {
    if (!id) return;

    if (isSelfProfile) {
      setError('You cannot set a temporary password for your own admin account.');
      return;
    }

    if (!temporaryPasswordValidation.valid) {
      setError(temporaryPasswordValidation.error ?? 'Temporary password does not meet the required policy.');
      return;
    }

    const confirmed = window.confirm(
      'This will revoke all active sessions for this user and force a password change at next sign-in. Continue?',
    );
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await adminApi.resetUserTemporaryPassword(id, normalizedTemporaryPassword);
      setTemporaryPassword('');
      await loadUser();
      setMessage(`Temporary password applied. Revoked sessions: ${result.revokedSessions}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set temporary password');
    } finally {
      setSaving(false);
    }
  };

  const onSendPasswordResetLink = async () => {
    if (!id) return;

    if (isSelfProfile) {
      setError('Use the Forgot Password flow for your own account.');
      return;
    }

    const confirmed = window.confirm(
      'This will send a password reset email to the user. Continue?',
    );
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await adminApi.sendUserPasswordResetLink(id);
      setMessage(`Password reset link sent to ${result.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset link');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteAccount = async () => {
    if (!id) return;
    const confirmed = window.confirm('This will permanently delete the account. Continue?');
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await adminApi.deleteUser(id);
      navigate('/admin/users', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setSaving(false);
    }
  };

  return (
    <div className="admin-user-details-page">
      <FeatureHeader
        title="User Account Details"
        subtitle="Review, edit, convert account type, or remove account"
        variant="doc"
        imageSrc={imageAssets.headers.doctor}
        imageAlt="User account details"
      />

      {error && <div className="error-banner">{error}</div>}
      {message && <div className="success-banner">{message}</div>}

      {loading || !detail ? (
        <p className="loading">Loading user details...</p>
      ) : (
        <>
          <section className="details-card">
            <div className="details-row"><strong>User ID</strong><span>{detail.id}</span></div>
            <div className="details-row"><strong>Email</strong><span>{detail.email ?? '—'}</span></div>
            <div className="details-row"><strong>Status</strong><span className={`status-chip ${detail.accountStatus}`}>{detail.accountStatus}</span></div>
            <div className="details-row"><strong>Last Sign-In</strong><span>{detail.lastSignInAt ? new Date(detail.lastSignInAt).toLocaleString() : 'Never signed in'}</span></div>
            <div className="details-row"><strong>Created</strong><span>{new Date(detail.createdAt).toLocaleString()}</span></div>
          </section>

          <section className="details-card">
            <h3>Edit Profile</h3>
            <form className="details-form-grid" onSubmit={onSaveProfile}>
              <label>
                First Name
                <input
                  value={profileForm.firstName ?? ''}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </label>
              <label>
                Last Name
                <input
                  value={profileForm.lastName ?? ''}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  required
                />
              </label>
              <label>
                Gender
                <select
                  value={profileForm.gender ?? ''}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, gender: (e.target.value || undefined) as 'male' | 'female' | undefined }))}
                >
                  <option value="">Not set</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
              <label>
                Phone
                <input
                  value={profileForm.phone ?? ''}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </label>
              <label>
                Date of Birth
                <input
                  type="date"
                  value={profileForm.dateOfBirth ?? ''}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                />
              </label>
              <label>
                Blood Type
                <select
                  value={profileForm.bloodType ?? ''}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, bloodType: (e.target.value || undefined) as AdminProfileUpdatePayload['bloodType'] }))}
                >
                  <option value="">Not set</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </label>
              <label>
                Height (cm)
                <input
                  type="number"
                  min={30}
                  max={300}
                  value={profileForm.heightCm ?? ''}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, heightCm: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </label>
              <label>
                Weight (kg)
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={profileForm.weightKg ?? ''}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, weightKg: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </label>
              <label>
                Emergency Contact Name
                <input
                  value={profileForm.emergencyContactName ?? ''}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                />
              </label>
              <label>
                Emergency Contact Phone
                <input
                  value={profileForm.emergencyContactPhone ?? ''}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))}
                />
              </label>
              <label className="full-width">
                Allergies
                <textarea
                  rows={2}
                  value={profileForm.allergies ?? ''}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, allergies: e.target.value }))}
                />
              </label>
              <label className="full-width">
                Chronic Conditions
                <textarea
                  rows={2}
                  value={profileForm.chronicConditions ?? ''}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, chronicConditions: e.target.value }))}
                />
              </label>
              <div className="details-actions full-width">
                <button type="submit" className="btn btn-primary" disabled={saving || !canSubmitProfile}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </section>

          <section className="details-card">
            <h3>Account Controls</h3>
            <div className="details-control-row">
              <label>
                Account Type
                <select
                  value={nextAccountType}
                  onChange={(e) => setNextAccountType(e.target.value as AccountType)}
                >
                  {accountTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={saving || nextAccountType === detail.accountType}
                onClick={() => void onChangeAccountType()}
              >
                Update Account Type
              </button>
            </div>

            <div className="temp-password-box">
              <label>
                Temporary Password
                <div className="temp-password-input-wrap">
                  <input
                    type={showTemporaryPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={TEMP_PASSWORD_MIN}
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    placeholder="Set a temporary password"
                  />
                  <button
                    type="button"
                    className="temp-password-icon-btn"
                    aria-label={showTemporaryPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowTemporaryPassword((prev) => !prev)}
                  >
                    {showTemporaryPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>
              <ul className="temp-password-checklist" aria-label="Temporary password requirements">
                {temporaryPasswordRequirements.map((requirement) => (
                  <li key={requirement.id} className={requirement.met ? 'met' : ''}>
                    <span className="check-icon" aria-hidden="true">{requirement.met ? '✓' : '✗'}</span>
                    {requirement.label}
                  </li>
                ))}
              </ul>
              <div className="temp-password-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={!canSendPasswordResetLink}
                  onClick={() => void onSendPasswordResetLink()}
                >
                  Send Reset Link
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={!canApplyTemporaryPassword}
                  onClick={() => void onResetTemporaryPassword()}
                >
                  Set Temporary Password
                </button>
              </div>
              {isSelfProfile && (
                <p className="temp-password-hint">For your account, use the Change Password flow from your profile page.</p>
              )}
            </div>

            <div className="danger-zone">
              <p>Permanently remove this account and linked records.</p>
              <button type="button" className="btn btn-danger" disabled={saving} onClick={() => void onDeleteAccount()}>
                Delete Account
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
