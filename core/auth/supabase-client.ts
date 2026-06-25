/**
 * Supabase client - singleton pattern.
 * Single instance shared across the web app modules.
 *
 * Implements a custom storage adapter so the "Remember Me" toggle
 * actually works: session-only users get sessionStorage (cleared when
 * the browser closes), while "remember me" users get localStorage.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './auth-types';
import { STORAGE_KEYS } from './constants';

// ── Custom Storage Adapter ─────────────────────────────────────────
// Supabase calls getItem/setItem/removeItem for its auth tokens.
// We route those calls to the correct browser storage based on the
// session preference the user chose at login time.

const SESSION_ONLY_VALUE = 'session-only';

/** Determine the backing store for the current session. */
const getBackingStore = (): Storage => {
  if (typeof window === 'undefined') {
    // SSR / non-browser fallback – return a noop store
    return {
      length: 0,
      clear() {},
      getItem() { return null; },
      key() { return null; },
      removeItem() {},
      setItem() {},
    };
  }

  const pref = window.localStorage.getItem(STORAGE_KEYS.USER_SESSION);
  return pref === SESSION_ONLY_VALUE ? window.sessionStorage : window.localStorage;
};

const customStorageAdapter = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    // Always check both stores – tokens may have been written before
    // the preference was set (e.g. OAuth redirect).
    return getBackingStore().getItem(key) ??
      window.sessionStorage.getItem(key) ??
      window.localStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    const store = getBackingStore();
    store.setItem(key, value);

    // Keep the other store clean to prevent stale tokens
    const otherStore = store === window.localStorage
      ? window.sessionStorage
      : window.localStorage;
    otherStore.removeItem(key);
  },
  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

// Singleton instance
let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Get or create Supabase client instance (Singleton)
 */
export const getSupabaseClient = (
  supabaseUrl: string,
  supabaseAnonKey: string
): SupabaseClient<Database> => {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Create new instance with optimized configuration
  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Auto-refresh tokens before expiry
      autoRefreshToken: true,
      // Persist session across page reloads
      persistSession: true,
      // Detect session from URL (for magic links, OAuth)
      detectSessionInUrl: true,
      // Storage key for session
      storageKey: 'medical-platform-auth',
      // Flow type for authentication
      flowType: 'pkce', // More secure than implicit flow
      // Custom storage adapter — routes to sessionStorage or localStorage
      storage: customStorageAdapter,
    },
    global: {
      headers: {
        'x-app-name': 'medical-platform',
      },
    },
    // Connection pooling for better performance
    db: {
      schema: 'public',
    },
    // Realtime disabled by default (enable if needed)
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseInstance;
};

/**
 * Reset the singleton instance (useful for testing or logout)
 */
export const resetSupabaseClient = () => {
  supabaseInstance = null;
};

/**
 * Initialize Supabase with environment variables
 */
export const initializeSupabase = (config: {
  url: string;
  anonKey: string;
}): SupabaseClient<Database> => {
  return getSupabaseClient(config.url, config.anonKey);
};
