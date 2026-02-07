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
  sanitizeInput,
  rateLimiter,
} from './auth-utils';
import { shouldRefreshToken, clearTokenCache } from './token-manager';
import { RATE_LIMITS } from './constants';

export class AuthService {
  private repository: AuthRepository;
  private authStateListeners: Set<(state: AuthState) => void> = new Set();

  constructor(private supabase: SupabaseClient<Database>) {
    this.repository = new AuthRepository(supabase);
    this.initializeAuthListener();
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

    // Validate phone if provided
    if (credentials.phone && !isValidPhone(credentials.phone)) {
      return {
        data: null,
        error: { message: 'Invalid phone number format' },
      };
    }

    // Sanitize inputs
    const sanitized: SignUpCredentials = {
      email: sanitizeInput(credentials.email.toLowerCase()),
      password: credentials.password,
      fullName: credentials.fullName ? sanitizeInput(credentials.fullName) : undefined,
      phone: credentials.phone ? sanitizeInput(credentials.phone) : undefined,
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
    // Validate phone if provided
    if (updates.phone && !isValidPhone(updates.phone)) {
      return {
        data: null,
        error: { message: 'Invalid phone number format' },
      };
    }

    // Sanitize inputs
    const sanitized: ProfileUpdateRequest = {
      fullName: updates.fullName ? sanitizeInput(updates.fullName) : undefined,
      phone: updates.phone ? sanitizeInput(updates.phone) : undefined,
      dateOfBirth: updates.dateOfBirth,
      bloodType: updates.bloodType,
      allergies: updates.allergies ? sanitizeInput(updates.allergies) : undefined,
      chronicConditions: updates.chronicConditions
        ? sanitizeInput(updates.chronicConditions)
        : undefined,
      avatarUrl: updates.avatarUrl,
    };

    return this.repository.updateProfile(userId, sanitized);
  }
}
