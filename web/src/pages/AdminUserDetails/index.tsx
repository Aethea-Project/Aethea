import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { FeatureHeader } from '../../components/FeatureHeader';

import { adminApi, type AccountType, type AdminProfileUpdatePayload, type AdminUserDetail } from '../../services/adminApi';
import { useUiNotifications } from '../../contexts/UiNotificationsProvider';
import { Card, CardContent } from '../../components/ui/Card';
import { ProfileEditForm } from './ProfileEditForm';
import { AccountControls } from './AccountControls';
import { type AdminUpdateProfileInput } from '../../lib/validations/admin';

export default function AdminUserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useUiNotifications();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);

  const loadUser = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await adminApi.getUserById(id);
      setDetail(data);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isSelfProfile = useMemo(() => {
    return Boolean(detail?.id && user?.id && detail.id === user.id);
  }, [detail?.id, user?.id]);

  // Construct initial form values for presentation layer
  const initialFormData = useMemo<AdminUpdateProfileInput>(() => {
    if (!detail) {
      return {
        firstName: '',
        lastName: '',
        phone: '',
      };
    }

    return {
      firstName: detail.firstName ?? '',
      lastName: detail.lastName ?? '',
      phone: detail.phone ?? '',
    };
  }, [detail]);

  // Compute form updates delta
  const buildProfileUpdatePayload = (
    currentDetail: AdminUserDetail,
    form: AdminUpdateProfileInput
  ): AdminProfileUpdatePayload => {
    const payload: AdminProfileUpdatePayload = {};

    const firstName = form.firstName?.trim() ?? '';
    const lastName = form.lastName?.trim() ?? '';
    const phone = form.phone?.trim() ?? '';

    if (firstName && firstName !== (currentDetail.firstName?.trim() ?? '')) {
      payload.firstName = firstName;
    }
    if (lastName && lastName !== (currentDetail.lastName?.trim() ?? '')) {
      payload.lastName = lastName;
    }

    if (phone !== (currentDetail.phone?.trim() ?? '')) {
      payload.phone = phone || undefined;
    }

    return payload;
  };

  const handleSaveProfile = async (formData: AdminUpdateProfileInput) => {
    if (!id || !detail) return;

    setSaving(true);
    try {
      const payload = buildProfileUpdatePayload(detail, formData);

      if (Object.keys(payload).length === 0) {
        notifySuccess('No profile changes to save.');
        return;
      }

      const updated = await adminApi.updateUserProfile(id, payload);
      setDetail(updated);
      notifySuccess('Profile updated successfully.');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err; // propagate to form to prevent resetting dirtiness
    } finally {
      setSaving(false);
    }
  };

  const handleChangeAccountType = async (nextType: AccountType) => {
    if (!id || !detail || detail.accountType === nextType) return;

    setSaving(true);
    try {
      await adminApi.updateUserAccountType(id, nextType);
      await loadUser();
      notifySuccess('Account type updated successfully.');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to update account type');
    } finally {
      setSaving(false);
    }
  };

  const handleSendPasswordResetLink = async () => {
    if (!id) return;

    setSaving(true);
    try {
      const result = await adminApi.sendUserPasswordResetLink(id);
      notifySuccess(`Password reset link sent to ${result.email}.`);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to send password reset link');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!id) return;

    setSaving(true);
    try {
      await adminApi.deleteUser(id);
      notifySuccess('Account deleted permanently.');
      navigate('/admin/users', { replace: true });
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to delete account');
      setSaving(false);
    }
  };

  const getStatusChipStyles = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-sand-100 text-sand-800 border-sand-200/60';
      case 'pending':
        return 'bg-sand-50 text-sand-900 border-sand-200/60';
      case 'suspended':
        return 'bg-sand-200 text-sand-900 border-sand-300/60';
      case 'rejected':
        return 'bg-surface-card text-sand-500 border-sand-200/60';
      default:
        return 'bg-sand-50 text-sand-800 border-sand-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-10 space-y-12">
      
      {/* Header back navigation link */}
      <div className="flex justify-between items-center">
        <Link
          to="/admin/users"
          className="inline-flex items-center text-xs font-semibold text-sand-500 hover:text-sand-700 transition-colors gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sand-500 rounded"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to staff console
        </Link>
      </div>

      <FeatureHeader
        title="User Account Details"
        subtitle="Review, edit, convert account type, or remove account"
      />

      {loading || !detail ? (
        <div className="py-12 text-center text-sm text-sand-500">
          Loading user details...
        </div>
      ) : (
        <>
          {/* Metadata Read-only Summary */}
          <Card className="shadow-sm">
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">User ID</span>
                <span className="text-sm font-medium text-sand-900 block truncate" title={detail.id}>{detail.id}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">Email Address</span>
                <span className="text-sm font-medium text-sand-900 block truncate" title={detail.email ?? '—'}>
                  {detail.email ?? '—'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">Status</span>
                <div>
                  <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${getStatusChipStyles(detail.accountStatus)}`}>
                    {detail.accountStatus}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">Last Sign-In</span>
                <span className="text-sm font-medium text-sand-600 block">
                  {detail.lastSignInAt ? new Date(detail.lastSignInAt).toLocaleString() : 'Never'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider block">Created On</span>
                <span className="text-sm font-medium text-sand-600 block">
                  {new Date(detail.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Sub-Forms */}
          <ProfileEditForm
            initialData={initialFormData}
            onSubmit={handleSaveProfile}
            saving={saving}
          />

          <AccountControls
            currentAccountType={detail.accountType}
            isSelfProfile={isSelfProfile}
            saving={saving}
            onChangeAccountType={handleChangeAccountType}
            onSendResetLink={handleSendPasswordResetLink}
            onDeleteAccount={handleDeleteAccount}
          />
        </>
      )}
    </div>
  );
}
