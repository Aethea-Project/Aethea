/**
 * Shared Cloudflare Turnstile CAPTCHA hook
 *
 * Handles script injection (explicit render mode for SPA), retry polling,
 * stale-script fallback, cleanup on unmount, and token lifecycle.
 *
 * Based on the most robust implementation (RegisterForm) with
 * `fallbackScriptTimer` to recover if a previous page injected the
 * script tag but unloaded before `window.turnstile` was ready.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { TURNSTILE_CONFIG } from '@core/auth/constants';

/* ------------------------------------------------------------------ */
/*  Global type augmentation (declared once for the whole app)        */
/* ------------------------------------------------------------------ */
declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */
export interface UseTurnstileOptions {
  /** Called when the CAPTCHA encounters an error or expires. */
  onError?: (message: string) => void;
  /** Called when a fresh token is successfully obtained. */
  onSuccess?: () => void;
}

export interface UseTurnstileReturn {
  /** The current CAPTCHA token, or `null` if not yet verified / expired. */
  captchaToken: string | null;
  /** Attach this ref to the `<div>` where the widget should render. */
  turnstileRef: React.RefObject<HTMLDivElement | null>;
  /** Reset the widget and clear the token (call after form submission). */
  resetCaptcha: () => void;
}

/* ------------------------------------------------------------------ */
/*  Hook implementation                                               */
/* ------------------------------------------------------------------ */
export function useTurnstile(options: UseTurnstileOptions = {}): UseTurnstileReturn {
  const { onError, onSuccess } = options;

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Keep callbacks in refs so the effect doesn't re-run on every render.
  const onErrorRef = useRef(onError);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onErrorRef.current = onError;
    onSuccessRef.current = onSuccess;
  }, [onError, onSuccess]);

  /* ---------- render helper ---------- */
  const renderWidget = useCallback((): boolean => {
    if (!window.turnstile || !turnstileRef.current || widgetIdRef.current) {
      return false;
    }

    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_CONFIG.SITE_KEY,
      callback: (token: string) => {
        setCaptchaToken(token);
        onSuccessRef.current?.();
      },
      'expired-callback': () => {
        setCaptchaToken(null);
        onErrorRef.current?.('CAPTCHA expired. Please verify again.');
      },
      'error-callback': () => {
        setCaptchaToken(null);
        onErrorRef.current?.(
          'CAPTCHA failed to load. Refresh the page and try again.',
        );
      },
      theme: 'light',
      size: 'normal',
    });

    return true;
  }, []);

  /* ---------- script loading + retry + fallback ---------- */
  useEffect(() => {
    let retryTimer: ReturnType<typeof setInterval> | undefined;
    let fallbackScriptTimer: ReturnType<typeof setTimeout> | undefined;
    let boundScriptEl: HTMLScriptElement | null = null;

    const cleanupScriptListeners = () => {
      if (boundScriptEl) {
        boundScriptEl.onload = null;
        boundScriptEl.onerror = null;
      }
      boundScriptEl = null;
    };

    const ensureRendered = () => {
      if (renderWidget()) {
        if (retryTimer) {
          clearInterval(retryTimer);
          retryTimer = undefined;
        }
        return;
      }

      let attempts = 0;
      retryTimer = setInterval(() => {
        attempts += 1;
        if (renderWidget() || attempts >= 30) {
          if (retryTimer) {
            clearInterval(retryTimer);
            retryTimer = undefined;
          }
          if (attempts >= 30 && !widgetIdRef.current) {
            onErrorRef.current?.(
              'Security verification is unavailable. Please refresh and try again.',
            );
          }
        }
      }, 100);
    };

    const injectScript = () => {
      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src = `${TURNSTILE_CONFIG.SCRIPT_URL}?render=explicit`;
      script.async = true;
      script.defer = true;

      script.onload = ensureRendered;
      script.onerror = () => {
        onErrorRef.current?.(
          'Security verification failed to load. Please check your connection and retry.',
        );
      };

      boundScriptEl = script;
      document.head.appendChild(script);
    };

    const existingScript = document.getElementById(
      'cf-turnstile-script',
    ) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.turnstile) {
        // Script already loaded — render immediately.
        ensureRendered();
      } else {
        // Script tag exists but hasn't loaded yet; attach listeners and
        // set a fallback timer to recover from stale tags.
        boundScriptEl = existingScript;
        existingScript.onload = ensureRendered;
        existingScript.onerror = () => {
          onErrorRef.current?.(
            'Security verification failed to load. Please check your connection and retry.',
          );
        };

        fallbackScriptTimer = setTimeout(() => {
          if (!window.turnstile) {
            existingScript.remove();
            injectScript();
          }
        }, 2500);
      }
    } else {
      injectScript();
    }

    /* ---------- cleanup ---------- */
    return () => {
      if (fallbackScriptTimer) {
        clearTimeout(fallbackScriptTimer);
      }
      cleanupScriptListeners();
      if (retryTimer) {
        clearInterval(retryTimer);
      }
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  /* ---------- public reset helper ---------- */
  const resetCaptcha = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
    setCaptchaToken(null);
  }, []);

  return { captchaToken, turnstileRef, resetCaptcha };
}
