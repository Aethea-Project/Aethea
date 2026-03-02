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

// ── Authenticated fetch ──────────────────────────────────────────────────────

/**
 * Make an authenticated HTTP request to the Aethea backend.
 * - Injects Supabase JWT as `Authorization: Bearer <token>`.
 * - Throws a descriptive `Error` on non-2xx status.
 */
export async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const sessionResponse = await authService.getSession();
  const token = sessionResponse.data?.access_token;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed (${res.status})`);
    }

    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Request to ${path} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
