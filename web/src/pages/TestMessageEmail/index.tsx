import React, { FormEvent, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { testMessageEmailApi } from '../../services/auth';
import { useTurnstile } from '../../hooks/useTurnstile';

const TestMessageEmailPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCaptchaError = useCallback((msg: string) => setError(msg), []);
  const handleCaptchaSuccess = useCallback(() => setError(null), []);

  const { captchaToken, turnstileRef, resetCaptcha } = useTurnstile({
    onError: handleCaptchaError,
    onSuccess: handleCaptchaSuccess,
  });

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
      const response = await testMessageEmailApi(email.trim().toLowerCase(), captchaToken);
      if (response.error) {
        setError(response.error.message || 'Failed to send test email');
      } else {
        setMessage('Test email request sent. Check inbox and spam folder.');
      }
    } catch {
      setError('Failed to send test email');
    } finally {
      resetCaptcha();
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
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>test message email</h1>
        <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
          API: testMessageEmailApi
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

export default TestMessageEmailPage;
