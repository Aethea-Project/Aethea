/**
 * Authentication Constants
 */

// Supabase Configuration — loaded from environment variables (NEVER hardcode secrets)
export const getSupabaseConfig = () => {
  const url =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    '';

  const anonKey =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
    '';

  if (!url || !anonKey) {
    console.warn(
      '⚠️  Supabase credentials not found in environment variables.\n' +
      '   Web: set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY in .env\n' +
      '   Mobile: set EXPO_PUBLIC_SUPABASE_URL & EXPO_PUBLIC_SUPABASE_ANON_KEY in .env'
    );
  }

  return { url, anonKey } as const;
};

// Cloudflare Turnstile CAPTCHA
export const TURNSTILE_CONFIG = {
  SITE_KEY: '0x4AAAAAACYzi5W7lMirEEZA',
  SCRIPT_URL: 'https://challenges.cloudflare.com/turnstile/v0/api.js',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'medical-platform-auth-token',
  USER_SESSION: 'medical-platform-session',
  USER_PROFILE: 'medical-platform-profile',
  REFRESH_TOKEN: 'medical-platform-refresh-token',
} as const;

// Token Configuration
export const TOKEN_CONFIG = {
  // Refresh token 5 minutes before expiry
  REFRESH_THRESHOLD_SECONDS: 300,
  // Token cache duration (1 hour)
  CACHE_DURATION_MS: 3600000,
} as const;

// Auth Routes
export const AUTH_ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  PROFILE: '/profile',
} as const;

// Error Messages
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_NOT_FOUND: 'User not found',
  EMAIL_ALREADY_EXISTS: 'Email already registered',
  WEAK_PASSWORD: 'Password must be at least 8 characters',
  NETWORK_ERROR: 'Network error. Please try again',
  SESSION_EXPIRED: 'Session expired. Please login again',
  UNAUTHORIZED: 'Unauthorized access',
  UNKNOWN_ERROR: 'An unexpected error occurred',
  INVALID_DOB: 'Please enter a valid date of birth',
  INVALID_GENDER: 'Please select a gender',
  INVALID_PHONE: 'Please enter a valid phone number',
  PASSWORDS_MISMATCH: 'Passwords do not match',
  CAPTCHA_REQUIRED: 'Please complete the CAPTCHA verification',
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
  // Debounce delay for auth checks
  AUTH_CHECK_DEBOUNCE_MS: 500,
} as const;

// Session Configuration
export const SESSION_CONFIG = {
  // Check session validity every 5 minutes
  CHECK_INTERVAL_MS: 300000,
  // Session timeout warning (5 minutes before expiry)
  TIMEOUT_WARNING_MS: 300000,
} as const;
