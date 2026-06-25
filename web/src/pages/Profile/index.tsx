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
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { decodeJWT } from '@core/auth/auth-utils';
import { GENDER_OPTIONS } from '@core/auth/auth-types';
import type { ProfileUpdateRequest, UserProfile, Gender } from '@core/auth/auth-types';
import { isValidName, isValidDateOfBirth, isValidPhone, validatePassword, doPasswordsMatch } from '@core/auth/auth-utils';
import { Modal } from '../../components/Modal';
import {
  requestPasswordChangeOTP,
  requestProfileUpdateOTP,
  verifyPasswordChangeOTP,
  verifyProfileUpdateOTP,
  requestAvatarUploadUrl,
} from '../../services/userApi';
import { authService } from '../../services/auth';
import { useUiNotifications } from '../../contexts/UiNotificationsProvider';
import { useTurnstile } from '../../hooks/useTurnstile';

// ── Validation ──────────────────────────────
interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phone?: string;
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

const inputBaseClass =
  'w-full rounded-lg border bg-surface-card px-3 py-2 text-sm text-sand-900 focus:outline-none focus:ring-2';
const inputDefaultClass = `${inputBaseClass} border-sand-300 focus:border-nescafe focus:ring-sand-100`;
const inputErrorClass = `${inputBaseClass} border-red-500 focus:border-red-500 focus:ring-red-100`;

const buttonBaseClass =
  'inline-flex items-center gap-2 rounded-lg text-sm font-semibold px-4 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60';
const buttonPrimaryClass = `${buttonBaseClass} bg-nescafe text-white hover:bg-nescafe-hover`;
const buttonSecondaryClass = `${buttonBaseClass} bg-sand-200 text-sand-700 hover:bg-sand-300`;
const buttonEditClass = `${buttonBaseClass} border border-sand-200 bg-sand-50 text-sand-900 hover:border-sand-400 hover:bg-sand-100`;
const buttonAccountClass =
  'inline-flex items-center gap-2 rounded-lg border border-sand-200 bg-surface-card px-4 py-2 text-sm font-medium text-sand-900 transition-colors hover:border-sand-300 hover:bg-sand-50 hover:text-sand-900';

const toastBaseClass = 'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm';
const modalHeaderClass = 'flex items-center justify-between px-6 py-4 border-b border-sand-100';
const modalBodyClass = 'px-6 py-5 space-y-4';
const modalFooterClass = 'flex justify-end gap-3 px-6 py-4 border-t border-sand-100';
const modalCloseClass = 'text-sand-400 hover:text-sand-600 rounded-md p-1';
const modalFieldClass = 'space-y-1';
const modalInputRowClass = 'relative flex items-center';
const modalToggleClass = 'absolute right-2 text-sm text-sand-500 hover:text-sand-700';

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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setShowCancelConfirm(true);
      return;
    }
    executeCancel();
  };

  const executeCancel = () => {
    setShowCancelConfirm(false);
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
      notifyError('Authentication failed', `Could not verify password. ${message}`);
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
      notifyError('Update failed', `Could not update your profile. ${message}`);
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      notifyError('Invalid file type', 'Please select a JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notifyError('File too large', 'Avatar image must be under 5MB.');
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `avatar.${ext}`;
      
      const { token, path } = await requestAvatarUploadUrl(fileName);
      
      const supabase = authService.getSupabaseClient();
      const { error } = await supabase.storage.from('avatars').uploadToSignedUrl(path, token, file);
      
      if (error) {
        throw error;
      }
      
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
      
      handleChange('avatarUrl', publicUrlData.publicUrl);
      if (!isEditing) {
        handleEdit();
      }
      notifySuccess('Avatar uploaded', 'Click "Save Changes" to confirm your new avatar.');
    } catch (err) {
      notifyError('Upload failed', getErrorMessage(err, 'Failed to upload avatar.'));
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      <div className="min-h-screen bg-surface px-4 py-8 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="h-[72px] w-[72px] rounded-full bg-sand-200 " />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-2/5 rounded-md bg-sand-200 " />
              <div className="h-4 w-1/3 rounded-md bg-sand-200 " />
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-card border border-sand-200 rounded-lg p-6 mb-4 shadow-sm">
              <div className="h-5 w-1/3 rounded-md bg-sand-200  mb-4" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="h-12 rounded-md bg-sand-200 " />
                <div className="h-12 rounded-md bg-sand-200 " />
                <div className="h-12 rounded-md bg-sand-200 " />
                <div className="h-12 rounded-md bg-sand-200 " />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto p-10 space-y-12">
      <div>
        {/* ── Avatar + Identity Header ────────── */}
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative shrink-0 group">
            <div
              className={`h-[72px] w-[72px] rounded-full text-white text-xl font-semibold flex items-center justify-center tracking-[0.03em] shadow-sm overflow-hidden ${!(form.avatarUrl || profile?.avatarUrl) ? 'bg-gradient-to-br from-amber-600 to-sand-900' : ''}`}
              aria-label={`Profile picture for ${getFullName()}`}
            >
              {(form.avatarUrl || profile?.avatarUrl) ? (
                <img src={form.avatarUrl || profile?.avatarUrl || ''} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                getInitials()
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
              aria-label="Upload new avatar"
            >
              {avatarUploading ? (
                <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-sand-900">{getFullName()}</h1>
            <p className="text-sm text-sand-500">{user?.email ?? profile?.email}</p>
            {getMemberSince() && (
              <p className="text-xs text-sand-400">Member since {getMemberSince()}</p>
            )}
          </div>
          {!isEditing && (
            <button className={`${buttonEditClass} w-full sm:w-auto sm:ml-auto justify-center`} onClick={handleEdit} aria-label="Edit profile">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M11.13 1.87a1.75 1.75 0 0 1 2.47 0l.53.53a1.75 1.75 0 0 1 0 2.47l-8.36 8.36a1.75 1.75 0 0 1-.82.46l-2.88.72a.75.75 0 0 1-.91-.91l.72-2.88c.08-.31.24-.59.46-.82l8.79-8.79Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Edit Profile
            </button>
          )}
        </div>

        {/* Forced password change banner for new admin accounts */}
        {mustChangePassword && (
          <div className={`${toastBaseClass} mb-4 border-amber-200 bg-amber-50 text-amber-700`} role="alert">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 1L1 16h16L9 1z" stroke="#92400e" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M9 7v4M9 13h.01" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            You must change your temporary password before accessing the platform.
            <button
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-surface-card px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-100"
              onClick={openPasswordModal}
            >Change Password Now</button>
          </div>
        )}

        {/* Feedback messages */}
        {successMsg && (
          <div className={`${toastBaseClass} mb-4 border-emerald-200 bg-emerald-50 text-emerald-700`} role="status">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="8" stroke="#166534" strokeWidth="1.5"/>
              <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="#166534" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className={`${toastBaseClass} mb-4 border-red-200 bg-red-50 text-red-700`} role="alert">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="8" stroke="#991b1b" strokeWidth="1.5"/>
              <path d="M9 5.5V9.5M9 12.5H9.01" stroke="#991b1b" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {errorMsg}
          </div>
        )}

        {/* ── Section 1: Personal Information ────── */}
        <section className="bg-surface-card rounded-2xl p-6 mb-4 shadow-md" aria-labelledby="section-personal">
          <h2 id="section-personal" className="flex items-center gap-2 text-base font-semibold text-sand-900 border-b border-sand-100 pb-2 mb-4">
            <svg className="text-amber-600" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 18c0-3.31 3.13-6 7-6s7 2.69 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Personal Information
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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





        {/* ── Section 4: Account Actions ──────────── */}
        <section className="bg-surface rounded-2xl p-6 mb-4 shadow-md" aria-labelledby="section-account">
          <h2 id="section-account" className="flex items-center gap-2 text-base font-semibold text-sand-900 border-b border-sand-100 pb-2 mb-4">
            <svg className="text-amber-600" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="4" y="8" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 8V6a3 3 0 1 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="10" cy="12.5" r="1" fill="currentColor"/>
            </svg>
            Account &amp; Security
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              className={buttonAccountClass}
              onClick={openPasswordModal}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4.5 8V5a3.5 3.5 0 1 1 7 0v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <rect x="3" y="7.5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
              Change Password
            </button>
            {(profile?.accountType === 'doctor' || profile?.accountType === 'pharmacist') && (
              <Link
                to="/staff-verification"
                className={buttonAccountClass}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.78 7a5.78 5.78 0 1 1 11.56 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Professional Verification
              </Link>
            )}
          </div>
        </section>

        {/* ── Action buttons (edit mode) ──────────── */}
        {isEditing && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end items-center">
            {showCancelConfirm ? (
              <div className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                <span className="text-sm text-red-700 font-medium">Discard unsaved changes?</span>
                <button className={`${buttonSecondaryClass} !bg-white !text-red-700 hover:!bg-red-100`} onClick={executeCancel}>
                  Yes, Discard
                </button>
                <button className={buttonSecondaryClass} onClick={() => setShowCancelConfirm(false)}>
                  Keep Editing
                </button>
              </div>
            ) : (
              <>
                <button className={buttonPrimaryClass} onClick={handleSave}>
                  Save Changes
                </button>
                <button className={buttonSecondaryClass} onClick={handleCancel}>
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Step-up Verification Modals ─────────────── */}
      <Modal
        isOpen={showStepUpPassword}
        onClose={() => !stepUpLoading && setShowStepUpPassword(false)}
        ariaLabelledBy="stepup-password-title"
        contentClassName="max-w-md"
      >
        <div className={modalHeaderClass}>
          <h3 id="stepup-password-title" className="text-lg font-semibold text-sand-900">Verify Your Identity</h3>
          <button className={modalCloseClass} onClick={() => setShowStepUpPassword(false)} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className={modalBodyClass}>
          <p className="text-sm text-sand-500">For your security, please enter your password to save profile changes.</p>
          {stepUpError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {stepUpError}
            </div>
          )}
          <div className={modalFieldClass}>
            <label className="text-xs font-medium text-sand-500" htmlFor="stepup-password">Current Password</label>
            <input
              id="stepup-password"
              type="password"
              value={stepUpPassword}
              onChange={(e) => setStepUpPassword(e.target.value)}
              disabled={stepUpLoading}
              className={inputDefaultClass}
            />
          </div>
        </div>
        <div className={modalFooterClass}>
          <button className={buttonSecondaryClass} onClick={() => setShowStepUpPassword(false)} disabled={stepUpLoading}>Cancel</button>
          <button className={buttonPrimaryClass} onClick={submitStepUpPassword} disabled={stepUpLoading}>
            {stepUpLoading ? 'Verifying...' : 'Continue'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showStepUpOtp}
        onClose={() => !stepUpLoading && setShowStepUpOtp(false)}
        ariaLabelledBy="stepup-otp-title"
        contentClassName="max-w-md"
      >
        <div className={modalHeaderClass}>
          <h3 id="stepup-otp-title" className="text-lg font-semibold text-sand-900">Email Verification</h3>
          <button className={modalCloseClass} onClick={() => setShowStepUpOtp(false)} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className={modalBodyClass}>
          <p className="text-sm text-sand-500">A 6-digit code has been sent to your email. It will expire in 10 minutes.</p>
          {stepUpError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {stepUpError}
            </div>
          )}
          <div className={modalFieldClass}>
            <label className="text-xs font-medium text-sand-500" htmlFor="stepup-otp">Verification Code</label>
            <input
              id="stepup-otp"
              type="text"
              maxLength={6}
              value={stepUpOtp}
              onChange={(e) => setStepUpOtp(e.target.value)}
              disabled={stepUpLoading}
              className={`${inputDefaultClass} tracking-[2px] text-center text-base`}
            />
          </div>
        </div>
        <div className={modalFooterClass}>
          <button className={buttonSecondaryClass} onClick={() => setShowStepUpOtp(false)} disabled={stepUpLoading}>Cancel</button>
          <button className={buttonPrimaryClass} onClick={submitStepUpOtp} disabled={stepUpLoading}>
            {stepUpLoading ? 'Verifying...' : 'Verify & Save'}
          </button>
        </div>
      </Modal>

      {/* ── Password Change Modal ─────────────── */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => !passwordSaving && closePasswordModal()}
        ariaLabelledBy="password-modal-title"
        contentClassName="max-w-md"
      >
            <div className={modalHeaderClass}>
              <h3 id="password-modal-title" className="text-lg font-semibold text-sand-900">Change Password</h3>
              <button className={modalCloseClass} onClick={closePasswordModal} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className={modalBodyClass}>
              {passwordSuccess && (
                <div className={`${toastBaseClass} border-emerald-200 bg-emerald-50 text-emerald-700`}>{passwordSuccess}</div>
              )}
              {passwordError && (
                <div className={`${toastBaseClass} border-red-200 bg-red-50 text-red-700`}>{passwordError}</div>
              )}
              {!mustChangePassword ? (
                <div className={modalFieldClass}>
                  <label className="text-xs font-medium text-sand-500" htmlFor="current-password">Current Password</label>
                  <div className={modalInputRowClass}>
                    <input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="Enter current password"
                      className={`${inputDefaultClass} pr-10`}
                    />
                    <button type="button" className={modalToggleClass} onClick={() => setShowCurrentPassword(v => !v)} aria-label={showCurrentPassword ? 'Hide' : 'Show'}>
                      {showCurrentPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-sand-400">
                  You are signed in with a temporary password. Set a new password to continue.
                </p>
              )}
              {!mustChangePassword && (
                <div className={modalFieldClass}>
                  <label className="text-xs font-medium text-sand-500">Security Verification</label>
                  <PasswordChangeCaptcha
                    onTokenChange={setPasswordCaptchaToken}
                    onErrorChange={setPasswordCaptchaError}
                    resetVersion={passwordCaptchaResetVersion}
                  />
                  {passwordCaptchaError && (
                    <span className="text-xs text-red-600" role="alert">{passwordCaptchaError}</span>
                  )}
                </div>
              )}
              <div className={modalFieldClass}>
                <label className="text-xs font-medium text-sand-500" htmlFor="new-password">New Password</label>
                <div className={modalInputRowClass}>
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Min 8 characters"
                    className={`${inputDefaultClass} pr-10`}
                  />
                  <button type="button" className={modalToggleClass} onClick={() => setShowNewPassword(v => !v)} aria-label={showNewPassword ? 'Hide' : 'Show'}>
                    {showNewPassword ? '🙈' : '👁'}
                  </button>
                </div>
                <ul className="mt-2 space-y-1 text-xs" aria-label="Password requirements">
                  <li className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-emerald-600' : 'text-sand-400'}`}>
                    <span className={`text-xs font-bold ${newPassword.length >= 8 ? 'text-emerald-600' : 'text-sand-300'}`} aria-hidden="true">{newPassword.length >= 8 ? '✓' : '✗'}</span>
                    At least 8 characters
                  </li>
                  <li className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) ? 'text-emerald-600' : 'text-sand-400'}`}>
                    <span className={`text-xs font-bold ${/[A-Z]/.test(newPassword) ? 'text-emerald-600' : 'text-sand-300'}`} aria-hidden="true">{/[A-Z]/.test(newPassword) ? '✓' : '✗'}</span>
                    One uppercase letter
                  </li>
                  <li className={`flex items-center gap-2 ${/[a-z]/.test(newPassword) ? 'text-emerald-600' : 'text-sand-400'}`}>
                    <span className={`text-xs font-bold ${/[a-z]/.test(newPassword) ? 'text-emerald-600' : 'text-sand-300'}`} aria-hidden="true">{/[a-z]/.test(newPassword) ? '✓' : '✗'}</span>
                    One lowercase letter
                  </li>
                  <li className={`flex items-center gap-2 ${/\d/.test(newPassword) ? 'text-emerald-600' : 'text-sand-400'}`}>
                    <span className={`text-xs font-bold ${/\d/.test(newPassword) ? 'text-emerald-600' : 'text-sand-300'}`} aria-hidden="true">{/\d/.test(newPassword) ? '✓' : '✗'}</span>
                    One number
                  </li>
                  <li className={`flex items-center gap-2 ${/[^a-zA-Z0-9]/.test(newPassword) ? 'text-emerald-600' : 'text-sand-400'}`}>
                    <span className={`text-xs font-bold ${/[^a-zA-Z0-9]/.test(newPassword) ? 'text-emerald-600' : 'text-sand-300'}`} aria-hidden="true">{/[^a-zA-Z0-9]/.test(newPassword) ? '✓' : '✗'}</span>
                    One special character
                  </li>
                </ul>
              </div>
              <div className={modalFieldClass}>
                <label className="text-xs font-medium text-sand-500" htmlFor="confirm-new-password">Confirm New Password</label>
                <div className={modalInputRowClass}>
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Re-enter new password"
                    className={`${inputDefaultClass} pr-10`}
                  />
                  <button type="button" className={modalToggleClass} onClick={() => setShowConfirmPassword(v => !v)} aria-label={showConfirmPassword ? 'Hide' : 'Show'}>
                    {showConfirmPassword ? '🙈' : '👁'}
                  </button>
                </div>
                {confirmNewPassword && !doPasswordsMatch(newPassword, confirmNewPassword) && (
                  <span className="text-xs text-red-600" role="alert">Passwords do not match</span>
                )}
              </div>
            </div>
            <div className={modalFooterClass}>
              <button className={buttonPrimaryClass} onClick={handleSendPasswordVerificationCode} disabled={passwordSaving}>
                {passwordSaving ? 'Sending code…' : 'Send Verification Code'}
              </button>
              <button className={buttonSecondaryClass} onClick={closePasswordModal} disabled={passwordSaving}>
                Cancel
              </button>
            </div>
      </Modal>

      <Modal
        isOpen={showPasswordOtpModal}
        onClose={() => !passwordSaving && backToPasswordDetailsModal()}
        ariaLabelledBy="password-otp-modal-title"
        contentClassName="max-w-md"
      >
        <div className={modalHeaderClass}>
          <h3 id="password-otp-modal-title" className="text-lg font-semibold text-sand-900">Email Verification</h3>
          <button className={modalCloseClass} onClick={backToPasswordDetailsModal} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className={modalBodyClass}>
          {passwordSuccess && (
            <div className={`${toastBaseClass} border-emerald-200 bg-emerald-50 text-emerald-700`}>{passwordSuccess}</div>
          )}
          {passwordOtpError && (
            <div className={`${toastBaseClass} border-red-200 bg-red-50 text-red-700`}>{passwordOtpError}</div>
          )}
          <p className="text-xs text-sand-400">
            A 6-digit code has been sent to your email. It will expire in 10 minutes.
          </p>
          <div className={modalFieldClass}>
            <label className="text-xs font-medium text-sand-500" htmlFor="password-change-otp">Verification Code</label>
            <input
              id="password-change-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={passwordOtpCode}
              onChange={(e) => setPasswordOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit code"
              className={inputDefaultClass}
            />
          </div>
        </div>
        <div className={modalFooterClass}>
          <button className={buttonSecondaryClass} onClick={backToPasswordDetailsModal} disabled={passwordSaving}>
            Back
          </button>
          <button className={buttonPrimaryClass} onClick={handleVerifyPasswordCodeAndChange} disabled={passwordSaving}>
            {passwordSaving ? 'Updating…' : 'Verify Code & Update Password'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

// ──────────────────────────────────────────────
// ──────────────────────────────────────────────
// Sub-components for DRY field rendering
// ──────────────────────────────────────────────

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
    <div className="min-h-[65px] flex items-center">
      <div ref={turnstileRef} className="min-h-[65px]" />
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

const Field: React.FC<FieldProps> = ({ label, value, editing, type = 'text', placeholder, hint, error, icon, autoComplete, onChange }) => {
  const inputClassName = error ? inputErrorClass : inputDefaultClass;
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-wider text-sand-500">{label}</label>
      {editing && onChange ? (
        <>
          <input
            className={inputClassName}
            type={type}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoComplete={autoComplete}
            aria-invalid={!!error}
            aria-describedby={error ? `${label}-error` : undefined}
          />
          {error && <span className="text-xs text-red-600" id={`${label}-error`} role="alert">{error}</span>}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2 py-2">
          {icon && <span className="flex items-center text-sand-400">{icon}</span>}
          <span className={value ? 'text-sm text-sand-900' : 'text-sm text-sand-400 italic'}>
            {value || 'Not specified'}
          </span>
          {hint && <span className="text-xs text-sand-400">{hint}</span>}
        </div>
      )}
    </div>
  );
};

interface SelectFieldProps {
  label: string;
  value: string;
  editing: boolean;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, value, editing, options, onChange }) => (
  <div className="space-y-1">
    <label className="text-xs font-semibold uppercase tracking-wider text-sand-500">{label}</label>
    {editing && onChange ? (
      <select className={inputDefaultClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ) : (
      <span className={value ? 'text-sm text-sand-900' : 'text-sm text-sand-400 italic'}>
        {options.find((o) => o.value === value)?.label || value || 'Not specified'}
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
