/**
 * Login Form Component - React Web
 * Follows web.dev best practices for accessibility and UX
 */

import React, { useState, useCallback, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { isValidEmail } from '@core/auth/auth-utils';
import { useTurnstile } from '../hooks/useTurnstile';
import './LoginForm.css';

export const LoginForm: React.FC = () => {
  const { signIn, signInWithGoogle, loading, error, user, session } = useAuth();
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
      resetCaptcha();
    } catch (err) {
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
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="form-header">
          <Link to="/" className="form-brand" aria-label="Back to home">
            <div className="form-brand-icon">A</div>
          </Link>
          <h1 className="form-title">Welcome Back</h1>
          <p className="form-subtitle">Sign in to your Aethea account</p>
        </div>

        {displayError && (
          <div className="error-banner" role="alert">
            {displayError}
          </div>
        )}

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
            autoComplete="username"
            required
            disabled={loading}
            aria-invalid={displayError ? 'true' : 'false'}
            aria-describedby={displayError ? 'error-message' : undefined}
          />
        </div>

        {/* Password Input */}
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              aria-label={
                showPassword
                  ? 'Hide password'
                  : 'Show password as plain text. Warning: this will display your password on the screen.'
              }
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            className="form-input"
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
        <div className="forgot-password">
          <Link to="/forgot-password" className="forgot-password-link">
            Forgot password?
          </Link>
        </div>

        {/* Remember Me Checkbox */}
        <div className="remember-me-row">
          <label className="remember-me-label" htmlFor="rememberMe">
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              className="remember-me-checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
            />
            Keep me signed in for 30 days
          </label>
        </div>

        {/* Cloudflare Turnstile CAPTCHA */}
        <div className="captcha-container">
          <div ref={turnstileRef} />
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          className="submit-button"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div className="auth-divider" role="separator" aria-label="Alternative sign in methods">
          <span>or</span>
        </div>

        <button
          type="button"
          className="oauth-button"
          onClick={() => void handleGoogleSignIn()}
          disabled={loading}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.6 12 2.6 6.9 2.6 2.8 6.7 2.8 11.8S6.9 21 12 21c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.8-.1-1.2H12z"/>
          </svg>
          Continue with Google
        </button>

        {/* Sign Up Link */}
        <div className="signup-link">
          Don't have an account?{' '}
          <Link to={signUpPath} className="link">
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
};
