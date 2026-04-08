import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { validatePassword } from '@core/auth/auth-utils';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { AccountStatus, AccountType } from '../../services/adminApi';
import { staffVerificationApi, VerificationStatus } from '../../services/staffVerificationApi';
import './styles.css';

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
    <div className="admin-users-page">
      <FeatureHeader
        title="Admin Staff Console"
        subtitle="Create and manage doctor/pharmacist accounts"
        variant="doc"
        imageSrc={imageAssets.headers.doctor}
        imageAlt="Admin staff management"
      />

      {(error || actionError) && <div className="error-banner">{actionError ?? error}</div>}

      <section className="admin-card">
        <h3>Create Staff Account</h3>
        <form className="admin-form-grid" onSubmit={onCreate}>
          <div className="form-control">
            <label>Email</label>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>
          <div className="form-control">
            <label>Temporary Password</label>
            <input
              type="password"
              value={createForm.temporaryPassword}
              onChange={(e) => setCreateForm((p) => ({ ...p, temporaryPassword: e.target.value }))}
              minLength={8}
              required
            />
          </div>
          <div className="form-control">
            <label>Account Type</label>
            <select
              value={createForm.accountType}
              onChange={(e) => setCreateForm((p) => ({ ...p, accountType: e.target.value as AccountType }))}
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-control">
            <label>First Name</label>
            <input
              value={createForm.firstName}
              onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))}
              required
            />
          </div>
          <div className="form-control">
            <label>Last Name</label>
            <input
              value={createForm.lastName}
              onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))}
              required
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Staff'}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-filter-row">
          <h3>All Accounts</h3>
          <div className="filter-controls">
            <input
              placeholder="Search by name or email"
              value={search ?? ''}
              onChange={(e) => void fetchUsers({ search: e.target.value, page: 1 })}
            />
            <select
              value={accountType ?? ''}
              onChange={(e) =>
                void fetchUsers({
                  accountType: (e.target.value || undefined) as AccountType | undefined,
                  page: 1,
                })
              }
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
          <p className="loading">Loading users...</p>
        ) : (
          <>
            <div className="users-grid">
              {users.map((user) => (
                <article key={user.id} className="user-card">
                  <div className="user-row"><strong>Name</strong><span>{[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}</span></div>
                  <div className="user-row"><strong>Email</strong><span>{user.email || '—'}</span></div>
                  <div className="user-row"><strong>Type</strong><span>{user.accountType}</span></div>
                  <div className="user-row"><strong>Status</strong><span className={`status-chip ${user.accountStatus}`}>{user.accountStatus}</span></div>

                  {(user.accountStatus === 'pending' || user.accountStatus === 'suspended' || user.accountStatus === 'rejected') && (
                    <div className="reason-block">
                      <label>Reason (required for suspend/reject)</label>
                      <textarea
                        value={statusReasons[user.id] ?? ''}
                        onChange={(e) => setStatusReasons((prev) => ({ ...prev, [user.id]: e.target.value }))}
                        placeholder="Add reason"
                      />
                    </div>
                  )}

                  <div className="card-actions">
                    <button className="btn btn-ghost" onClick={() => void onStatusUpdate(user.id, 'active')} disabled={submitting || user.accountStatus === 'active'}>Approve</button>
                    <button className="btn btn-ghost" onClick={() => void onStatusUpdate(user.id, 'suspended')} disabled={submitting || user.accountStatus === 'suspended'}>Suspend</button>
                    <button className="btn btn-ghost" onClick={() => void onStatusUpdate(user.id, 'rejected')} disabled={submitting || user.accountStatus === 'rejected'}>Reject</button>
                    <Link className="btn btn-ghost" to={`/admin/users/${user.id}`}>Open Profile</Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="pagination-row">
              <span>Page {page} of {Math.max(totalPages, 1)} • {total} users</span>
              <div className="pagination-actions">
                <button className="btn btn-ghost" disabled={page <= 1 || submitting} onClick={() => void fetchUsers({ page: page - 1 })}>Previous</button>
                <button className="btn btn-ghost" disabled={page >= totalPages || totalPages === 0 || submitting} onClick={() => void fetchUsers({ page: page + 1 })}>Next</button>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-filter-row">
          <h3>Verification Queue</h3>
          <div className="filter-controls">
            <select value={queueStatus} onChange={(e) => setQueueStatus(e.target.value as VerificationStatus)}>
              <option value="under_review">under_review</option>
              <option value="verified">verified</option>
              <option value="rejected">rejected</option>
              <option value="unverified">unverified</option>
            </select>
          </div>
        </div>

        {queueError && <div className="error-banner">{queueError}</div>}

        {queueLoading ? (
          <p className="loading">Loading verification queue...</p>
        ) : (
          <div className="users-grid">
            {verificationQueue.map((item) => {
              const links = documentLinks[item.user_id];
              return (
                <article key={item.user_id} className="user-card">
                  <div className="user-row"><strong>Name</strong><span>{[item.first_name, item.last_name].filter(Boolean).join(' ') || '—'}</span></div>
                  <div className="user-row"><strong>Email</strong><span>{item.email || '—'}</span></div>
                  <div className="user-row"><strong>Staff Type</strong><span>{item.staff_type}</span></div>
                  <div className="user-row"><strong>Specialty</strong><span>{item.specialty || '—'}</span></div>
                  <div className="user-row"><strong>Affiliation</strong><span>{item.affiliation_name || '—'}</span></div>
                  <div className="user-row"><strong>Status</strong><span className={`status-chip ${item.verification_status}`}>{item.verification_status}</span></div>

                  <div className="card-actions">
                    <button className="btn btn-ghost" type="button" onClick={() => void onLoadDocuments(item.user_id)}>Load Documents</button>
                    <button className="btn btn-ghost" type="button" onClick={() => void onReview(item.user_id, 'verified')} disabled={submitting}>Approve Verification</button>
                    <button className="btn btn-ghost" type="button" onClick={() => void onReview(item.user_id, 'rejected')} disabled={submitting}>Reject Verification</button>
                  </div>

                  <div className="reason-block">
                    <label>Review Notes</label>
                    <textarea
                      value={reviewNotes[item.user_id] ?? ''}
                      onChange={(e) => setReviewNotes((prev) => ({ ...prev, [item.user_id]: e.target.value }))}
                      placeholder="Optional for approve, required for reject"
                    />
                  </div>

                  {links && (
                    <div className="card-actions">
                      {links.governmentIdUrl && <a className="btn btn-ghost" href={links.governmentIdUrl} target="_blank" rel="noreferrer">Government ID</a>}
                      {links.certificateUrl && <a className="btn btn-ghost" href={links.certificateUrl} target="_blank" rel="noreferrer">Certificate</a>}
                      {links.selfieUrl && <a className="btn btn-ghost" href={links.selfieUrl} target="_blank" rel="noreferrer">Selfie</a>}
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
