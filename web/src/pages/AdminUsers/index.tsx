import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { validatePassword } from '@core/auth/auth-utils';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { AccountStatus, AccountType } from '../../services/adminApi';
import { staffVerificationApi, VerificationStatus } from '../../services/staffVerificationApi';

const accountStatuses: AccountStatus[] = ['pending', 'active', 'suspended', 'rejected'];
const accountTypes: AccountType[] = ['patient', 'doctor', 'pharmacist', 'admin'];

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

  const [createForm, setCreateForm] = useState({
    email: '',
    temporaryPassword: '',
    accountType: 'patient' as AccountType,
    firstName: '',
    lastName: '',
  });
  const [statusReasons, setStatusReasons] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<VerificationStatus>('under_review');
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [verificationQueue, setVerificationQueue] = useState<Array<{
    user_id: string;
    staff_type: 'doctor' | 'pharmacist';
    specialty: string | null;
    affiliation_name: string | null;
    verification_status: VerificationStatus;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  }>>([]);
  const [documentLinks, setDocumentLinks] = useState<Record<string, { governmentIdUrl: string | null; certificateUrl: string | null; selfieUrl: string | null }>>({});

  const loadQueue = async (status: VerificationStatus) => {
    setQueueLoading(true);
    setQueueError(null);
    try {
      const response = await staffVerificationApi.listQueue(status, 1, 20);
      setVerificationQueue(response.data);
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Failed to load verification queue');
    } finally {
      setQueueLoading(false);
    }
  };

  React.useEffect(() => {
    void loadQueue(queueStatus);
  }, [queueStatus]);

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);

    const passwordValidation = validatePassword(createForm.temporaryPassword.trim());
    if (!passwordValidation.valid) {
      setActionError(passwordValidation.error ?? 'Temporary password does not meet the required policy.');
      return;
    }

    setSubmitting(true);
    try {
      await createStaffUser({
        ...createForm,
        temporaryPassword: createForm.temporaryPassword.trim(),
      });
      setCreateForm({
        email: '',
        temporaryPassword: '',
        accountType: 'patient',
        firstName: '',
        lastName: '',
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create staff user.');
    } finally {
      setSubmitting(false);
    }
  };

  const onStatusUpdate = async (userId: string, nextStatus: AccountStatus) => {
    setSubmitting(true);
    try {
      const message = statusReasons[userId]?.trim();
      await updateUserStatus(userId, {
        accountStatus: nextStatus,
        reason: nextStatus === 'suspended' || nextStatus === 'rejected' ? message : undefined,
      });
      setStatusReasons((prev) => ({ ...prev, [userId]: '' }));
    } finally {
      setSubmitting(false);
    }
  };

  const onReview = async (userId: string, status: 'verified' | 'rejected') => {
    setSubmitting(true);
    try {
      const notes = reviewNotes[userId]?.trim();
      await staffVerificationApi.reviewProfile(userId, status, notes || undefined);
      await Promise.all([fetchUsers(), loadQueue(queueStatus)]);
    } finally {
      setSubmitting(false);
    }
  };

  const onLoadDocuments = async (userId: string) => {
    const links = await staffVerificationApi.getDocumentLinks(userId);
    setDocumentLinks((prev) => ({ ...prev, [userId]: links }));
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <FeatureHeader
        title="Admin Staff Console"
        subtitle="Create and manage doctor/pharmacist accounts"
        variant="doc"
        imageSrc={imageAssets.headers.doctor}
        imageAlt="Admin staff management"
      />

      {(error || actionError) && (
        <div className="rounded-lg border border-gray-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {actionError ?? error}
        </div>
      )}

      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Create Staff Account</h3>
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={onCreate}>
          <div className="space-y-1 text-sm font-medium text-gray-700">
            <label>Email</label>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-300 focus:outline-none"
            />
          </div>
          <div className="space-y-1 text-sm font-medium text-gray-700">
            <label>Temporary Password</label>
            <input
              type="password"
              value={createForm.temporaryPassword}
              onChange={(e) => setCreateForm((p) => ({ ...p, temporaryPassword: e.target.value }))}
              minLength={8}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-300 focus:outline-none"
            />
          </div>
          <div className="space-y-1 text-sm font-medium text-gray-700">
            <label>Account Type</label>
            <select
              value={createForm.accountType}
              onChange={(e) => setCreateForm((p) => ({ ...p, accountType: e.target.value as AccountType }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-300 focus:outline-none"
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="space-y-1 text-sm font-medium text-gray-700">
            <label>First Name</label>
            <input
              value={createForm.firstName}
              onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-300 focus:outline-none"
            />
          </div>
          <div className="space-y-1 text-sm font-medium text-gray-700">
            <label>Last Name</label>
            <input
              value={createForm.lastName}
              onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-300 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button className="bg-teal-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Staff'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">All Accounts</h3>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Search by name or email"
              value={search ?? ''}
              onChange={(e) => void fetchUsers({ search: e.target.value, page: 1 })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-300 focus:outline-none sm:w-56"
            />
            <select
              value={accountType ?? ''}
              onChange={(e) =>
                void fetchUsers({
                  accountType: (e.target.value || undefined) as AccountType | undefined,
                  page: 1,
                })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-300 focus:outline-none sm:w-40"
            >
              <option value="">All types</option>
              {accountTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select
              value={accountStatus ?? ''}
              onChange={(e) =>
                void fetchUsers({
                  accountStatus: (e.target.value || undefined) as AccountStatus | undefined,
                  page: 1,
                })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-300 focus:outline-none sm:w-40"
            >
              <option value="">All statuses</option>
              {accountStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-600">Loading users...</p>
        ) : (
          <>
            <div className="space-y-3">
              {users.map((user) => (
                <article key={user.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <span className="text-sm font-medium text-gray-900">Name</span>
                    <span className="text-sm text-gray-600 sm:col-span-2">{[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <span className="text-sm font-medium text-gray-900">Email</span>
                    <span className="text-sm text-gray-600 sm:col-span-2">{user.email || '—'}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <span className="text-sm font-medium text-gray-900">Type</span>
                    <span className="text-sm text-gray-600 sm:col-span-2">{user.accountType}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <span className="text-sm font-medium text-gray-900">Status</span>
                    <span className="sm:col-span-2">
                      <span className={`inline-flex items-center rounded-md border border-gray-200 px-2 py-1 text-xs font-medium status-chip ${user.accountStatus}`}>
                        {user.accountStatus}
                      </span>
                    </span>
                  </div>

                  {(user.accountStatus === 'pending' || user.accountStatus === 'suspended' || user.accountStatus === 'rejected') && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Reason (required for suspend/reject)</label>
                      <textarea
                        value={statusReasons[user.id] ?? ''}
                        onChange={(e) => setStatusReasons((prev) => ({ ...prev, [user.id]: e.target.value }))}
                        placeholder="Add reason"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-300 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => void onStatusUpdate(user.id, 'active')} disabled={submitting || user.accountStatus === 'active'}>Approve</button>
                    <button className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => void onStatusUpdate(user.id, 'suspended')} disabled={submitting || user.accountStatus === 'suspended'}>Suspend</button>
                    <button className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => void onStatusUpdate(user.id, 'rejected')} disabled={submitting || user.accountStatus === 'rejected'}>Reject</button>
                    <Link className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors" to={`/admin/users/${user.id}`}>Open Profile</Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
              <span>Page {page} of {Math.max(totalPages, 1)} • {total} users</span>
              <div className="flex gap-2">
                <button className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors" disabled={page <= 1 || submitting} onClick={() => void fetchUsers({ page: page - 1 })}>Previous</button>
                <button className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors" disabled={page >= totalPages || totalPages === 0 || submitting} onClick={() => void fetchUsers({ page: page + 1 })}>Next</button>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Verification Queue</h3>
          <div className="flex flex-wrap gap-2">
            <select value={queueStatus} onChange={(e) => setQueueStatus(e.target.value as VerificationStatus)}>
              <option value="under_review">under_review</option>
              <option value="verified">verified</option>
              <option value="rejected">rejected</option>
              <option value="unverified">unverified</option>
            </select>
          </div>
        </div>

        {queueError && (
          <div className="rounded-lg border border-gray-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {queueError}
          </div>
        )}

        {queueLoading ? (
          <p className="text-sm text-gray-600">Loading verification queue...</p>
        ) : (
          <div className="space-y-3">
            {verificationQueue.map((item) => {
              const links = documentLinks[item.user_id];
              return (
                <article key={item.user_id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <span className="text-sm font-medium text-gray-900">Name</span>
                    <span className="text-sm text-gray-600 sm:col-span-2">{[item.first_name, item.last_name].filter(Boolean).join(' ') || '—'}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <span className="text-sm font-medium text-gray-900">Email</span>
                    <span className="text-sm text-gray-600 sm:col-span-2">{item.email || '—'}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <span className="text-sm font-medium text-gray-900">Staff Type</span>
                    <span className="text-sm text-gray-600 sm:col-span-2">{item.staff_type}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <span className="text-sm font-medium text-gray-900">Specialty</span>
                    <span className="text-sm text-gray-600 sm:col-span-2">{item.specialty || '—'}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <span className="text-sm font-medium text-gray-900">Affiliation</span>
                    <span className="text-sm text-gray-600 sm:col-span-2">{item.affiliation_name || '—'}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <span className="text-sm font-medium text-gray-900">Status</span>
                    <span className="sm:col-span-2">
                      <span className={`inline-flex items-center rounded-md border border-gray-200 px-2 py-1 text-xs font-medium status-chip ${item.verification_status}`}>
                        {item.verification_status}
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors" type="button" onClick={() => void onLoadDocuments(item.user_id)}>Load Documents</button>
                    <button className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors" type="button" onClick={() => void onReview(item.user_id, 'verified')} disabled={submitting}>Approve Verification</button>
                    <button className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors" type="button" onClick={() => void onReview(item.user_id, 'rejected')} disabled={submitting}>Reject Verification</button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Review Notes</label>
                    <textarea
                      value={reviewNotes[item.user_id] ?? ''}
                      onChange={(e) => setReviewNotes((prev) => ({ ...prev, [item.user_id]: e.target.value }))}
                      placeholder="Optional for approve, required for reject"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-300 focus:outline-none"
                    />
                  </div>

                  {links && (
                    <div className="flex flex-wrap gap-2">
                      {links.governmentIdUrl && <a className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors" href={links.governmentIdUrl} target="_blank" rel="noreferrer">Government ID</a>}
                      {links.certificateUrl && <a className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors" href={links.certificateUrl} target="_blank" rel="noreferrer">Certificate</a>}
                      {links.selfieUrl && <a className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors" href={links.selfieUrl} target="_blank" rel="noreferrer">Selfie</a>}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
