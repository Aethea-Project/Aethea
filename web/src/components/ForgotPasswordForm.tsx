/**
 * Forgot Password Form Component
 * Allows users to request a password reset email
 */

import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { isValidEmail } from '@core/auth/auth-utils';
import './LoginForm.css'; // Reuses login form styles

export const ForgotPasswordForm: React.FC = () => {
  const { resetPassword, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }

    if (!isValidEmail(email)) {
      setLocalError('Please enter a valid email address');
      return;
    }

    try {
      await resetPassword(email.trim().toLowerCase());
      setSuccess(true);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send reset email');
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="form-header">
          <Link to="/" className="form-brand" aria-label="Back to home">
            <div className="form-brand-icon">A</div>
          </Link>
          <h1 className="form-title">Reset Password</h1>
          <p className="form-subtitle">
            Enter your email and we'll send you a link to reset your password
          </p>
        </div>

        {localError && (
          <div className="error-banner" role="alert">
            {localError}
          </div>
        )}

        {success ? (
          <div className="success-banner" role="status">
            <p>If an account exists with that email, you'll receive a password reset link shortly.</p>
            <p style={{ marginTop: '1rem' }}>
              <Link to="/login" className="link">Back to Sign In</Link>
            </p>
          </div>
        ) : (
          <>
            {/* Email Input */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLocalError(null);
                }}
                placeholder="email@example.com"
                autoComplete="email"
                required
                disabled={loading}
                aria-invalid={localError ? 'true' : 'false'}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </>
        )}

        {/* Back to Login Link */}
        <div className="signup-link">
          Remember your password?{' '}
          <Link to="/login" className="link">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
};
