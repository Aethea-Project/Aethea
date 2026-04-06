import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import { adminApi, type AccountType, type AdminProfileUpdatePayload, type AdminUserDetail } from '../../services/adminApi';
import './styles.css';

const accountTypes: AccountType[] = ['patient', 'doctor', 'pharmacist', 'admin'];

export default function AdminUserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);

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
        gender: data.gender ?? undefined,
        phone: data.phone ?? '',
        dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth).slice(0, 10) : '',
        bloodType: (data.bloodType as AdminProfileUpdatePayload['bloodType']) ?? undefined,
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

  const onSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !canSubmitProfile) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload: AdminProfileUpdatePayload = {
        firstName: profileForm.firstName?.trim() || undefined,
        lastName: profileForm.lastName?.trim() || undefined,
        gender: profileForm.gender,
        phone: profileForm.phone?.trim() || undefined,
        dateOfBirth: profileForm.dateOfBirth || undefined,
        bloodType: profileForm.bloodType,
        allergies: profileForm.allergies?.trim() || undefined,
        chronicConditions: profileForm.chronicConditions?.trim() || undefined,
        heightCm: profileForm.heightCm,
        weightKg: profileForm.weightKg,
        emergencyContactName: profileForm.emergencyContactName?.trim() || undefined,
        emergencyContactPhone: profileForm.emergencyContactPhone?.trim() || undefined,
      };

      const updated = await adminApi.updateUserProfile(id, payload);
      setDetail(updated);
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
