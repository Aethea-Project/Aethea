/**
 * Token Manager - Performance Optimization
 * Handles token caching and refresh logic
 */

import { Session } from '@supabase/supabase-js';
import { TOKEN_CONFIG } from './constants';

// In-memory token cache
class TokenCache {
  private cache: Map<string, { token: string; expiresAt: number }> = new Map();

  set(key: string, token: string, expiresIn: number): void {
    const expiresAt = Date.now() + expiresIn * 1000;
    this.cache.set(key, { token, expiresAt });
  }

  get(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() >= cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.token;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key) && this.get(key) !== null;
  }
}

// Singleton instance
export const tokenCache = new TokenCache();

/**
 * Check if token needs refresh
 */
export const shouldRefreshToken = (session: Session | null): boolean => {
  if (!session) return false;

  const expiresAt = session.expires_at;
  if (!expiresAt) return false;

  // Refresh if token expires in less than threshold
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = expiresAt - now;

  return timeUntilExpiry <= TOKEN_CONFIG.REFRESH_THRESHOLD_SECONDS;
};

/**
 * Get access token from session with caching
 */
export const getAccessToken = (session: Session | null): string | null => {
  if (!session) return null;

  // Check cache first
  const cached = tokenCache.get('access_token');
  if (cached) return cached;

  // Cache the token
  const expiresIn = session.expires_in || 3600;
  tokenCache.set('access_token', session.access_token, expiresIn);

  return session.access_token;
};

/**
 * Clear token cache (on logout)
 */
export const clearTokenCache = (): void => {
  tokenCache.clear();
};

/**
 * Decode JWT without verification (client-side only)
 */
export const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};

/**
 * Get token expiry time
 */
export const getTokenExpiry = (token: string): number | null => {
  const decoded = decodeJWT(token);
  return decoded?.exp ? decoded.exp * 1000 : null;
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return Date.now() >= expiry;
};
