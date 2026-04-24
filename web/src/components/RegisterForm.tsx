/**
 * Registration Form Component - React Web
 * Multi-field form with Cloudflare Turnstile CAPTCHA integration
 * Follows web.dev best practices for accessibility and UX
 */

import React, { useState, useCallback, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { GENDER_OPTIONS, type Gender } from '@core/auth/auth-types';
import {
  isValidEmail,
  validatePassword,
  isValidPhone,
  isValidName,
  isValidDateOfBirth,
  doPasswordsMatch,
} from '@core/auth/auth-utils';
import { useTurnstile } from '../hooks/useTurnstile';
import { cn } from '../lib/cn';

/** Field-level error state */
interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  countryCode?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  password?: string;
  confirmPassword?: string;
  captcha?: string;
}

export const RegisterForm: React.FC = () => {
  const { signUp, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode] = useState('+20'); // Egypt only
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Captcha — wired into field-level errors
  const handleCaptchaError = useCallback(
    (msg: string) => {
      setFieldErrors((prev) => ({ ...prev, captcha: msg }));
    },
    [],
  );
  const handleCaptchaSuccess = useCallback(() => {
    setFieldErrors((prev) => ({ ...prev, captcha: undefined }));
    setGlobalError(null);
  }, []);

  const { captchaToken, turnstileRef, resetCaptcha } = useTurnstile({
    onError: handleCaptchaError,
    onSuccess: handleCaptchaSuccess,
  });

  // UI state
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Clear a specific field error on user input
   */
  const clearFieldError = useCallback((field: keyof FieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setGlobalError(null);
  }, []);

  /**
   * Validate all fields and return true if valid
   */
  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    // First name
    if (!firstName.trim()) {
      errors.firstName = 'First name is required';
    } else {
      const firstNameValidation = isValidName(firstName);
      if (!firstNameValidation.valid) {
        errors.firstName = firstNameValidation.error;
      }
    }

    // Last name
    if (!lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else {
      const lastNameValidation = isValidName(lastName);
      if (!lastNameValidation.valid) {
        errors.lastName = lastNameValidation.error;
      }
    }

    // Email
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone - Country Code
    if (!countryCode) {
      errors.countryCode = 'Country code is required';
    }

    // Phone - Number
    if (!phone.trim()) {
      errors.phone = 'Phone number is required';
    } else {
      const phoneValidation = isValidPhone(countryCode, phone);
      if (!phoneValidation.valid) {
        errors.phone = phoneValidation.error;
      }
    }

    // Date of birth
    if (!dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else {
      const dobValidation = isValidDateOfBirth(dateOfBirth);
      if (!dobValidation.valid) {
        errors.dateOfBirth = dobValidation.error;
      }
    }

    // Gender
    if (!gender) {
      errors.gender = 'Please select a gender';
    }

    // Password
    if (!password) {
      errors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        errors.password = passwordValidation.error;
      }
    }

    // Confirm password
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (!doPasswordsMatch(password, confirmPassword)) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // CAPTCHA
    if (!captchaToken) {
      errors.captcha = 'Please complete the CAPTCHA verification';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGlobalError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    const result = await signUp({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      countryCode,
      phone: phone.trim(),
      dateOfBirth,
      gender: gender as Gender,
      password,
      captchaToken: captchaToken!,
    });

    if (result.success) {
      setSuccessMessage(result.message || 'Registration successful! Check your email.');
      resetCaptcha();

      // Redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } else {
      setGlobalError(result.message || 'Registration failed. Please try again.');
      resetCaptcha();
    }
  };

  const handleGoogleSignIn = async () => {
    setGlobalError(null);
    setSuccessMessage(null);
    await signInWithGoogle();
  };

  // Compute max date for DOB (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50 font-sans">
      <form className="w-full max-w-2xl bg-white p-10 rounded-lg border border-gray-200" onSubmit={handleSubmit} noValidate>
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="flex justify-center mb-4" aria-label="Back to home">
            <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white font-serif text-xl font-bold">A</div>
          </Link>
          <h1 className="font-serif text-2xl font-semibold text-gray-900 mb-1 tracking-tight">Create Account</h1>
          <p className="text-sm text-gray-600">Join Aethea — your health, simplified</p>
        </div>

        {/* Global Error */}
        {globalError && (
          <div className="flex items-start gap-2 bg-red-50 border-l-4 border-red-600 rounded-lg py-3 px-4 mb-5 text-red-700 text-sm leading-relaxed" role="alert">
            {globalError}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="flex items-start gap-2 bg-green-50 border-l-4 border-green-600 rounded-lg py-3 px-4 mb-5 text-green-700 text-sm leading-relaxed" role="status">
            {successMessage}
          </div>
        )}

        {/* Name Row */}
        <div className="flex flex-col md:flex-row gap-4 mb-5">
          <div className="flex-1">
            <label htmlFor="firstName" className="block text-sm font-semibold text-gray-900 mb-1">
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              className={cn(
                "w-full h-12 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg transition-colors focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed",
                fieldErrors.firstName && "border-red-600 focus:border-red-600 focus:ring-red-100"
              )}
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); clearFieldError('firstName'); }}
              placeholder="John"
              autoComplete="given-name"
              required
              disabled={loading}
              aria-invalid={!!fieldErrors.firstName}
              aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
            />
            {fieldErrors.firstName && (
              <span id="firstName-error" className="flex items-center gap-1 text-xs text-red-600 mt-1 font-medium">{fieldErrors.firstName}</span>
            )}
          </div>

          <div className="flex-1">
            <label htmlFor="lastName" className="block text-sm font-semibold text-gray-900 mb-1">
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              className={cn(
                "w-full h-12 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg transition-colors focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed",
                fieldErrors.lastName && "border-red-600 focus:border-red-600 focus:ring-red-100"
              )}
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); clearFieldError('lastName'); }}
              placeholder="Doe"
              autoComplete="family-name"
              required
              disabled={loading}
              aria-invalid={!!fieldErrors.lastName}
              aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
            />
            {fieldErrors.lastName && (
              <span id="lastName-error" className="flex items-center gap-1 text-xs text-red-600 mt-1 font-medium">{fieldErrors.lastName}</span>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="mb-5">
          <label htmlFor="reg-email" className="block text-sm font-semibold text-gray-900 mb-1">
            Email
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            className={cn(
              "w-full h-12 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg transition-colors focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed",
              fieldErrors.email && "border-red-600 focus:border-red-600 focus:ring-red-100"
            )}
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={loading}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          />
          {fieldErrors.email && (
            <span id="email-error" className="flex items-center gap-1 text-xs text-red-600 mt-1 font-medium">{fieldErrors.email}</span>
          )}
        </div>

        {/* Phone */}
        <div className="flex flex-col md:flex-row gap-4 mb-5">
          <div className="flex-[0_0_120px]">
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Country Code
            </label>
            <div className="w-full h-12 px-3 py-2 flex items-center gap-1 font-semibold text-gray-900 bg-teal-50 border border-gray-200 rounded-lg cursor-default select-none" aria-label="Country code: Egypt +20">
              🇪🇬 +20
            </div>
          </div>

          <div className="flex-1">
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-1">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className={cn(
                "w-full h-12 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg transition-colors focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed",
                fieldErrors.phone && "border-red-600 focus:border-red-600 focus:ring-red-100"
              )}
              value={phone}
              onChange={(e) => { setPhone(e.target.value); clearFieldError('phone'); }}
              placeholder="10XXXXXXXX"
              autoComplete="tel"
              required
              disabled={loading}
              aria-invalid={!!fieldErrors.phone}
              aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
            />
            {fieldErrors.phone && (
              <span id="phone-error" className="flex items-center gap-1 text-xs text-red-600 mt-1 font-medium">{fieldErrors.phone}</span>
            )}
          </div>
        </div>

        {/* Date of Birth & Gender Row */}
        <div className="flex flex-col md:flex-row gap-4 mb-5">
          <div className="flex-1">
            <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-gray-900 mb-1">
              Date of Birth
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              className={cn(
                "w-full h-12 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg transition-colors focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-gray-50 disabled:cursor-not-allowed",
                fieldErrors.dateOfBirth && "border-red-600 focus:border-red-600 focus:ring-red-100"
              )}
              value={dateOfBirth}
              onChange={(e) => { setDateOfBirth(e.target.value); clearFieldError('dateOfBirth'); }}
              max={today}
              required
              disabled={loading}
              aria-invalid={!!fieldErrors.dateOfBirth}
              aria-describedby={fieldErrors.dateOfBirth ? 'dob-error' : undefined}
            />
            {fieldErrors.dateOfBirth && (
              <span id="dob-error" className="flex items-center gap-1 text-xs text-red-600 mt-1 font-medium">{fieldErrors.dateOfBirth}</span>
            )}
          </div>

          <div className="flex-1">
            <label htmlFor="gender" className="block text-sm font-semibold text-gray-900 mb-1">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              className={cn(
                "w-full h-12 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg transition-colors focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none pr-9 cursor-pointer",
                "bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg_xmlns=%27http://www.w3.org/2000/svg%27_viewBox=%270_0_24_24%27_fill=%27none%27_stroke=%27%23475569%27_stroke-width=%272%27_stroke-linecap=%27round%27_stroke-linejoin=%27round%27%3e%3cpolyline_points=%276_9_12_15_18_9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[size:1rem]",
                fieldErrors.gender && "border-red-600 focus:border-red-600 focus:ring-red-100"
              )}
              value={gender}
              onChange={(e) => { setGender(e.target.value as Gender); clearFieldError('gender'); }}
              required
              disabled={loading}
              aria-invalid={!!fieldErrors.gender}
              aria-describedby={fieldErrors.gender ? 'gender-error' : undefined}
            >
              <option value="" disabled>Select gender</option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {fieldErrors.gender && (
              <span id="gender-error" className="flex items-center gap-1 text-xs text-red-600 mt-1 font-medium">{fieldErrors.gender}</span>
            )}
          </div>
        </div>

        {/* Password */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="reg-password" className="block text-sm font-semibold text-gray-900">
              Password
            </label>
            <button
              type="button"
              className="text-teal-600 bg-transparent text-xs font-semibold px-2 py-1 rounded-md transition-colors hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center min-h-[2rem] min-w-[2rem]"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="pointer-events-none shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg className="pointer-events-none shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          <input
            id="reg-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            className={cn(
              "w-full h-12 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg transition-colors focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed",
              fieldErrors.password && "border-red-600 focus:border-red-600 focus:ring-red-100"
            )}
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            disabled={loading}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
          />
          <ul className="flex flex-col gap-1 list-none p-0 mt-2" id="password-hint" aria-label="Password requirements">
            <li className={cn("flex items-center gap-1.5 text-xs font-medium transition-colors", password.length >= 8 ? "text-green-600" : "text-gray-400")}>
              <span className={cn("text-[11px] w-4 text-center shrink-0 font-bold", password.length >= 8 ? "text-green-600" : "text-gray-300")} aria-hidden="true">{password.length >= 8 ? '✓' : '✗'}</span>
              At least 8 characters
            </li>
            <li className={cn("flex items-center gap-1.5 text-xs font-medium transition-colors", /[A-Z]/.test(password) ? "text-green-600" : "text-gray-400")}>
              <span className={cn("text-[11px] w-4 text-center shrink-0 font-bold", /[A-Z]/.test(password) ? "text-green-600" : "text-gray-300")} aria-hidden="true">{/[A-Z]/.test(password) ? '✓' : '✗'}</span>
              One uppercase letter
            </li>
            <li className={cn("flex items-center gap-1.5 text-xs font-medium transition-colors", /[a-z]/.test(password) ? "text-green-600" : "text-gray-400")}>
              <span className={cn("text-[11px] w-4 text-center shrink-0 font-bold", /[a-z]/.test(password) ? "text-green-600" : "text-gray-300")} aria-hidden="true">{/[a-z]/.test(password) ? '✓' : '✗'}</span>
              One lowercase letter
            </li>
            <li className={cn("flex items-center gap-1.5 text-xs font-medium transition-colors", /\d/.test(password) ? "text-green-600" : "text-gray-400")}>
              <span className={cn("text-[11px] w-4 text-center shrink-0 font-bold", /\d/.test(password) ? "text-green-600" : "text-gray-300")} aria-hidden="true">{/\d/.test(password) ? '✓' : '✗'}</span>
              One number
            </li>
            <li className={cn("flex items-center gap-1.5 text-xs font-medium transition-colors", /[^a-zA-Z0-9]/.test(password) ? "text-green-600" : "text-gray-400")}>
              <span className={cn("text-[11px] w-4 text-center shrink-0 font-bold", /[^a-zA-Z0-9]/.test(password) ? "text-green-600" : "text-gray-300")} aria-hidden="true">{/[^a-zA-Z0-9]/.test(password) ? '✓' : '✗'}</span>
              One special character
            </li>
          </ul>
          {fieldErrors.password && (
            <span id="password-error" className="flex items-center gap-1 text-xs text-red-600 mt-1 font-medium">{fieldErrors.password}</span>
          )}
        </div>

        {/* Confirm Password */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900">
              Confirm Password
            </label>
            <button
              type="button"
              className="text-teal-600 bg-transparent text-xs font-semibold px-2 py-1 rounded-md transition-colors hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center min-h-[2rem] min-w-[2rem]"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
                <svg className="pointer-events-none shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg className="pointer-events-none shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            className={cn(
              "w-full h-12 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg transition-colors focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed",
              fieldErrors.confirmPassword && "border-red-600 focus:border-red-600 focus:ring-red-100"
            )}
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            required
            disabled={loading}
            aria-invalid={!!fieldErrors.confirmPassword}
            aria-describedby={fieldErrors.confirmPassword ? 'confirm-error' : undefined}
          />
          {fieldErrors.confirmPassword && (
            <span id="confirm-error" className="flex items-center gap-1 text-xs text-red-600 mt-1 font-medium">{fieldErrors.confirmPassword}</span>
          )}
        </div>

        {/* Cloudflare Turnstile CAPTCHA */}
        <div className="mb-5 flex flex-col items-center gap-2">
          <div ref={turnstileRef} className="min-h-[65px] w-full flex justify-center" />
          {fieldErrors.captcha && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-medium">{fieldErrors.captcha}</span>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full h-12 bg-teal-600 text-white text-sm px-4 py-2 rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <div className="flex items-center gap-3 my-4 text-gray-500 text-sm before:content-[''] before:h-px before:flex-1 before:bg-gray-200 after:content-[''] after:h-px after:flex-1 after:bg-gray-200" role="separator" aria-label="Alternative sign up methods">
          <span>or</span>
        </div>

        <button
          type="button"
          className="w-full h-12 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
          onClick={() => void handleGoogleSignIn()}
          disabled={loading}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.6 12 2.6 6.9 2.6 2.8 6.7 2.8 11.8S6.9 21 12 21c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.8-.1-1.2H12z"/>
          </svg>
          Continue with Google
        </button>

        {/* Sign In Link */}
        <div className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-teal-600 font-semibold hover:text-teal-700 hover:underline underline-offset-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 rounded">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
};
