/**
 * Login Form Component - React Web
 * Follows web.dev best practices for accessibility and UX
 */

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { TURNSTILE_CONFIG } from '@core/auth/constants';
import './LoginForm.css';

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

export const LoginForm: React.FC = () => {
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Captcha state
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  /**
   * Load Turnstile script and render widget
   */
  useEffect(() => {
    if (document.getElementById('cf-turnstile-script')) {
      // Script already loaded, just render widget
      const renderWidget = () => {
        if (window.turnstile && turnstileRef.current && !widgetIdRef.current) {
          widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
            sitekey: TURNSTILE_CONFIG.SITE_KEY,
            callback: (token: string) => setCaptchaToken(token),
            'expired-callback': () => setCaptchaToken(null),
            'error-callback': () => setCaptchaToken(null),
            theme: 'light',
            size: 'normal',
          });
        }
      };
      setTimeout(renderWidget, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'cf-turnstile-script';
    script.src = `${TURNSTILE_CONFIG.SCRIPT_URL}?render=explicit`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.turnstile && turnstileRef.current) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_CONFIG.SITE_KEY,
          callback: (token: string) => setCaptchaToken(token),
          'expired-callback': () => setCaptchaToken(null),
          'error-callback': () => setCaptchaToken(null),
          theme: 'light',
          size: 'normal',
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError('Please enter a valid email address');
      return;
    }

    setLocalError(null);

    if (!captchaToken) {
      setLocalError('Please complete the CAPTCHA verification');
      return;
    }

    try {
      await signIn(email, password, captchaToken);
      // Reset captcha after attempt
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      setCaptchaToken(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Login failed');
      // Reset captcha on failure
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      setCaptchaToken(null);
    }
  };

  const displayError = localError || error?.message;

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

        {/* Sign Up Link */}
        <div className="signup-link">
          Don't have an account?{' '}
          <Link to="/register" className="link">
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
};
