/**
 * Login Form Component - React Web
 * Follows web.dev best practices for accessibility and UX
 */

import React, { useState, FormEvent } from 'react';
import { useAuth } from '@shared/auth/useAuth';
import './LoginForm.css';

export const LoginForm: React.FC = () => {
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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

    try {
      await signIn(email, password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const displayError = localError || error?.message;

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="form-header">
          <h1 className="form-title">Sign In</h1>
          <p className="form-subtitle">Welcome back to Medical Platform</p>
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
              {showPassword ? 'Hide' : 'Show'}
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
          <a href="/forgot-password" className="forgot-password-link">
            Forgot password?
          </a>
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
          <a href="/register" className="link">
            Sign up
          </a>
        </div>
      </form>
    </div>
  );
};
