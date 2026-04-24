/**
 * Login Form Component - React Web
 * Follows web.dev best practices for accessibility and UX
 */

import React, { useState, useCallback, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { isValidEmail } from '@core/auth/auth-utils';
import { useTurnstile } from '../hooks/useTurnstile';
import { useUiNotifications } from '../contexts/UiNotificationsProvider';
import { cn } from '../lib/cn';

export const LoginForm: React.FC = () => {
  const { signIn, signInWithGoogle, loading, error, user, session } = useAuth();
  const { notifySuccess, notifyError } = useUiNotifications();
  const signUpPath = user && session ? '/dashboard' : '/register';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleCaptchaError = useCallback((msg: string) => setLocalError(msg), []);
  const handleCaptchaSuccess = useCallback(() => setLocalError(null), []);

  const { captchaToken, turnstileRef, resetCaptcha } = useTurnstile({
    onError: handleCaptchaError,
    onSuccess: handleCaptchaSuccess,
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic validation
    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }

    if (!password) {
      setLocalError('Password is required');
      return;
    }

    // Email format validation
    if (!isValidEmail(email)) {
      setLocalError('Please enter a valid email address');
      return;
    }

    setLocalError(null);

    if (!captchaToken) {
      setLocalError('Please complete the CAPTCHA verification');
      return;
    }

    try {
      await signIn(email, password, captchaToken, rememberMe);
      notifySuccess('Login successful', 'Welcome back to Aethea.');
      resetCaptcha();
    } catch (err) {
      notifyError(
        'Login failed',
        'Unable to sign in with the provided credentials.',
        err instanceof Error ? err.message : 'Unknown error',
      );
      setLocalError(err instanceof Error ? err.message : 'Login failed');
      resetCaptcha();
    }
  };

  const displayError = localError || error?.message;

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    await signInWithGoogle();
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50 font-sans">
      <form className="w-full max-w-md bg-white p-10 rounded-lg border border-gray-200" onSubmit={handleSubmit} noValidate>
        <div className="text-center mb-8">
          <Link to="/" className="flex justify-center mb-4" aria-label="Back to home">
            <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white font-serif text-xl font-bold">A</div>
          </Link>
          <h1 className="font-serif text-2xl font-semibold text-gray-900 mb-1 tracking-tight">Welcome Back</h1>
          <p className="text-sm text-gray-600">Sign in to your Aethea account</p>
        </div>

        {displayError && (
          <div className="flex items-start gap-2 bg-red-50 border-l-4 border-red-600 rounded-lg py-3 px-4 mb-5 text-red-700 text-sm leading-relaxed" role="alert">
            {displayError}
          </div>
        )}

        {/* Email Input */}
        <div className="mb-5">
          <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={cn(
              "w-full h-12 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg transition-colors focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed",
              (displayError || localError) && "border-red-600 focus:border-red-600 focus:ring-red-100"
            )}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setLocalError(null);
            }}
            placeholder="email@example.com"
            autoComplete="username"
            required
            disabled={loading}
            aria-invalid={displayError ? 'true' : 'false'}
            aria-describedby={displayError ? 'error-message' : undefined}
          />
        </div>

        {/* Password Input */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="password" className="block text-sm font-semibold text-gray-900">
              Password
            </label>
            <button
              type="button"
              className="text-teal-600 bg-transparent text-xs font-semibold px-2 py-1 rounded-md transition-colors hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center min-h-[2rem] min-w-[2rem]"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              aria-label={
                showPassword
                  ? 'Hide password'
                  : 'Show password as plain text. Warning: this will display your password on the screen.'
              }
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            className={cn(
              "w-full h-12 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg transition-colors focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed",
              (displayError || localError) && "border-red-600 focus:border-red-600 focus:ring-red-100"
            )}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setLocalError(null);
            }}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            disabled={loading}
            aria-invalid={displayError ? 'true' : 'false'}
            aria-describedby="password-constraints"
          />
        </div>

        {/* Forgot Password Link */}
        <div className="text-right mb-6">
          <Link to="/forgot-password" className="text-teal-600 text-sm font-medium hover:text-teal-700 hover:underline underline-offset-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 rounded">
            Forgot password?
          </Link>
        </div>

        {/* Remember Me Checkbox */}
        <div className="mb-5">
          <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer" htmlFor="rememberMe">
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              className="w-4 h-4 accent-teal-600"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
            />
            Keep me signed in for 30 days
          </label>
        </div>

        {/* Cloudflare Turnstile CAPTCHA */}
        <div className="mb-5 flex flex-col items-center gap-2">
          <div ref={turnstileRef} className="min-h-[65px] w-full flex justify-center" />
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          className="w-full h-12 bg-teal-600 text-white text-sm px-4 py-2 rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div className="flex items-center gap-3 my-4 text-gray-500 text-sm before:content-[''] before:h-px before:flex-1 before:bg-gray-200 after:content-[''] after:h-px after:flex-1 after:bg-gray-200" role="separator" aria-label="Alternative sign in methods">
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

        {/* Sign Up Link */}
        <div className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to={signUpPath} className="text-teal-600 font-semibold hover:text-teal-700 hover:underline underline-offset-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 rounded">
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
};
