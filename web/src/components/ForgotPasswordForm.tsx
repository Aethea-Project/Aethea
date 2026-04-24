/**
 * Forgot Password Form Component
 * Allows users to request a password reset email
 */

import React, { useState, useCallback, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { isValidEmail } from '@core/auth/auth-utils';
import { useTurnstile } from '../hooks/useTurnstile';

export const ForgotPasswordForm: React.FC = () => {
  const { resetPassword, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCaptchaError = useCallback((msg: string) => setLocalError(msg), []);
  const handleCaptchaSuccess = useCallback(() => setLocalError(null), []);

  const { captchaToken, turnstileRef, resetCaptcha } = useTurnstile({
    onError: handleCaptchaError,
    onSuccess: handleCaptchaSuccess,
  });

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

    if (!captchaToken) {
      setLocalError('Please complete the CAPTCHA verification');
      return;
    }

    try {
      await resetPassword(email.trim().toLowerCase(), captchaToken);
      setSuccess(true);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      resetCaptcha();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <form
          className="mx-auto w-full max-w-md bg-white border border-gray-200 rounded-lg p-4 space-y-4"
          onSubmit={handleSubmit}
          noValidate
        >
        {/* ── Header ────────────────── */}
        <div className="flex flex-col items-center gap-2 text-center">
          <Link to="/" className="no-underline" aria-label="Back to home">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white">A</div>
          </Link>
          <h1 className="m-0 text-xl font-semibold text-gray-900">Reset Password</h1>
          <p className="m-0 text-sm text-gray-500">
            Enter your email and we'll send you a link to reset your password
          </p>
        </div>

        {localError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {localError}
          </div>
        )}

        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700" role="status">
            <p className="m-0">If an account exists with that email, you'll receive a password reset link shortly.</p>
            <p className="m-0 mt-4">
              <Link to="/login" className="font-medium text-teal-700 hover:text-teal-800 underline">Back to Sign In</Link>
            </p>
          </div>
        ) : (
          <>
            {/* Email Input */}
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-100"
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
              className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="min-h-[65px] flex justify-center mt-3">
              <div ref={turnstileRef} />
            </div>
          </>
        )}

        {/* Back to Login Link */}
        <div className="text-center text-sm text-gray-600">
          Remember your password?{' '}
          <Link to="/login" className="font-medium text-teal-700 hover:text-teal-800 underline">
            Sign in
          </Link>
        </div>
      </form>
      </div>
    </div>
  );
};
