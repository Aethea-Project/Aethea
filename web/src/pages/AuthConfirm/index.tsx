import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useAuth } from '@core/auth/useAuth';

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
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-default)' }}>
      <div
        className=""
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px',
          display: 'grid',
          gap: '16px',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Account Confirmation</h1>
        
        <div
          style={{
            color: state === 'error' ? 'var(--error)' : state === 'success' ? 'var(--success)' : 'var(--text-secondary)',
            fontSize: '1rem',
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>

        {state === 'error' && (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
            <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Go to Sign in
            </Link>
            <Link to="/register" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              Create new account
            </Link>
          </div>
        )}
        
        {state === 'success' && (
          <div style={{ marginTop: '16px' }}>
            <span className="btn-spinner" style={{ width: '20px', height: '20px', display: 'inline-block', borderColor: 'var(--primary) transparent transparent transparent' }} aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthConfirmPage;
