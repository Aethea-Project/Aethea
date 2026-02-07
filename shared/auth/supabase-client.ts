/**
 * Supabase Client - Singleton Pattern
 * Single instance shared across mobile and web
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './auth-types';

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
