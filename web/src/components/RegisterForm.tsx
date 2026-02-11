/**
 * Registration Form Component - React Web
 * Multi-field form with Cloudflare Turnstile CAPTCHA integration
 * Follows web.dev best practices for accessibility and UX
 */

import React, { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/auth/useAuth';
import { GENDER_OPTIONS, type Gender } from '@shared/auth/auth-types';
import { TURNSTILE_CONFIG } from '@shared/auth/constants';
import {
  isValidEmail,
  validatePassword,
  isValidPhone,
  isValidName,
  isValidDateOfBirth,
  doPasswordsMatch,
  COUNTRY_PHONE_RULES,
} from '@shared/auth/auth-utils';
import './RegisterForm.css';

// Turnstile global type declaration
declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

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
  const { signUp, loading } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+966'); // Default Saudi Arabia
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Captcha state
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // UI state
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Load Turnstile script and render widget (explicit mode for SPA)
   */
  useEffect(() => {
    // Avoid duplicate script loading
    if (document.getElementById('cf-turnstile-script')) return;

    const script = document.createElement('script');
    script.id = 'cf-turnstile-script';
    script.src = `${TURNSTILE_CONFIG.SCRIPT_URL}?render=explicit`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.turnstile && turnstileRef.current) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_CONFIG.SITE_KEY,
          callback: (token: string) => {
            setCaptchaToken(token);
            setFieldErrors((prev) => ({ ...prev, captcha: undefined }));
          },
          'expired-callback': () => setCaptchaToken(null),
          'error-callback': () => setCaptchaToken(null),
          theme: 'light',
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, []);

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
      // Reset Turnstile widget
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      setCaptchaToken(null);

      // Redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } else {
      setGlobalError(result.message || 'Registration failed. Please try again.');
      // Reset Turnstile on failure so user can retry
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      setCaptchaToken(null);
    }
  };

  // Compute max date for DOB (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit} noValidate>
        {/* Header */}
        <div className="form-header">
          <h1 className="form-title">Create Account</h1>
          <p className="form-subtitle">Join Aethea Medical Platform</p>
        </div>

        {/* Global Error */}
        {globalError && (
          <div className="error-banner" role="alert">
            {globalError}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="success-banner" role="status">
            {successMessage}
          </div>
        )}

        {/* Name Row */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName" className="form-label">
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              className={`form-input ${fieldErrors.firstName ? 'input-error' : ''}`}
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
              <span id="firstName-error" className="field-error">{fieldErrors.firstName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="lastName" className="form-label">
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              className={`form-input ${fieldErrors.lastName ? 'input-error' : ''}`}
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
              <span id="lastName-error" className="field-error">{fieldErrors.lastName}</span>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="form-group">
          <label htmlFor="reg-email" className="form-label">
            Email
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
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
            <span id="email-error" className="field-error">{fieldErrors.email}</span>
          )}
        </div>

        {/* Phone */}
        <div className="form-row">
          <div className="form-group" style={{ flex: '0 0 140px' }}>
            <label htmlFor="countryCode" className="form-label">
              Country Code
            </label>
            <select
              id="countryCode"
              name="countryCode"
              className={`form-input ${fieldErrors.countryCode ? 'input-error' : ''}`}
              value={countryCode}
              onChange={(e) => { setCountryCode(e.target.value); clearFieldError('countryCode'); }}
              required
              disabled={loading}
              aria-invalid={!!fieldErrors.countryCode}
              aria-describedby={fieldErrors.countryCode ? 'countryCode-error' : undefined}
            >
              {Object.entries(COUNTRY_PHONE_RULES).map(([country, rule]) => (
                <option key={rule.code} value={rule.code}>
                  {rule.code} ({country})
                </option>
              ))}
            </select>
            {fieldErrors.countryCode && (
              <span id="countryCode-error" className="field-error">{fieldErrors.countryCode}</span>
            )}
          </div>

          <div className="form-group" style={{ flex: '1' }}>
            <label htmlFor="phone" className="form-label">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className={`form-input ${fieldErrors.phone ? 'input-error' : ''}`}
              value={phone}
              onChange={(e) => { setPhone(e.target.value); clearFieldError('phone'); }}
              placeholder="5XX XXX XXXX"
              autoComplete="tel"
              required
              disabled={loading}
              aria-invalid={!!fieldErrors.phone}
              aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
            />
            {fieldErrors.phone && (
              <span id="phone-error" className="field-error">{fieldErrors.phone}</span>
            )}
          </div>
        </div>

        {/* Date of Birth & Gender Row */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="dateOfBirth" className="form-label">
              Date of Birth
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              className={`form-input ${fieldErrors.dateOfBirth ? 'input-error' : ''}`}
              value={dateOfBirth}
              onChange={(e) => { setDateOfBirth(e.target.value); clearFieldError('dateOfBirth'); }}
              max={today}
              required
              disabled={loading}
              aria-invalid={!!fieldErrors.dateOfBirth}
              aria-describedby={fieldErrors.dateOfBirth ? 'dob-error' : undefined}
            />
            {fieldErrors.dateOfBirth && (
              <span id="dob-error" className="field-error">{fieldErrors.dateOfBirth}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="gender" className="form-label">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              className={`form-input form-select ${fieldErrors.gender ? 'input-error' : ''}`}
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
              <span id="gender-error" className="field-error">{fieldErrors.gender}</span>
            )}
          </div>
        </div>

        {/* Password */}
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="reg-password" className="form-label">
              Password
            </label>
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            id="reg-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            disabled={loading}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
          />
          <span id="password-hint" className="field-hint">
            Minimum 8 characters
          </span>
          {fieldErrors.password && (
            <span id="password-error" className="field-error">{fieldErrors.password}</span>
          )}
        </div>

        {/* Confirm Password */}
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            className={`form-input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
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
            <span id="confirm-error" className="field-error">{fieldErrors.confirmPassword}</span>
          )}
        </div>

        {/* Cloudflare Turnstile CAPTCHA */}
        <div className="captcha-container">
          <div ref={turnstileRef} />
          {fieldErrors.captcha && (
            <span className="field-error">{fieldErrors.captcha}</span>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="submit-button"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        {/* Sign In Link */}
        <div className="signin-link">
          Already have an account?{' '}
          <a href="/login" className="link">
            Sign in
          </a>
        </div>
      </form>
    </div>
  );
};
