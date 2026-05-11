/**
 * API Client — Infrastructure Layer
 *
 * Responsibilities:
 *   - Resolve the correct API base URL
 *   - Inject the Supabase Bearer token on every request
 *   - Enforce per-request timeout (prevents hung connections)
 *   - Throw on non-2xx responses with a consistent error message
 *
 * This is the only file that should call `fetch` or know about HTTP.
 * Domain repositories (medicalApi.ts) import this and stay HTTP-agnostic.
 *
 * Architecture (from transcript — Modular Monolith, Platform Layer):
 *   Pages (framework) → Hooks (use-case) → medicalApi (repository) → apiClient (infrastructure)
 */

import { authService } from '../services/auth';
import { STORAGE_KEYS } from '@core/auth/constants';

/** Maximum time (ms) to wait for any backend request before aborting. */
const REQUEST_TIMEOUT_MS = 15_000;

// ── Base URL resolution ──────────────────────────────────────────────────────
function resolveApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === 'aethea.me' ||
      hostname.endsWith('.aethea.me')
    ) {
      return '/api';
    }
  }

  return configured ? `${configured}/api` : 'http://localhost:3001/api';
}

export const API_BASE = resolveApiBaseUrl();

function emitApiError(title: string, message: string, details?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('aethea-api-error', {
      detail: { title, message, details },
    }),
  );
}

// ── Authenticated fetch ──────────────────────────────────────────────────────

async function prepareAuthHeaders(init?: RequestInit) {
  const sessionResponse = await authService.getSession();
  const token = sessionResponse.data?.access_token;
  const rememberSession = typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEYS.USER_SESSION) === 'remember-30d';

  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = {
    'x-remember-me': rememberSession ? 'true' : 'false',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

async function handleFetchError(res: Response, path: string) {
  const text = await res.text();
  let message = text || `Request failed (${res.status})`;
  let detailsString = `Endpoint: ${path} | HTTP ${res.status}`;
  
  try {
    const json = JSON.parse(text) as {
      error?: unknown;
      details?: unknown;
    };

    if (typeof json.error === 'string' && json.error.trim() !== '') {
      message = json.error;
    }

    if (Array.isArray(json.details)) {
      const detailLines = json.details
        .map((detail) => {
          if (!detail || typeof detail !== 'object') return null;

          const field =
            'field' in detail && typeof (detail as { field?: unknown }).field === 'string'
              ? (detail as { field: string }).field
              : null;

          const detailMessage =
            'message' in detail && typeof (detail as { message?: unknown }).message === 'string'
              ? (detail as { message: string }).message
              : null;

          if (!field || !detailMessage) return null;
          return `- ${field}: ${detailMessage}`;
        })
        .filter((line): line is string => line !== null);

      if (detailLines.length > 0) {
        detailsString += `\n${detailLines.join('\n')}`;
      }
    }
  } catch {
    // Response body is not JSON - use raw text as-is
  }

  // Only treat 503 (Service Unavailable) as a full maintenance event.
  // 500/502 are transient server errors — show a toast, not a redirect.
  if (res.status === 503) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('maintenance-mode'));
    }
    throw new Error(message);
  }

  if (res.status === 401) {
    // Global unauthorized handler - trigger user sign out
    if (typeof window !== 'undefined') {
      authService.signOut().catch(() => {});
    }
    throw new Error('Unauthorized - No valid session found');
  }

  if (res.status >= 500) {
    // Mask 5xx errors to avoid leaking technical details to the user
    const maskedMessage = "An unexpected issue occurred. Our team has been notified.";
    emitApiError(
      `Server Error (${res.status})`,
      maskedMessage,
      detailsString, // We can still log the endpoint, but the main UI gets the masked message
    );
    throw new Error(maskedMessage);
  }

  throw new Error(message);
}

/**
 * Make an authenticated HTTP request to the Aethea backend.
 * - Injects Supabase JWT as `Authorization: Bearer <token>`.
 * - Throws a descriptive `Error` on non-2xx status.
 */
export async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = await prepareAuthHeaders(init);

    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        ...headers,
        ...(init?.headers as Record<string, string> ?? {}),
      },
    });

    if (!res.ok) {
      await handleFetchError(res, path);
    }

    if (res.status === 204) {
      return undefined as unknown as T;
    }

    const responseText = await res.text();
    if (!responseText) {
      return undefined as unknown as T;
    }

    return JSON.parse(responseText) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      emitApiError('Network Timeout', 'The request took too long and was cancelled.', `Endpoint: ${path}`);
      throw new Error(`Request to ${path} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Make an authenticated HTTP request that returns a raw Response object.
 * Useful for streaming data or handling non-JSON responses.
 * Does NOT enforce a short timeout.
 */
export async function authFetchStream(path: string, init?: RequestInit): Promise<Response> {
  // Use a much longer timeout for streaming (30 minutes)
  const STREAM_TIMEOUT_MS = 30 * 60 * 1000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  try {
    const headers = await prepareAuthHeaders(init);

    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        ...headers,
        ...(init?.headers as Record<string, string> ?? {}),
      },
    });

    if (!res.ok) {
      await handleFetchError(res, path);
    }

    // Note: We don't clear timeout here because we want it to cover the entire stream
    // but the caller might want to handle it. For now, 30m is plenty.
    return res;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === 'AbortError') {
      emitApiError('Network Timeout', 'The streaming request took too long and was cancelled.', `Endpoint: ${path}`);
      throw new Error(`Streaming request to ${path} timed out`);
    }
    throw err;
  }
}

