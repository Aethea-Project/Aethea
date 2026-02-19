import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/auth';

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
  const [message, setMessage] = useState('Confirming your account...');

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
          await new Promise((resolve) => setTimeout(resolve, 700));
        }

        const sessionResponse = await authService.getSession();
        if (!active) return;

        if (hasCode || sessionResponse.data) {
          setState('success');
          setMessage('Your account has been confirmed successfully. You can sign in now.');
          return;
        }

        setState('error');
        setMessage('Invalid or expired confirmation link. Please request a new confirmation email.');
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

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'grid',
          gap: '0.75rem',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Account confirmation</h1>
        <div
          style={{
            color: state === 'error' ? '#b91c1c' : state === 'success' ? '#166534' : '#334155',
            fontSize: '0.95rem',
          }}
        >
          {message}
        </div>

        {state !== 'loading' && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/login" style={{ color: '#0f766e', fontWeight: 600 }}>
              Go to Sign in
            </Link>
            <Link to="/register" style={{ color: '#0f766e', fontWeight: 600 }}>
              Create new account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthConfirmPage;
