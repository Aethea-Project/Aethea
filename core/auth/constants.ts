/**
 * Authentication Constants
 */

// Supabase Configuration — loaded from environment variables (NEVER hardcode secrets)
export const getSupabaseConfig = () => {
  const url =
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    '';

  const anonKey =
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
    '';

  return { url, anonKey } as const;
};

// Cloudflare Turnstile CAPTCHA
// Fallback: Cloudflare's always-pass test key (safe for local dev, never use in production)
// See: https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const turnstileSiteKey =
  (typeof process !== 'undefined' && process.env?.VITE_TURNSTILE_SITE_KEY) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY) ||
  '1x00000000000000000000AA';

export const TURNSTILE_CONFIG = {
  SITE_KEY: turnstileSiteKey,
  SCRIPT_URL: 'https://challenges.cloudflare.com/turnstile/v0/api.js',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  USER_SESSION: 'medical-platform-session',
} as const;

// Token Configuration
export const TOKEN_CONFIG = {
  // Refresh token 5 minutes before expiry
  REFRESH_THRESHOLD_SECONDS: 300,
} as const;

// Error Messages
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_NOT_FOUND: 'User not found',
  EMAIL_ALREADY_EXISTS: 'Email already registered',
  WEAK_PASSWORD: 'Password must be at least 8 characters',
  NETWORK_ERROR: 'Network error. Please try again',
  UNKNOWN_ERROR: 'An unexpected error occurred',
  INVALID_DOB: 'Please enter a valid date of birth',
  INVALID_GENDER: 'Please select a gender',
  INVALID_PHONE: 'Please enter a valid phone number',
} as const;

// Password Validation (medical-grade security)
export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
} as const;

// Rate Limiting (client-side)
export const RATE_LIMITS = {
  // Max login attempts in time window
  MAX_LOGIN_ATTEMPTS: 5,
  // Time window in milliseconds (15 minutes)
  LOGIN_WINDOW_MS: 900000,
} as const;
