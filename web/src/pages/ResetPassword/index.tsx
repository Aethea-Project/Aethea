import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { doPasswordsMatch, validatePassword } from '@core/auth/auth-utils';
import { useAuth } from '@core/auth/useAuth';
import { authService } from '../../services/auth';
import { completePasswordChange } from '../../services/authApi';

interface PasswordRequirement {
  id: 'length' | 'uppercase' | 'lowercase' | 'number' | 'special';
  label: string;
  met: boolean;
}

const getHashParams = (hashValue: string): URLSearchParams => {
  const normalized = hashValue.startsWith('#') ? hashValue.slice(1) : hashValue;
  return new URLSearchParams(normalized);
};

const normalizeRecoveryError = (message: string | null | undefined): string | null => {
  if (!message) return null;

  if (/pkce code verifier not found/i.test(message)) {
    return 'This reset link is tied to a different browser session. Please request a new reset link and open it on the same device/browser.';
  }

  return message;
};

const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, session } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessionPreparing, setSessionPreparing] = useState(false);
  const [sessionReady, setSessionReady] = useState(Boolean(session));
  const [sessionError, setSessionError] = useState<string | null>(null);

  const recoveryContext = useMemo(() => {
    const queryParams = new URLSearchParams(location.search);
    const hashParams = getHashParams(location.hash);
    const flowType = queryParams.get('type') ?? hashParams.get('type');
    const accessToken = hashParams.get('access_token') ?? queryParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') ?? queryParams.get('refresh_token');
    const code = queryParams.get('code');
    const rawErrorDescription =
      queryParams.get('error_description') ??
      hashParams.get('error_description') ??
      queryParams.get('error') ??
      hashParams.get('error');

    const errorDescription = rawErrorDescription ? decodeURIComponent(rawErrorDescription) : null;

    return {
      hasRecoveryFlow:
        flowType === 'recovery' ||
        Boolean(accessToken && refreshToken) ||
        Boolean(code),
      accessToken,
      refreshToken,
      code,
      errorDescription,
    };
  }, [location.hash, location.search]);

  useEffect(() => {
    if (session) {
      setSessionReady(true);
      setSessionError(null);
    }
  }, [session]);

  useEffect(() => {
    let active = true;

    const bootstrapSession = async () => {
      if (!recoveryContext.hasRecoveryFlow || sessionReady) {
        return;
      }

      setSessionPreparing(true);
      setSessionError(null);

      const supabaseAuth = authService.getSupabaseClient().auth;
      let bootstrapError: string | null = null;

      try {
        if (recoveryContext.errorDescription) {
          bootstrapError = normalizeRecoveryError(recoveryContext.errorDescription);
        }

        if (recoveryContext.accessToken && recoveryContext.refreshToken) {
          const { error: setSessionErrorResponse } = await supabaseAuth.setSession({
            access_token: recoveryContext.accessToken,
            refresh_token: recoveryContext.refreshToken,
          });
          if (setSessionErrorResponse) {
            bootstrapError = normalizeRecoveryError(setSessionErrorResponse.message);
          }
        } else if (recoveryContext.code) {
          const { error: exchangeError } = await supabaseAuth.exchangeCodeForSession(recoveryContext.code);
          if (exchangeError) {
            bootstrapError = normalizeRecoveryError(exchangeError.message);
          }
        }

        const { data: latestSessionResult, error: latestSessionError } = await supabaseAuth.getSession();

        if (!active) {
          return;
        }

        if (latestSessionError) {
          bootstrapError = normalizeRecoveryError(latestSessionError.message);
        }

        if (latestSessionResult.session) {
          setSessionReady(true);
          setSessionError(null);

          if (location.search || location.hash) {
            navigate('/reset-password', { replace: true });
          }
        } else {
          setSessionReady(false);
          setSessionError(
            bootstrapError ??
            'Auth session missing. Please open the password reset link again from your email.',
          );
        }
      } catch {
        if (!active) {
          return;
        }

        setSessionReady(false);
        setSessionError('Unable to initialize reset session. Please request a new reset link.');
      } finally {
        if (active) {
          setSessionPreparing(false);
        }
      }
    };

    void bootstrapSession();

    return () => {
      active = false;
    };
  }, [
    recoveryContext.accessToken,
    recoveryContext.code,
    recoveryContext.errorDescription,
    recoveryContext.hasRecoveryFlow,
    recoveryContext.refreshToken,
    location.hash,
    location.search,
    navigate,
    sessionReady,
  ]);

  const passwordRequirements = useMemo<PasswordRequirement[]>(() => {
    return [
      { id: 'length', label: 'At least 8 characters', met: newPassword.length >= 8 },
      { id: 'uppercase', label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
      { id: 'lowercase', label: 'One lowercase letter', met: /[a-z]/.test(newPassword) },
      { id: 'number', label: 'One number', met: /\d/.test(newPassword) },
      { id: 'special', label: 'One special character', met: /[^a-zA-Z0-9]/.test(newPassword) },
    ];
  }, [newPassword]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSuccess(null);

    if (!sessionReady) {
      setError('Auth session missing. Please open the reset link again from your email.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (!doPasswordsMatch(newPassword, confirmPassword)) {
      setError('Passwords do not match.');
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error ?? 'Password does not meet the required policy.');
      return;
    }

    setSubmitting(true);
    try {
      const updateResponse = await authService.updatePassword({
        newPassword,
      });

      if (updateResponse.error) {
        setError(updateResponse.error.message || 'Failed to update password.');
        return;
      }

      const completionFailedMessage = 'Password was changed, but final account sync failed. Please sign in and change password again from Profile if needed.';
      try {
        await completePasswordChange({ recoveryFlow: true });
      } catch {
        setError(completionFailedMessage);
        return;
      }

      const signOutResponse = await authService.signOut();
      if (signOutResponse.error) {
        setError(signOutResponse.error.message || 'Password updated, but we could not complete sign-out. Please sign in again manually.');
        return;
      }

      setSuccess('Password updated successfully. Redirecting to sign in...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 900);
    } catch {
      setError('Unable to complete password reset. Please request a new reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mx-auto w-full max-w-md bg-surface-card border border-sand-200 rounded-lg p-4 space-y-4">
          <h1 className="text-2xl font-semibold text-sand-900">Set New Password</h1>

          {!loading && !sessionPreparing && !sessionReady && !recoveryContext.hasRecoveryFlow && (
            <div className="rounded-lg border border-sand-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              This reset link is invalid or expired. Please request a new one.
            </div>
          )}

          {sessionPreparing && (
            <div className="rounded-lg border border-sand-200 bg-surface p-3 text-sm text-sand-600" role="status">
              Preparing secure reset session...
            </div>
          )}

          {sessionError && (
            <div className="rounded-lg border border-sand-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {sessionError}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-sand-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-sand-200 bg-green-50 p-3 text-sm text-green-700" role="status">
              {success}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <label htmlFor="new-password" className="text-sm font-medium text-sand-700">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={submitting || loading || sessionPreparing || !sessionReady}
              required
              className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm text-sand-900 placeholder:text-sand-400 focus:border-sand-300 focus:outline-none"
            />
            <ul className="space-y-1" aria-label="Password requirements">
              {passwordRequirements.map((requirement) => (
                <li
                  key={requirement.id}
                  className={`flex items-center gap-2 text-xs font-semibold ${requirement.met ? 'text-green-700' : 'text-red-700'}`}
                >
                  <span className="w-4 text-center" aria-hidden="true">
                    {requirement.met ? '✓' : '✗'}
                  </span>
                  {requirement.label}
                </li>
              ))}
            </ul>

            <label htmlFor="confirm-password" className="text-sm font-medium text-sand-700">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={submitting || loading || sessionPreparing || !sessionReady}
              required
              className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm text-sand-900 placeholder:text-sand-400 focus:border-sand-300 focus:outline-none"
            />

            <button
              type="submit"
              className="bg-nescafe text-white text-sm px-4 py-2 rounded-lg hover:bg-nescafe-hover transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting || loading || sessionPreparing || !sessionReady}
            >
              {submitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link to="/forgot-password" className="text-sand-600 hover:text-sand-900 transition-colors">
              Request another reset link
            </Link>
            <Link to="/login" className="text-sand-600 hover:text-sand-900 transition-colors">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
