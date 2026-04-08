/**
 * Profile Page — Aethea Medical Platform
 *
 * Research-backed profile page following:
 * - NNGroup: view-first, edit-second; grouped by context
 * - USWDS: create-a-user-profile pattern
 * - Carbon Design System: forms + in-line editing
 * - Apple HIG: profile = identity data, settings = app preferences
 *
 * Sections:
 *  0. Avatar + Identity header  (initials, name, member since)
 *  1. Personal Information      (name, email (read-only), DOB, gender, phone)
 *  2. Medical Information       (blood type, allergies, chronic conditions, height, weight)
 *  3. Emergency Contact         (name, phone)
 *  4. Account actions           (change password link)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { decodeJWT } from '@core/auth/token-manager';
import { GENDER_OPTIONS, BLOOD_TYPE_OPTIONS, ALLERGY_OPTIONS, CHRONIC_CONDITION_OPTIONS } from '@core/auth/auth-types';
import type { ProfileUpdateRequest, UserProfile, BloodType, Gender } from '@core/auth/auth-types';
import { isValidName, isValidDateOfBirth, isValidPhone } from '@core/auth/auth-utils';
import { validatePassword, doPasswordsMatch } from '@core/auth/auth-utils';
import { Modal } from '../../components/Modal';
import {
  requestPasswordChangeOTP,
  requestProfileUpdateOTP,
  verifyPasswordChangeOTP,
  verifyProfileUpdateOTP,
} from '../../services/userApi';
import { useUiNotifications } from '../../contexts/UiNotificationsProvider';
import { useTurnstile } from '../../hooks/useTurnstile';
import './styles.css';

// ── Validation ──────────────────────────────
interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phone?: string;
  heightCm?: string;
  weightKg?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

function validateForm(form: ProfileUpdateRequest): ValidationErrors {
  const errors: ValidationErrors = {};

  if (form.firstName !== undefined && form.firstName !== '') {
    const r = isValidName(form.firstName);
    if (!r.valid) errors.firstName = r.error;
  }
  if (form.lastName !== undefined && form.lastName !== '') {
    const r = isValidName(form.lastName);
    if (!r.valid) errors.lastName = r.error;
  }
  if (form.dateOfBirth) {
    const r = isValidDateOfBirth(form.dateOfBirth);
    if (!r.valid) errors.dateOfBirth = r.error;
  }
  if (form.phone) {
    const r = isValidPhone('EG', form.phone);
    if (!r.valid) errors.phone = r.error;
  }
  if (form.heightCm !== undefined && form.heightCm !== null) {
    if (form.heightCm < 30 || form.heightCm > 300) errors.heightCm = 'Must be 30–300 cm';
  }
  if (form.weightKg !== undefined && form.weightKg !== null) {
    if (form.weightKg < 1 || form.weightKg > 500) errors.weightKg = 'Must be 1–500 kg';
  }
  if (form.emergencyContactName) {
    const r = isValidName(form.emergencyContactName);
    if (!r.valid) errors.emergencyContactName = r.error;
  }
  if (form.emergencyContactPhone) {
    const r = isValidPhone('EG', form.emergencyContactPhone);
    if (!r.valid) errors.emergencyContactPhone = r.error;
  }
  return errors;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }

  return fallback;
}

const ProfilePage: React.FC = () => {
  const { profile, loading, updatePassword, refreshProfile, user, session } = useAuth();
  const { notifySuccess, notifyError } = useUiNotifications();
  const navigate = useNavigate();

  // Detect if admin is forced here to change password
  const mustChangePassword = (() => {
    if (!session?.access_token) return false;
    const decoded = decodeJWT(session.access_token);
    if (!decoded || typeof decoded !== 'object') return false;
    return (decoded as { must_change_password?: unknown }).must_change_password === true;
  })();

  // Edit mode toggle
  const [isEditing, setIsEditing] = useState(false);

  // Form state — mirrors ProfileUpdateRequest
  const [form, setForm] = useState<ProfileUpdateRequest>({});
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordCaptchaToken, setPasswordCaptchaToken] = useState<string | null>(null);
  const [passwordCaptchaError, setPasswordCaptchaError] = useState('');
  const [passwordCaptchaResetVersion, setPasswordCaptchaResetVersion] = useState(0);
  const [showPasswordOtpModal, setShowPasswordOtpModal] = useState(false);
  const [passwordOtpCode, setPasswordOtpCode] = useState('');
  const [passwordOtpError, setPasswordOtpError] = useState('');

  // Track dirty state for unsaved changes warning
  const originalFormRef = useRef<ProfileUpdateRequest>({});
  const isDirty = isEditing && JSON.stringify(form) !== JSON.stringify(originalFormRef.current);

  // UI feedback
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Step-up verification for profile edit
  const [showStepUpPassword, setShowStepUpPassword] = useState(false);
  const [stepUpPassword, setStepUpPassword] = useState('');
  const [showStepUpOtp, setShowStepUpOtp] = useState(false);
  const [stepUpOtp, setStepUpOtp] = useState('');
  const [stepUpError, setStepUpError] = useState('');
  const [stepUpLoading, setStepUpLoading] = useState(false);

  const resetPasswordCaptchaState = useCallback(() => {
    setPasswordCaptchaToken(null);
    setPasswordCaptchaError('');
    setPasswordCaptchaResetVersion((prev) => prev + 1);
  }, []);

  const openPasswordModal = useCallback(() => {
    setShowPasswordModal(true);
    setShowPasswordOtpModal(false);
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordOtpError('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordOtpCode('');
    resetPasswordCaptchaState();
  }, [resetPasswordCaptchaState]);

  const closePasswordModal = useCallback(() => {
    setShowPasswordModal(false);
    setShowPasswordOtpModal(false);
    setPasswordOtpError('');
    setPasswordOtpCode('');
    setPasswordError('');
    setPasswordSuccess('');
    resetPasswordCaptchaState();
  }, [resetPasswordCaptchaState]);

  const backToPasswordDetailsModal = useCallback(() => {
    setShowPasswordOtpModal(false);
    setShowPasswordModal(true);
    setPasswordOtpCode('');
    setPasswordOtpError('');
  }, []);

  // Populate form when profile loads or changes.
  // Do not overwrite local edits while user is actively editing or completing step-up.
  useEffect(() => {
    if (!profile) return;
    if (isEditing || showStepUpPassword || showStepUpOtp) return;

    const formData = profileToForm(profile);
    setForm(formData);
    originalFormRef.current = formData;
  }, [profile, isEditing, showStepUpPassword, showStepUpOtp]);

  // Unsaved changes warning: beforeunload
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Handlers ───────────────────────────────
  const handleChange = useCallback(
    (field: keyof ProfileUpdateRequest, value: string | number | undefined) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      // Clear validation error for this field on change
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    []
  );

  const handleEdit = () => {
    setIsEditing(true);
    setSuccessMsg('');
    setErrorMsg('');
    setValidationErrors({});
  };

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Discard them?');
      if (!confirmed) return;
    }
    setIsEditing(false);
    setErrorMsg('');
    setValidationErrors({});
    if (profile) {
      const formData = profileToForm(profile);
      setForm(formData);
      originalFormRef.current = formData;
    }
  };

  const handleSave = () => {
    // Validate before saving
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setErrorMsg('Please fix the validation errors before saving.');
      return;
    }

    const changedUpdates = getChangedProfileFields(form, originalFormRef.current);
    if (Object.keys(changedUpdates).length === 0) {
      setErrorMsg('No profile changes were detected.');
      return;
    }

    // Instead of saving directly, we prompt for step-up verification.
    setStepUpPassword('');
    setStepUpError('');
    setShowStepUpPassword(true);
  };

  const submitStepUpPassword = async () => {
    if (!stepUpPassword) {
      setStepUpError('Password is required');
      return;
    }
    setStepUpError('');
    setStepUpLoading(true);
    try {
      await requestProfileUpdateOTP(stepUpPassword);
      setShowStepUpPassword(false);
      setStepUpOtp('');
      setShowStepUpOtp(true);
      notifySuccess('Verification code sent', 'Please check your email for the 6-digit code.');
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Incorrect password or failed to generate verification code.');
      setStepUpError(message);
      notifyError('Authentication failed', 'Could not verify password.', message);
    } finally {
      setStepUpLoading(false);
    }
  };

  const submitStepUpOtp = async () => {
    if (!stepUpOtp || stepUpOtp.length !== 6) {
      setStepUpError('A 6-digit code is required');
      return;
    }

    const changedUpdates = getChangedProfileFields(form, originalFormRef.current);
    if (Object.keys(changedUpdates).length === 0) {
      setStepUpError('No profile changes were detected.');
      return;
    }

    setStepUpError('');
    setStepUpLoading(true);
    try {
      await verifyProfileUpdateOTP(stepUpOtp, changedUpdates);
      // Success!
      setShowStepUpOtp(false);
      setSuccessMsg('Profile updated successfully');
      notifySuccess('Profile updated', 'Your profile data has been updated successfully.');
      setIsEditing(false);
      setValidationErrors({});
      await refreshProfile();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Invalid or expired code.');
      setStepUpError(message);
      notifyError('Update failed', 'Could not update your profile.', message);
    } finally {
      setStepUpLoading(false);
    }
  };

  const validatePasswordChangeForm = (): boolean => {
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordOtpError('');

    if (!mustChangePassword && !currentPassword) {
      setPasswordError('Please enter your current password.');
      return false;
    }
    if (!newPassword || !confirmNewPassword) {
      setPasswordError('Please fill in all fields.');
      return false;
    }
    if (!doPasswordsMatch(newPassword, confirmNewPassword)) {
      setPasswordError('Passwords do not match.');
      return false;
    }
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.error ?? 'Password does not meet requirements.');
      return false;
    }

    return true;
  };

  const handleSendPasswordVerificationCode = async () => {
    if (!validatePasswordChangeForm()) {
      return;
    }

    if (!mustChangePassword && !passwordCaptchaToken) {
      setPasswordError(passwordCaptchaError || 'Please complete the CAPTCHA verification.');
      return;
    }

    setPasswordSaving(true);
    try {
      await requestPasswordChangeOTP({
        currentPassword: mustChangePassword ? undefined : currentPassword,
        captchaToken: mustChangePassword ? undefined : (passwordCaptchaToken ?? undefined),
      });

      if (!mustChangePassword) {
        resetPasswordCaptchaState();
      }

      setPasswordOtpCode('');
      setPasswordOtpError('');
      setShowPasswordModal(false);
      setShowPasswordOtpModal(true);
      notifySuccess('Verification code sent', 'Please check your email for the 6-digit code.');
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to send verification code. Please try again.');
      setPasswordError(message);
      if (!mustChangePassword) {
        resetPasswordCaptchaState();
      }
    }
    setPasswordSaving(false);
  };

  const handleVerifyPasswordCodeAndChange = async () => {
    setPasswordOtpError('');

    if (!/^\d{6}$/.test(passwordOtpCode.trim())) {
      setPasswordOtpError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setPasswordSaving(true);
    try {
      await verifyPasswordChangeOTP(passwordOtpCode.trim());

      await updatePassword(newPassword);
      setPasswordSuccess('Password updated successfully!');
      notifySuccess('Password updated', 'Your password has been updated successfully.');
      setTimeout(() => {
        closePasswordModal();
        // If admin was forced here to change password, redirect to dashboard
        if (mustChangePassword) {
          navigate('/dashboard', { replace: true });
        }
      }, 1500);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to update password. Please try again.');
      setPasswordOtpError(message);
    }
    setPasswordSaving(false);
  };

  // ── Avatar helpers ─────────────────────────
  const getInitials = (): string => {
    const first = profile?.firstName?.[0] ?? user?.email?.[0] ?? '?';
    const last = profile?.lastName?.[0] ?? '';
    return (first + last).toUpperCase();
  };

  const getFullName = (): string => {
    if (profile?.firstName || profile?.lastName) {
      return [profile.firstName, profile.lastName].filter(Boolean).join(' ');
    }
    return user?.email ?? 'User';
  };

  const getMemberSince = (): string => {
    const dateStr = profile?.createdAt ?? user?.created_at;
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
    } catch {
      return '';
    }
  };

  // ── Loading state (Skeleton) ───────────────
  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-skeleton-header">
            <div className="skeleton skeleton-avatar" />
            <div className="skeleton-text-group">
              <div className="skeleton skeleton-name" />
              <div className="skeleton skeleton-meta" />
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="profile-card">
              <div className="skeleton skeleton-section-title" />
              <div className="profile-grid">
                <div className="skeleton skeleton-field" />
                <div className="skeleton skeleton-field" />
                <div className="skeleton skeleton-field" />
                <div className="skeleton skeleton-field" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────
  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* ── Avatar + Identity Header ────────── */}
        <div className="profile-identity">
          <div className="profile-avatar" aria-label={`Profile picture for ${getFullName()}`}>
            {getInitials()}
          </div>
          <div className="profile-identity-info">
            <h1>{getFullName()}</h1>
            <p className="profile-email">{user?.email ?? profile?.email}</p>
            {getMemberSince() && (
              <p className="profile-member-since">Member since {getMemberSince()}</p>
            )}
          </div>
          {!isEditing && (
            <button className="btn btn-edit" onClick={handleEdit} aria-label="Edit profile">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M11.13 1.87a1.75 1.75 0 0 1 2.47 0l.53.53a1.75 1.75 0 0 1 0 2.47l-8.36 8.36a1.75 1.75 0 0 1-.82.46l-2.88.72a.75.75 0 0 1-.91-.91l.72-2.88c.08-.31.24-.59.46-.82l8.79-8.79Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Edit Profile
            </button>
          )}
        </div>

        {/* Forced password change banner for new admin accounts */}
        {mustChangePassword && (
          <div className="profile-toast profile-toast-warning" role="alert">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 1L1 16h16L9 1z" stroke="#92400e" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M9 7v4M9 13h.01" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            You must change your temporary password before accessing the platform.
            <button className="btn btn-account-action" style={{ marginLeft: 'auto' }}
              onClick={openPasswordModal}
            >Change Password Now</button>
          </div>
        )}

        {/* Feedback messages */}
        {successMsg && (
          <div className="profile-toast profile-toast-success" role="status">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="8" stroke="#166534" strokeWidth="1.5"/>
              <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="#166534" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="profile-toast profile-toast-error" role="alert">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="8" stroke="#991b1b" strokeWidth="1.5"/>
              <path d="M9 5.5V9.5M9 12.5H9.01" stroke="#991b1b" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {errorMsg}
          </div>
        )}

        {/* ── Section 1: Personal Information ────── */}
        <section className="profile-card" aria-labelledby="section-personal">
          <h2 id="section-personal">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 18c0-3.31 3.13-6 7-6s7 2.69 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Personal Information
          </h2>
          <div className="profile-grid">
            <Field
              label="First Name"
              value={form.firstName}
              editing={isEditing}
              onChange={(v) => handleChange('firstName', v)}
              error={validationErrors.firstName}
              autoComplete="given-name"
            />
            <Field
              label="Last Name"
              value={form.lastName}
              editing={isEditing}
              onChange={(v) => handleChange('lastName', v)}
              error={validationErrors.lastName}
              autoComplete="family-name"
            />
            <Field
              label="Email"
              value={user?.email ?? profile?.email ?? ''}
              editing={false}
              hint="Email cannot be changed here"
              icon={
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="#94a3b8" strokeWidth="1.2"/>
                  <path d="M1.5 3.5L7 8L12.5 3.5" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              }
            />
            <Field
              label="Date of Birth"
              value={form.dateOfBirth}
              editing={isEditing}
              type="date"
              onChange={(v) => handleChange('dateOfBirth', v)}
              error={validationErrors.dateOfBirth}
              autoComplete="bday"
            />
            <SelectField
              label="Gender"
              value={form.gender ?? ''}
              editing={isEditing}
              options={GENDER_OPTIONS.map((g) => ({ value: g.value, label: g.label }))}
              onChange={(v) => handleChange('gender', v as Gender)}
            />
            <Field
              label="Phone"
              value={form.phone}
              editing={isEditing}
              type="tel"
              onChange={(v) => handleChange('phone', v)}
              error={validationErrors.phone}
              placeholder="1XXXXXXXXX"
              autoComplete="tel-national"
            />
          </div>
        </section>

        {/* ── Section 2: Medical Information ──────── */}
        <section className="profile-card" aria-labelledby="section-medical">
          <h2 id="section-medical">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="6" y="2" width="8" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 6V10M8 8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 14H14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Medical Information
          </h2>
          <div className="profile-grid">
            <SelectField
              label="Blood Type"
              value={form.bloodType ?? ''}
              editing={isEditing}
              options={BLOOD_TYPE_OPTIONS.map((b) => ({ value: b.value, label: b.label }))}
              onChange={(v) => handleChange('bloodType', v as BloodType)}
            />
            <NumberField
              label="Height (cm)"
              value={form.heightCm}
              editing={isEditing}
              min={30}
              max={300}
              onChange={(v) => handleChange('heightCm', v)}
              error={validationErrors.heightCm}
            />
            <NumberField
              label="Weight (kg)"
              value={form.weightKg}
              editing={isEditing}
              min={1}
              max={500}
              onChange={(v) => handleChange('weightKg', v)}
              error={validationErrors.weightKg}
            />
            <div className="profile-field full-width">
              <label>Allergies</label>
              {isEditing ? (
                <ChipSelect
                  options={ALLERGY_OPTIONS}
                  selected={parseCommaSeparated(form.allergies)}
                  onChange={(items) => handleChange('allergies', items.join(', '))}
                />
              ) : (
                <span className={`field-value ${!form.allergies ? 'empty' : ''}`}>
                  {form.allergies ? (
                    <span className="chip-display">
                      {parseCommaSeparated(form.allergies).map((a) => (
                        <span key={a} className="chip chip-readonly">{a}</span>
                      ))}
                    </span>
                  ) : 'Not specified'}
                </span>
              )}
            </div>
            <div className="profile-field full-width">
              <label>Chronic Conditions</label>
              {isEditing ? (
                <ChipSelect
                  options={CHRONIC_CONDITION_OPTIONS}
                  selected={parseCommaSeparated(form.chronicConditions)}
                  onChange={(items) => handleChange('chronicConditions', items.join(', '))}
                />
              ) : (
                <span className={`field-value ${!form.chronicConditions ? 'empty' : ''}`}>
                  {form.chronicConditions ? (
                    <span className="chip-display">
                      {parseCommaSeparated(form.chronicConditions).map((c) => (
                        <span key={c} className="chip chip-readonly">{c}</span>
                      ))}
                    </span>
                  ) : 'Not specified'}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Section 3: Emergency Contact ────────── */}
        <section className="profile-card" aria-labelledby="section-emergency">
          <h2 id="section-emergency">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h2.02a1 1 0 0 1 .95.68l.74 2.22a1 1 0 0 1-.27 1.03L7.38 8.48a10.46 10.46 0 0 0 4.14 4.14l1.55-1.55a1 1 0 0 1 1.03-.27l2.22.74a1 1 0 0 1 .68.95V14.5a2.5 2.5 0 0 1-2.5 2.5A13.5 13.5 0 0 1 3 5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Emergency Contact
          </h2>
          <div className="profile-grid">
            <Field
              label="Contact Name"
              value={form.emergencyContactName}
              editing={isEditing}
              onChange={(v) => handleChange('emergencyContactName', v)}
              error={validationErrors.emergencyContactName}
              placeholder="Full name"
            />
            <Field
              label="Contact Phone"
              value={form.emergencyContactPhone}
              editing={isEditing}
              type="tel"
              onChange={(v) => handleChange('emergencyContactPhone', v)}
              error={validationErrors.emergencyContactPhone}
              placeholder="1XXXXXXXXX"
            />
          </div>
        </section>

        {/* ── Section 4: Account Actions ──────────── */}
        <section className="profile-card profile-card-account" aria-labelledby="section-account">
          <h2 id="section-account">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="4" y="8" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 8V6a3 3 0 1 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="10" cy="12.5" r="1" fill="currentColor"/>
            </svg>
            Account &amp; Security
          </h2>
          <div className="profile-account-actions">
            <button
              className="btn btn-account-action"
              onClick={openPasswordModal}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4.5 8V5a3.5 3.5 0 1 1 7 0v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <rect x="3" y="7.5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
              Change Password
            </button>
          </div>
        </section>

        {/* ── Action buttons (edit mode) ──────────── */}
        {isEditing && (
          <div className="profile-actions">
            <button className="btn btn-primary" onClick={handleSave}>
              Save Changes
            </button>
            <button className="btn btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* ── Step-up Verification Modals ─────────────── */}
      <Modal
        isOpen={showStepUpPassword}
        onClose={() => !stepUpLoading && setShowStepUpPassword(false)}
        ariaLabelledBy="stepup-password-title"
      >
        <div className="modal-header">
          <h3 id="stepup-password-title">Verify Your Identity</h3>
          <button className="modal-close" onClick={() => setShowStepUpPassword(false)} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="modal-body">
          <p className="text-muted" style={{ marginBottom: '16px' }}>For your security, please enter your password to save profile changes.</p>
          {stepUpError && (
            <div className="alert alert-error" role="alert">
              {stepUpError}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="stepup-password">Current Password</label>
            <input
              id="stepup-password"
              type="password"
              value={stepUpPassword}
              onChange={(e) => setStepUpPassword(e.target.value)}
              disabled={stepUpLoading}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border, #000)' }}
            />
          </div>
        </div>
        <div className="profile-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-secondary" onClick={() => setShowStepUpPassword(false)} disabled={stepUpLoading}>Cancel</button>
          <button className="btn btn-primary" onClick={submitStepUpPassword} disabled={stepUpLoading}>
            {stepUpLoading ? 'Verifying...' : 'Continue'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showStepUpOtp}
        onClose={() => !stepUpLoading && setShowStepUpOtp(false)}
        ariaLabelledBy="stepup-otp-title"
      >
        <div className="modal-header">
          <h3 id="stepup-otp-title">Email Verification</h3>
          <button className="modal-close" onClick={() => setShowStepUpOtp(false)} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="modal-body">
          <p className="text-muted" style={{ marginBottom: '16px' }}>A 6-digit code has been sent to your email. It will expire in 10 minutes.</p>
          {stepUpError && (
            <div className="alert alert-error" role="alert">
              {stepUpError}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="stepup-otp">Verification Code</label>
            <input
              id="stepup-otp"
              type="text"
              maxLength={6}
              value={stepUpOtp}
              onChange={(e) => setStepUpOtp(e.target.value)}
              disabled={stepUpLoading}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border, #000)', letterSpacing: '2px', fontSize: '1.2rem', textAlign: 'center' }}
            />
          </div>
        </div>
        <div className="profile-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-secondary" onClick={() => setShowStepUpOtp(false)} disabled={stepUpLoading}>Cancel</button>
          <button className="btn btn-primary" onClick={submitStepUpOtp} disabled={stepUpLoading}>
            {stepUpLoading ? 'Verifying...' : 'Verify & Save'}
          </button>
        </div>
      </Modal>

      {/* ── Password Change Modal ─────────────── */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => !passwordSaving && closePasswordModal()}
        ariaLabelledBy="password-modal-title"
      >
            <div className="modal-header">
              <h3 id="password-modal-title">Change Password</h3>
              <button className="modal-close" onClick={closePasswordModal} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="modal-body">
              {passwordSuccess && <div className="profile-toast profile-toast-success">{passwordSuccess}</div>}
              {passwordError && <div className="profile-toast profile-toast-error">{passwordError}</div>}
              {!mustChangePassword ? (
                <div className="modal-field">
                  <label htmlFor="current-password">Current Password</label>
                  <div className="modal-input-row">
                    <input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="Enter current password"
                    />
                    <button type="button" className="modal-toggle-pw" onClick={() => setShowCurrentPassword(v => !v)} aria-label={showCurrentPassword ? 'Hide' : 'Show'}>
                      {showCurrentPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="field-hint" style={{ marginTop: 0, marginBottom: '8px' }}>
                  You are signed in with a temporary password. Set a new password to continue.
                </p>
              )}
              {!mustChangePassword && (
                <div className="modal-field">
                  <label>Security Verification</label>
                  <PasswordChangeCaptcha
                    onTokenChange={setPasswordCaptchaToken}
                    onErrorChange={setPasswordCaptchaError}
                    resetVersion={passwordCaptchaResetVersion}
                  />
                  {passwordCaptchaError && (
                    <span className="field-error" role="alert">{passwordCaptchaError}</span>
                  )}
                </div>
              )}
              <div className="modal-field">
                <label htmlFor="new-password">New Password</label>
                <div className="modal-input-row">
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Min 8 characters"
                  />
                  <button type="button" className="modal-toggle-pw" onClick={() => setShowNewPassword(v => !v)} aria-label={showNewPassword ? 'Hide' : 'Show'}>
                    {showNewPassword ? '🙈' : '👁'}
                  </button>
                </div>
                <ul className="password-checklist" aria-label="Password requirements">
                  <li className={newPassword.length >= 8 ? 'met' : ''}>
                    <span className="check-icon" aria-hidden="true">{newPassword.length >= 8 ? '✓' : '✗'}</span>
                    At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? 'met' : ''}>
                    <span className="check-icon" aria-hidden="true">{/[A-Z]/.test(newPassword) ? '✓' : '✗'}</span>
                    One uppercase letter
                  </li>
                  <li className={/[a-z]/.test(newPassword) ? 'met' : ''}>
                    <span className="check-icon" aria-hidden="true">{/[a-z]/.test(newPassword) ? '✓' : '✗'}</span>
                    One lowercase letter
                  </li>
                  <li className={/\d/.test(newPassword) ? 'met' : ''}>
                    <span className="check-icon" aria-hidden="true">{/\d/.test(newPassword) ? '✓' : '✗'}</span>
                    One number
                  </li>
                  <li className={/[^a-zA-Z0-9]/.test(newPassword) ? 'met' : ''}>
                    <span className="check-icon" aria-hidden="true">{/[^a-zA-Z0-9]/.test(newPassword) ? '✓' : '✗'}</span>
                    One special character
                  </li>
                </ul>
              </div>
              <div className="modal-field">
                <label htmlFor="confirm-new-password">Confirm New Password</label>
                <div className="modal-input-row">
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Re-enter new password"
                  />
                  <button type="button" className="modal-toggle-pw" onClick={() => setShowConfirmPassword(v => !v)} aria-label={showConfirmPassword ? 'Hide' : 'Show'}>
                    {showConfirmPassword ? '🙈' : '👁'}
                  </button>
                </div>
                {confirmNewPassword && !doPasswordsMatch(newPassword, confirmNewPassword) && (
                  <span className="field-error" role="alert">Passwords do not match</span>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleSendPasswordVerificationCode} disabled={passwordSaving}>
                {passwordSaving ? 'Sending code…' : 'Send Verification Code'}
              </button>
              <button className="btn btn-secondary" onClick={closePasswordModal} disabled={passwordSaving}>
                Cancel
              </button>
            </div>
      </Modal>

      <Modal
        isOpen={showPasswordOtpModal}
        onClose={() => !passwordSaving && backToPasswordDetailsModal()}
        ariaLabelledBy="password-otp-modal-title"
      >
        <div className="modal-header">
          <h3 id="password-otp-modal-title">Email Verification</h3>
          <button className="modal-close" onClick={backToPasswordDetailsModal} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="modal-body">
          {passwordSuccess && <div className="profile-toast profile-toast-success">{passwordSuccess}</div>}
          {passwordOtpError && <div className="profile-toast profile-toast-error">{passwordOtpError}</div>}
          <p className="field-hint" style={{ marginTop: 0, marginBottom: '8px' }}>
            A 6-digit code has been sent to your email. It will expire in 10 minutes.
          </p>
          <div className="modal-field">
            <label htmlFor="password-change-otp">Verification Code</label>
            <input
              id="password-change-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={passwordOtpCode}
              onChange={(e) => setPasswordOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit code"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={backToPasswordDetailsModal} disabled={passwordSaving}>
            Back
          </button>
          <button className="btn btn-primary" onClick={handleVerifyPasswordCodeAndChange} disabled={passwordSaving}>
            {passwordSaving ? 'Updating…' : 'Verify Code & Update Password'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

// ──────────────────────────────────────────────
// Sub-components for DRY field rendering
// ──────────────────────────────────────────────

/** Parse comma-separated string into array of trimmed non-empty strings */
function parseCommaSeparated(value: string | undefined | null): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

interface PasswordChangeCaptchaProps {
  onTokenChange: (token: string | null) => void;
  onErrorChange: (message: string) => void;
  resetVersion: number;
}

const PasswordChangeCaptcha: React.FC<PasswordChangeCaptchaProps> = ({
  onTokenChange,
  onErrorChange,
  resetVersion,
}) => {
  const { captchaToken, turnstileRef, resetCaptcha } = useTurnstile({
    onError: onErrorChange,
    onSuccess: () => onErrorChange(''),
  });

  useEffect(() => {
    onTokenChange(captchaToken);
  }, [captchaToken, onTokenChange]);

  useEffect(() => {
    resetCaptcha();
    onTokenChange(null);
  }, [onTokenChange, resetCaptcha, resetVersion]);

  return (
    <div className="modal-captcha">
      <div ref={turnstileRef} />
    </div>
  );
};

interface ChipSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

/** Multi-select chip/tag picker */
const ChipSelect: React.FC<ChipSelectProps> = ({ options, selected, onChange }) => {
  const toggle = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  return (
    <div className="chip-select">
      {options.map((opt) => {
        const isActive = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            className={`chip ${isActive ? 'chip-active' : ''}`}
            onClick={() => toggle(opt)}
            aria-pressed={isActive}
          >
            {isActive && <span className="chip-check">✓</span>}
            {opt}
          </button>
        );
      })}
    </div>
  );
};

interface FieldProps {
  label: string;
  value: string | undefined | null;
  editing: boolean;
  type?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  autoComplete?: string;
  onChange?: (value: string) => void;
}

const Field: React.FC<FieldProps> = ({ label, value, editing, type = 'text', placeholder, hint, error, icon, autoComplete, onChange }) => (
  <div className={`profile-field ${error ? 'has-error' : ''}`}>
    <label>{label}</label>
    {editing && onChange ? (
      <>
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${label}-error` : undefined}
        />
        {error && <span className="field-error" id={`${label}-error`} role="alert">{error}</span>}
      </>
    ) : (
      <div className="field-value-row">
        {icon && <span className="field-icon">{icon}</span>}
        <span className={`field-value ${!value ? 'empty' : ''}`}>
          {value || 'Not specified'}
        </span>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
    )}
  </div>
);

interface SelectFieldProps {
  label: string;
  value: string;
  editing: boolean;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, value, editing, options, onChange }) => (
  <div className="profile-field">
    <label>{label}</label>
    {editing && onChange ? (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ) : (
      <span className={`field-value ${!value ? 'empty' : ''}`}>
        {options.find((o) => o.value === value)?.label || value || 'Not specified'}
      </span>
    )}
  </div>
);

interface NumberFieldProps {
  label: string;
  value: number | undefined | null;
  editing: boolean;
  min?: number;
  max?: number;
  error?: string;
  onChange?: (value: number | undefined) => void;
}

const NumberField: React.FC<NumberFieldProps> = ({ label, value, editing, min, max, error, onChange }) => (
  <div className={`profile-field ${error ? 'has-error' : ''}`}>
    <label>{label}</label>
    {editing && onChange ? (
      <>
        <input
          type="number"
          value={value ?? ''}
          min={min}
          max={max}
          aria-invalid={!!error}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? undefined : Number(v));
          }}
        />
        {error && <span className="field-error" role="alert">{error}</span>}
      </>
    ) : (
      <span className={`field-value ${value == null ? 'empty' : ''}`}>
        {value != null ? value : 'Not specified'}
      </span>
    )}
  </div>
);

// ── Helpers ──────────────────────────────────

/** Map UserProfile → form state */
function profileToForm(p: UserProfile): ProfileUpdateRequest {
  return {
    firstName: p.firstName ?? undefined,
    lastName: p.lastName ?? undefined,
    gender: p.gender ?? undefined,
    phone: p.phone ?? undefined,
    dateOfBirth: p.dateOfBirth ?? undefined,
    bloodType: p.bloodType ?? undefined,
    allergies: p.allergies ?? undefined,
    chronicConditions: p.chronicConditions ?? undefined,
    heightCm: p.heightCm ?? undefined,
    weightKg: p.weightKg ?? undefined,
    emergencyContactName: p.emergencyContactName ?? undefined,
    emergencyContactPhone: p.emergencyContactPhone ?? undefined,
  };
}

function getChangedProfileFields(
  current: ProfileUpdateRequest,
  original: ProfileUpdateRequest,
): ProfileUpdateRequest {
  const keys: Array<keyof ProfileUpdateRequest> = [
    'firstName',
    'lastName',
    'gender',
    'phone',
    'dateOfBirth',
    'bloodType',
    'allergies',
    'chronicConditions',
    'heightCm',
    'weightKg',
    'emergencyContactName',
    'emergencyContactPhone',
    'avatarUrl',
  ];

  const updates: ProfileUpdateRequest = {};
  for (const key of keys) {
    if (current[key] !== original[key]) {
      updates[key] = current[key] as never;
    }
  }

  return updates;
}

export default ProfilePage;
