import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useAuth } from '@core/auth/useAuth';
import { cn } from '../../lib/utils';

type ConfirmState = 'loading' | 'success' | 'error';

const decodeParam = (value: string | null): string | null => {
  if (!value) return null;
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
};

const AuthConfirmPage: React.FC = () => {
  const [state, setState] = useState<ConfirmState>('loading');
  const [message, setMessage] = useState('Processing request and confirming account...');
  const { profile, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // 1. Initial auth confirmation & token exchange
  useEffect(() => {
    let active = true;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const errorDescription = decodeParam(params.get('error_description'));    
      const errorCode = decodeParam(params.get('error'));
      const hasCode = params.has('code');

      if (errorDescription || errorCode) {
        if (!active) return;
        setState('error');
        setMessage(errorDescription || errorCode || 'Account confirmation failed.');
        return;
      }

      try {
        if (hasCode) {
          // Wait briefly for Supabase to exchange PKCE code
          await new Promise((resolve) => setTimeout(resolve, 700));
        }

        const sessionResponse = await authService.getSession();
        if (!active) return;

        if (hasCode || sessionResponse.data) {
          setState('success');
          setMessage('Account confirmed successfully. Loading...');
          return;
        }

        setState('error');
        setMessage('Invalid or expired confirmation link. Please request a new link.');
      } catch {
        if (!active) return;
        setState('error');
        setMessage('Could not verify confirmation link. Please try again.');
      }
    };

    run();
    return () => {
      active = false;
    };
  }, []);

  // 2. Redirect logic handling based on profile state (Wait for auth to finish loading)
  useEffect(() => {
    if (state === 'success' && !authLoading && session) {
      const isComplete = profile?.phone && profile?.dateOfBirth && profile?.gender;

      if (isComplete) {
        setMessage('Signed in successfully! Redirecting to dashboard...');
        const timer = setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        setMessage('Signed in successfully! Redirecting to complete your basic details...');
        const timer = setTimeout(() => {
          navigate('/complete-profile', { replace: true });
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [state, authLoading, session, profile, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 px-4 py-6">
      <div className="w-full max-w-[480px] rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm grid gap-4">
        <h1 className="m-0 text-2xl font-semibold text-slate-900">Account Confirmation</h1>

        <div
          className={cn(
            'text-base leading-relaxed',
            state === 'error' && 'text-red-600',
            state === 'success' && 'text-emerald-600',
            state === 'loading' && 'text-slate-600',
          )}
        >
          {message}
        </div>

        {state === 'error' && (
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              to="/login"
              className="no-underline inline-flex items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Go to Sign in
            </Link>
            <Link
              to="/register"
              className="no-underline inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Create new account
            </Link>
          </div>
        )}

        {state === 'success' && (
          <div className="pt-2">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthConfirmPage;
