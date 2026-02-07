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

  return { valid: true };
};

/**
 * Validate phone number (basic)
 */
export const isValidPhone = (phone: string): boolean => {
  // Basic validation - can be enhanced based on country
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
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
    weak_password: AUTH_ERROR_MESSAGES.WEAK_PASSWORD,
    network_error: AUTH_ERROR_MESSAGES.NETWORK_ERROR,
  };

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
 * Sanitize user input
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Generate random string for state/nonce
 */
export const generateRandomString = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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
