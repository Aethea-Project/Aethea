/**
 * Authentication Utility Functions
 */

import { PASSWORD_RULES, AUTH_ERROR_MESSAGES } from './constants';
import { AuthError } from './auth-types';

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (password.length < PASSWORD_RULES.MIN_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${PASSWORD_RULES.MIN_LENGTH} characters`,
    };
  }

  if (password.length > PASSWORD_RULES.MAX_LENGTH) {
    return {
      valid: false,
      error: `Password must be less than ${PASSWORD_RULES.MAX_LENGTH} characters`,
    };
  }

  // Check for uppercase letter
  if (PASSWORD_RULES.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter',
    };
  }

  // Check for special characters
  if (PASSWORD_RULES.REQUIRE_SPECIAL && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one special character (!@#$%^&*...)',
    };
  }

  // Check for lowercase letter
  if (PASSWORD_RULES.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter',
    };
  }

  // Check for number
  if (PASSWORD_RULES.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number',
    };
  }

  return { valid: true };
};

/**
 * Validate name (no numbers, no special chars except hyphens/spaces)
 * Returns detailed error message
 */
export const isValidName = (name: string): { valid: boolean; error?: string } => {
  const trimmedName = name?.trim() || '';
  
  if (!trimmedName) {
    return { valid: false, error: 'Name is required' };
  }
  
  if (trimmedName.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }
  
  if (trimmedName.length > 50) {
    return { valid: false, error: 'Name must be less than 50 characters' };
  }
  
  // Check for invalid characters
  const nameRegex = /^[a-zA-Z\u0600-\u06FF\s'-]+$/;
  if (!nameRegex.test(trimmedName)) {
    return { valid: false, error: 'Name can only contain letters, spaces, hyphens and apostrophes' };
  }
  
  // Check if first letter is uppercase
  const firstChar = trimmedName.charAt(0);
  if (firstChar !== firstChar.toUpperCase()) {
    return { valid: false, error: 'Name must start with a capital letter' };
  }
  
  return { valid: true };
};

/**
 * Validate date of birth (must be valid date, user must be 1-120 years old)
 */
export const isValidDateOfBirth = (dob: string): { valid: boolean; error?: string } => {
  const date = new Date(dob);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())
    ? age - 1
    : age;

  if (actualAge < 1) {
    return { valid: false, error: 'You must be at least 1 year old' };
  }
  if (actualAge > 120) {
    return { valid: false, error: 'Please enter a valid date of birth' };
  }
  if (date > today) {
    return { valid: false, error: 'Date of birth cannot be in the future' };
  }

  return { valid: true };
};

/**
 * Validate gender value
 */
export const isValidGender = (gender: string): boolean => {
  return ['male', 'female'].includes(gender);
};

/**
 * Validate passwords match
 */
export const doPasswordsMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword;
};

/**
 * Country phone validation rules
 */
export const COUNTRY_PHONE_RULES: Record<string, { code: string; length: number; pattern: RegExp }> = {
  'SA': { code: '+966', length: 9, pattern: /^5\d{8}$/ }, // Saudi Arabia
  'EG': { code: '+20', length: 10, pattern: /^1[0125]\d{8}$/ }, // Egypt
  'AE': { code: '+971', length: 9, pattern: /^5[024568]\d{7}$/ }, // UAE
  'KW': { code: '+965', length: 8, pattern: /^[569]\d{7}$/ }, // Kuwait
  'QA': { code: '+974', length: 8, pattern: /^[3567]\d{7}$/ }, // Qatar
  'BH': { code: '+973', length: 8, pattern: /^[3679]\d{7}$/ }, // Bahrain
  'OM': { code: '+968', length: 8, pattern: /^[79]\d{7}$/ }, // Oman
  'JO': { code: '+962', length: 9, pattern: /^7[789]\d{7}$/ }, // Jordan
  'LB': { code: '+961', length: 8, pattern: /^[3-9]\d{7}$/ }, // Lebanon
  'US': { code: '+1', length: 10, pattern: /^\d{10}$/ }, // USA
  'GB': { code: '+44', length: 10, pattern: /^7\d{9}$/ }, // UK
};

/**
 * Validate phone number with country code
 */
export const isValidPhone = (countryCode: string, phoneNumber: string): { valid: boolean; error?: string } => {
  // Find country rule
  const rule = Object.values(COUNTRY_PHONE_RULES).find(r => r.code === countryCode);
  
  if (!rule) {
    return { valid: false, error: 'Invalid country code' };
  }

  // Remove all non-digit characters
  const cleanNumber = phoneNumber.replace(/\D/g, '');

  // Check length
  if (cleanNumber.length !== rule.length) {
    return { valid: false, error: `Phone number must be ${rule.length} digits for ${countryCode}` };
  }

  // Check pattern
  if (!rule.pattern.test(cleanNumber)) {
    return { valid: false, error: `Invalid phone number format for ${countryCode}` };
  }

  return { valid: true };
};

/**
 * Parse Supabase error to user-friendly message
 */
export const parseAuthError = (error: any): AuthError => {
  if (!error) {
    return {
      message: AUTH_ERROR_MESSAGES.UNKNOWN_ERROR,
      code: 'UNKNOWN',
    };
  }

  // Map common Supabase error codes
  const errorMap: Record<string, string> = {
    invalid_credentials: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
    user_not_found: AUTH_ERROR_MESSAGES.USER_NOT_FOUND,
    email_exists: AUTH_ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
    user_already_exists: AUTH_ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
    weak_password: AUTH_ERROR_MESSAGES.WEAK_PASSWORD,
    network_error: AUTH_ERROR_MESSAGES.NETWORK_ERROR,
    over_email_send_rate_limit: 'Too many requests. Please try again later.',
    email_not_confirmed: 'Please confirm your email address.',
    captcha_failed: 'CAPTCHA verification failed. Please try again.',
    validation_failed: 'CAPTCHA verification failed. Please try again.',
  };

  // Check if error message contains captcha-related keywords
  const errorMessage = error.message?.toLowerCase() || '';
  if (errorMessage.includes('captcha')) {
    return {
      message: 'CAPTCHA verification failed. Please complete the verification and try again.',
      code: error.code || 'CAPTCHA_FAILED',
      status: error.status,
    };
  }

  // Check for duplicate email messages
  if (errorMessage.includes('already registered') || errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
    return {
      message: AUTH_ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
      code: error.code || 'EMAIL_EXISTS',
      status: error.status,
    };
  }

  // Check if error message contains password-related keywords
  if (errorMessage.includes('password') && errorMessage.includes('character')) {
    return {
      message: 'Password must be at least 8 characters long',
      code: error.code || 'WEAK_PASSWORD',
      status: error.status,
    };
  }

  const message = errorMap[error.code] || error.message || AUTH_ERROR_MESSAGES.UNKNOWN_ERROR;

  return {
    message,
    code: error.code,
    status: error.status,
  };
};

/**
 * Debounce function for performance
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Rate limiter for login attempts
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  isAllowed(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Filter out old attempts outside the window
    const recentAttempts = attempts.filter((time) => now - time < windowMs);

    if (recentAttempts.length >= maxAttempts) {
      return false;
    }

    // Record new attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Sanitize user input — strip HTML tags and dangerous characters
 */
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>"'`;()]/g, '') // strip potential XSS chars
    .replace(/javascript:/gi, '') // strip JS protocol
    .replace(/on\w+=/gi, '');     // strip event handlers
};

/**
 * Generate cryptographically secure random string for state/nonce
 */
export const generateRandomString = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  // Use crypto API when available for better randomness
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const array = new Uint32Array(length);
    globalThis.crypto.getRandomValues(array);
    return Array.from(array, (v) => chars[v % chars.length]).join('');
  }

  // Fallback for environments without crypto
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Mask email for privacy
 */
export const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  if (!domain) return email;

  const visibleChars = Math.min(3, Math.floor(localPart.length / 2));
  const masked = localPart.slice(0, visibleChars) + '***';
  return `${masked}@${domain}`;
};

/**
 * Format error for logging
 */
export const formatErrorForLogging = (error: any): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack}`;
  }
  return JSON.stringify(error, null, 2);
};
