/**
 * Authentication Service - Business Logic Layer
 * Orchestrates auth operations with caching and validation
 */

import { SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { AuthRepository } from './auth-repository';
import {
  SignUpCredentials,
  SignInCredentials,
  PasswordResetRequest,
  PasswordUpdateRequest,
  ProfileUpdateRequest,
  UserProfile,
  AuthResponse,
  AuthState,
  Database,
} from './auth-types';
import {
  isValidEmail,
  validatePassword,
  isValidPhone,
  isValidName,
  isValidDateOfBirth,
  isValidGender,
  sanitizeInput,
  rateLimiter,
} from './auth-utils';
import { shouldRefreshToken, clearTokenCache } from './token-manager';
import { RATE_LIMITS, AUTH_ERROR_MESSAGES } from './constants';

export class AuthService {
  private repository: AuthRepository;
  private authStateListeners: Set<(state: AuthState) => void> = new Set();

  constructor(private supabase: SupabaseClient<Database>) {
    this.repository = new AuthRepository(supabase);
    this.initializeAuthListener();
  }

  /**
   * Get Supabase client for advanced operations
   */
  getSupabaseClient(): SupabaseClient<Database> {
    return this.supabase;
  }

  /**
   * Initialize auth state listener (Observer Pattern)
   */
  private initializeAuthListener(): void {
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.handleAuthChange(event as any, session);
    });
  }

  /**
   * Handle auth state changes
   */
  private async handleAuthChange(event: string, session: Session | null): Promise<void> {
    const user = session?.user || null;
    let profile: UserProfile | null = null;

    // Fetch profile if user is signed in
    if (user) {
      const profileResponse = await this.repository.getUserProfile(user.id);
      profile = profileResponse.data;
    }

    // Notify all listeners
    const authState: AuthState = {
      user,
      session,
      profile,
      loading: false,
      error: null,
    };

    this.authStateListeners.forEach((listener) => listener(authState));
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (state: AuthState) => void): () => void {
    this.authStateListeners.add(callback);
    return () => this.authStateListeners.delete(callback);
  }

  /**
   * Sign up new user with validation
   */
  async signUp(credentials: SignUpCredentials): Promise<AuthResponse<User>> {
    // Validate first name
    const firstNameValidation = isValidName(credentials.firstName);
    if (!firstNameValidation.valid) {
      return {
        data: null,
        error: { message: `First name: ${firstNameValidation.error}` },
      };
    }

    // Validate last name
    const lastNameValidation = isValidName(credentials.lastName);
    if (!lastNameValidation.valid) {
      return {
        data: null,
        error: { message: `Last name: ${lastNameValidation.error}` },
      };
    }

    // Validate email
    if (!isValidEmail(credentials.email)) {
      return {
        data: null,
        error: { message: 'Invalid email format' },
      };
    }

    // Validate password
    const passwordValidation = validatePassword(credentials.password);
    if (!passwordValidation.valid) {
      return {
        data: null,
        error: { message: passwordValidation.error! },
      };
    }

    // Validate date of birth
    const dobValidation = isValidDateOfBirth(credentials.dateOfBirth);
    if (!dobValidation.valid) {
      return {
        data: null,
        error: { message: dobValidation.error || AUTH_ERROR_MESSAGES.INVALID_DOB },
      };
    }

    // Validate gender
    if (!isValidGender(credentials.gender)) {
      return {
        data: null,
        error: { message: AUTH_ERROR_MESSAGES.INVALID_GENDER },
      };
    }

    // Validate phone
    const phoneValidation = isValidPhone(credentials.countryCode, credentials.phone);
    if (!phoneValidation.valid) {
      return {
        data: null,
        error: { message: phoneValidation.error || AUTH_ERROR_MESSAGES.INVALID_PHONE },
      };
    }

    // Sanitize inputs
    const sanitized: SignUpCredentials = {
      email: sanitizeInput(credentials.email.toLowerCase()),
      password: credentials.password,
      firstName: sanitizeInput(credentials.firstName),
      lastName: sanitizeInput(credentials.lastName),
      dateOfBirth: credentials.dateOfBirth,
      gender: credentials.gender,
      countryCode: credentials.countryCode,
      phone: sanitizeInput(credentials.phone),
      captchaToken: credentials.captchaToken,
    };

    return this.repository.signUp(sanitized);
  }

  /**
   * Sign in user with rate limiting
   */
  async signIn(credentials: SignInCredentials): Promise<AuthResponse<Session>> {
    // Rate limiting
    const allowed = rateLimiter.isAllowed(
      credentials.email,
      RATE_LIMITS.MAX_LOGIN_ATTEMPTS,
      RATE_LIMITS.LOGIN_WINDOW_MS
    );

    if (!allowed) {
      return {
        data: null,
        error: {
          message: 'Too many login attempts. Please try again later.',
          code: 'RATE_LIMITED',
        },
      };
    }

    // Validate email
    if (!isValidEmail(credentials.email)) {
      return {
        data: null,
        error: { message: 'Invalid email format' },
      };
    }

    const sanitized: SignInCredentials = {
      email: sanitizeInput(credentials.email.toLowerCase()),
      password: credentials.password,
      captchaToken: credentials.captchaToken,
    };

    const response = await this.repository.signIn(sanitized);

    // Reset rate limiter on successful login
    if (response.data) {
      rateLimiter.reset(credentials.email);
    }

    return response;
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<AuthResponse<void>> {
    clearTokenCache();
    return this.repository.signOut();
  }

  /**
   * Get current session with auto-refresh
   */
  async getSession(): Promise<AuthResponse<Session>> {
    const sessionResponse = await this.repository.getSession();

    // Auto-refresh if needed
    if (sessionResponse.data && shouldRefreshToken(sessionResponse.data)) {
      return this.repository.refreshSession();
    }

    return sessionResponse;
  }

  /**
   * Get current user
   */
  async getUser(): Promise<AuthResponse<User>> {
    return this.repository.getUser();
  }

  /**
   * Request password reset
   */
  async resetPassword(request: PasswordResetRequest): Promise<AuthResponse<void>> {
    if (!isValidEmail(request.email)) {
      return {
        data: null,
        error: { message: 'Invalid email format' },
      };
    }

    return this.repository.resetPassword({
      email: sanitizeInput(request.email.toLowerCase()),
      captchaToken: request.captchaToken,
    });
  }

  /**
   * Update password
   */
  async updatePassword(request: PasswordUpdateRequest): Promise<AuthResponse<User>> {
    const passwordValidation = validatePassword(request.newPassword);
    if (!passwordValidation.valid) {
      return {
        data: null,
        error: { message: passwordValidation.error! },
      };
    }

    return this.repository.updatePassword(request);
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<AuthResponse<UserProfile>> {
    return this.repository.getUserProfile(userId);
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: ProfileUpdateRequest
  ): Promise<AuthResponse<UserProfile>> {
    // Validate firstName if provided
    if (updates.firstName) {
      const firstNameValidation = isValidName(updates.firstName);
      if (!firstNameValidation.valid) {
        return {
          data: null,
          error: { message: `First name: ${firstNameValidation.error}` },
        };
      }
    }

    // Validate lastName if provided
    if (updates.lastName) {
      const lastNameValidation = isValidName(updates.lastName);
      if (!lastNameValidation.valid) {
        return {
          data: null,
          error: { message: `Last name: ${lastNameValidation.error}` },
        };
      }
    }

    // Validate height if provided (must be reasonable: 30–300 cm)
    if (updates.heightCm !== undefined) {
      if (updates.heightCm < 30 || updates.heightCm > 300) {
        return {
          data: null,
          error: { message: 'Height must be between 30 and 300 cm' },
        };
      }
    }

    // Validate weight if provided (must be reasonable: 1–500 kg)
    if (updates.weightKg !== undefined) {
      if (updates.weightKg < 1 || updates.weightKg > 500) {
        return {
          data: null,
          error: { message: 'Weight must be between 1 and 500 kg' },
        };
      }
    }

    // Sanitize inputs
    const sanitized: ProfileUpdateRequest = {
      firstName: updates.firstName ? sanitizeInput(updates.firstName) : undefined,
      lastName: updates.lastName ? sanitizeInput(updates.lastName) : undefined,
      gender: updates.gender,
      phone: updates.phone ? sanitizeInput(updates.phone) : undefined,
      dateOfBirth: updates.dateOfBirth,
      bloodType: updates.bloodType,
      allergies: updates.allergies ? sanitizeInput(updates.allergies) : undefined,
      chronicConditions: updates.chronicConditions
        ? sanitizeInput(updates.chronicConditions)
        : undefined,
      heightCm: updates.heightCm,
      weightKg: updates.weightKg,
      emergencyContactName: updates.emergencyContactName
        ? sanitizeInput(updates.emergencyContactName)
        : undefined,
      emergencyContactPhone: updates.emergencyContactPhone
        ? sanitizeInput(updates.emergencyContactPhone)
        : undefined,
      avatarUrl: updates.avatarUrl,
    };

    return this.repository.updateProfile(userId, sanitized);
  }
}
