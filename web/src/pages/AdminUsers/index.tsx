import React, { useState, useEffect } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { useUiNotifications } from '../../contexts/UiNotificationsProvider';

import { useAdminUsers } from '../../hooks/useAdminUsers';
import { AccountStatus } from '../../services/adminApi';
import { staffVerificationApi, VerificationStatus } from '../../services/staffVerificationApi';
import { CreateStaffForm } from './CreateStaffForm';
import { UserList } from './UserList';
import { VerificationQueue, VerificationQueueItem } from './VerificationQueue';
import { CreateStaffInput } from '../../lib/validations/admin';

export default function AdminUsersPage() {
  const {
    users,
    loading,
    error,
    page,
    total,
    totalPages,
    accountType,
    accountStatus,
    search,
    fetchUsers,
    createStaffUser,
    updateUserStatus,
  } = useAdminUsers();

  const { notifySuccess, notifyError } = useUiNotifications();
  const [submitting, setSubmitting] = useState(false);
  
  // Verification Queue States
  const [queueStatus, setQueueStatus] = useState<VerificationStatus>('under_review');
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [verificationQueue, setVerificationQueue] = useState<VerificationQueueItem[]>([]);

  const loadQueue = async (status: VerificationStatus) => {
    setQueueLoading(true);
    setQueueError(null);
    try {
      const response = await staffVerificationApi.listQueue(status, 1, 20);
      // Map response explicitly to ensure type safety
      setVerificationQueue(
        response.data.map((item) => ({
          user_id: item.user_id,
          staff_type: item.staff_type as 'doctor' | 'pharmacist',
          specialty: item.specialty,
          affiliation_name: item.affiliation_name,
          verification_status: item.verification_status,
          email: item.email,
          first_name: item.first_name,
          last_name: item.last_name,
          national_id: item.national_id,
          syndicate_id: item.syndicate_id,
          ministry_license: item.ministry_license,
        }))
      );
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Failed to load verification queue');
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue(queueStatus);
  }, [queueStatus]);

  const handleCreateStaff = async (data: CreateStaffInput) => {
    setSubmitting(true);
    try {
      await createStaffUser({
        email: data.email.trim(),
        accountType: data.accountType,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      });
      notifySuccess('Staff user created successfully.');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to create staff user.';
      notifyError(errMsg);
      throw err; // Propagate so form doesn't reset on failure
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (userId: string, nextStatus: AccountStatus, reason?: string) => {
    setSubmitting(true);
    try {
      await updateUserStatus(userId, {
        accountStatus: nextStatus,
        reason: reason || undefined,
      });
      notifySuccess('Account status updated.');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to update account status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewVerification = async (
    userId: string,
    status: 'verified' | 'rejected',
    notes?: string
  ) => {
    setSubmitting(true);
    try {
      await staffVerificationApi.reviewProfile(userId, status, notes || undefined);
      await Promise.all([fetchUsers(), loadQueue(queueStatus)]);
      notifySuccess('Verification review submitted.');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to submit profile review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadDocuments = async (userId: string) => {
    try {
      return await staffVerificationApi.getDocumentLinks(userId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to load documents.';
      notifyError(errMsg);
      throw err;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-10 space-y-12">
      <FeatureHeader
        title="Admin Staff Console"
        subtitle="Create and manage doctor/pharmacist accounts"
      />

      {error && (
        <div className="rounded-lg border border-sand-200 bg-surface-card p-4 text-sm text-sand-900 leading-relaxed" role="alert">
          {error}
        </div>
      )}

      {/* Presenter Components */}
      <CreateStaffForm onSubmit={handleCreateStaff} submitting={submitting} />

      <UserList
        users={users}
        loading={loading}
        page={page}
        total={total}
        totalPages={totalPages}
        accountType={accountType}
        accountStatus={accountStatus}
        search={search}
        submitting={submitting}
        onFetchUsers={fetchUsers}
        onStatusUpdate={handleStatusUpdate}
      />

      <VerificationQueue
        queue={verificationQueue}
        loading={queueLoading}
        error={queueError}
        queueStatus={queueStatus}
        submitting={submitting}
        onStatusChange={setQueueStatus}
        onLoadDocuments={handleLoadDocuments}
        onReview={handleReviewVerification}
      />
    </div>
  );
}
