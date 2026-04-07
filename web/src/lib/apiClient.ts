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

/**
 * Make an authenticated HTTP request to the Aethea backend.
 * - Injects Supabase JWT as `Authorization: Bearer <token>`.
 * - Throws a descriptive `Error` on non-2xx status.
 */
export async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const sessionResponse = await authService.getSession();
  const token = sessionResponse.data?.access_token;
  const rememberSession = typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEYS.USER_SESSION) === 'remember-30d';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-remember-me': rememberSession ? 'true' : 'false',
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
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

      if (res.status >= 500) {
        emitApiError(
          `System Error (${res.status})`,
          message,
          detailsString,
        );
      }

      throw new Error(message);
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
