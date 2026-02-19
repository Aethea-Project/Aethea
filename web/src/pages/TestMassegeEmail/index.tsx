import React, { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TURNSTILE_CONFIG } from '@core/auth/constants';
import { testMassegeEmailApi } from '../../services/auth';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const TestMassegeEmailPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderTurnstileWidget = useCallback((): boolean => {
    if (!window.turnstile || !turnstileRef.current || widgetIdRef.current) {
      return false;
    }

    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_CONFIG.SITE_KEY,
      callback: (token: string) => {
        setCaptchaToken(token);
        setError(null);
      },
      'expired-callback': () => {
        setCaptchaToken(null);
        setError('CAPTCHA expired. Please verify again.');
      },
      'error-callback': () => {
        setCaptchaToken(null);
        setError('CAPTCHA failed to load. Refresh and try again.');
      },
      theme: 'light',
      size: 'normal',
    });

    return true;
  }, []);

  useEffect(() => {
    let retryTimer: ReturnType<typeof setInterval> | undefined;

    const ensureRendered = () => {
      if (renderTurnstileWidget()) {
        if (retryTimer) {
          clearInterval(retryTimer);
          retryTimer = undefined;
        }
        return;
      }

      let attempts = 0;
      retryTimer = setInterval(() => {
        attempts += 1;
        if (renderTurnstileWidget() || attempts >= 30) {
          if (retryTimer) {
            clearInterval(retryTimer);
            retryTimer = undefined;
          }
        }
      }, 100);
    };

    const existingScript = document.getElementById('cf-turnstile-script') as HTMLScriptElement | null;
    if (existingScript) {
      if (window.turnstile) {
        ensureRendered();
      } else {
        existingScript.onload = ensureRendered;
      }
      return () => {
        if (retryTimer) {
          clearInterval(retryTimer);
        }
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }

    const script = document.createElement('script');
    script.id = 'cf-turnstile-script';
    script.src = `${TURNSTILE_CONFIG.SCRIPT_URL}?render=explicit`;
    script.async = true;
    script.defer = true;
    script.onload = ensureRendered;
    script.onerror = () => {
      setError('Security verification failed to load.');
    };
    document.head.appendChild(script);

    return () => {
      if (retryTimer) {
        clearInterval(retryTimer);
      }
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderTurnstileWidget]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification');
      return;
    }

    setSending(true);
    try {
      const response = await testMassegeEmailApi(email.trim().toLowerCase(), captchaToken);
      if (response.error) {
        setError(response.error.message || 'Failed to send test email');
      } else {
        setMessage('Test email request sent. Check inbox and spam folder.');
      }
    } catch {
      setError('Failed to send test email');
    } finally {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      setCaptchaToken(null);
      setSending(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'grid',
          gap: '0.75rem',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>test massege email</h1>
        <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
          API: testMassegeEmailApi
        </p>

        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
            setMessage(null);
          }}
          placeholder="email@example.com"
          style={{
            height: '44px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            padding: '0 0.75rem',
            fontSize: '1rem',
          }}
        />

        <button
          type="submit"
          disabled={sending}
          style={{
            height: '44px',
            borderRadius: '8px',
            border: 'none',
            background: '#0d9488',
            color: '#fff',
            fontWeight: 600,
            cursor: sending ? 'not-allowed' : 'pointer',
            opacity: sending ? 0.7 : 1,
          }}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>

        <div style={{ minHeight: '65px', display: 'flex', justifyContent: 'center' }}>
          <div ref={turnstileRef} />
        </div>

        {message && <div style={{ color: '#166534', fontSize: '0.9rem' }}>{message}</div>}
        {error && <div style={{ color: '#b91c1c', fontSize: '0.9rem' }}>{error}</div>}

        <Link to="/" style={{ color: '#0f766e', fontSize: '0.9rem', textAlign: 'center' }}>
          Back to home
        </Link>
      </form>
    </div>
  );
};

export default TestMassegeEmailPage;
