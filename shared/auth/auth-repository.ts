/**
 * Authentication Repository - Repository Pattern
 * Handles all authentication data operations
 */

import { SupabaseClient, User, Session } from '@supabase/supabase-js';
import {
  SignUpCredentials,
  SignInCredentials,
  PasswordResetRequest,
  PasswordUpdateRequest,
  ProfileUpdateRequest,
  UserProfile,
  AuthResponse,
  Database,
} from './auth-types';
import { parseAuthError } from './auth-utils';

export class AuthRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Sign up new user
   */
  async signUp(credentials: SignUpCredentials): Promise<AuthResponse<User>> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.fullName,
            phone: credentials.phone,
          },
        },
      });

      if (error) {
        return { data: null, error: parseAuthError(error) };
      }

      return { data: data.user, error: null };
    } catch (error) {
      return { data: null, error: parseAuthError(error) };
    }
  }

  /**
   * Sign in user
   */
  async signIn(credentials: SignInCredentials): Promise<AuthResponse<Session>> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { data: null, error: parseAuthError(error) };
      }

      return { data: data.session, error: null };
    } catch (error) {
      return { data: null, error: parseAuthError(error) };
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<AuthResponse<void>> {
    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        return { data: null, error: parseAuthError(error) };
      }

      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: parseAuthError(error) };
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<AuthResponse<Session>> {
    try {
      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
        return { data: null, error: parseAuthError(error) };
      }

      return { data: data.session, error: null };
    } catch (error) {
      return { data: null, error: parseAuthError(error) };
    }
  }

  /**
   * Get current user (always fetches from server)
   */
  async getUser(): Promise<AuthResponse<User>> {
    try {
      const { data, error } = await this.supabase.auth.getUser();

      if (error) {
        return { data: null, error: parseAuthError(error) };
      }

      return { data: data.user, error: null };
    } catch (error) {
      return { data: null, error: parseAuthError(error) };
    }
  }

  /**
   * Request password reset
   */
  async resetPassword(request: PasswordResetRequest): Promise<AuthResponse<void>> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(request.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { data: null, error: parseAuthError(error) };
      }

      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: parseAuthError(error) };
    }
  }

  /**
   * Update password
   */
  async updatePassword(request: PasswordUpdateRequest): Promise<AuthResponse<User>> {
    try {
      const { data, error } = await this.supabase.auth.updateUser({
        password: request.newPassword,
      });

      if (error) {
        return { data: null, error: parseAuthError(error) };
      }

      return { data: data.user, error: null };
    } catch (error) {
      return { data: null, error: parseAuthError(error) };
    }
  }

  /**
   * Refresh session
   */
  async refreshSession(): Promise<AuthResponse<Session>> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error) {
        return { data: null, error: parseAuthError(error) };
      }

      return { data: data.session, error: null };
    } catch (error) {
      return { data: null, error: parseAuthError(error) };
    }
  }

  /**
   * Get user profile from database
   */
  async getUserProfile(userId: string): Promise<AuthResponse<UserProfile>> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return { data: null, error: parseAuthError(error) };
      }

      // Map database row to UserProfile
      const profile: UserProfile = {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        phone: data.phone,
        dateOfBirth: data.date_of_birth,
        bloodType: data.blood_type,
        allergies: data.allergies,
        chronicConditions: data.chronic_conditions,
        avatarUrl: data.avatar_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      return { data: profile, error: null };
    } catch (error) {
      return { data: null, error: parseAuthError(error) };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: ProfileUpdateRequest
  ): Promise<AuthResponse<UserProfile>> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .update({
          full_name: updates.fullName,
          phone: updates.phone,
          date_of_birth: updates.dateOfBirth,
          blood_type: updates.bloodType,
          allergies: updates.allergies,
          chronic_conditions: updates.chronicConditions,
          avatar_url: updates.avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return { data: null, error: parseAuthError(error) };
      }

      const profile: UserProfile = {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        phone: data.phone,
        dateOfBirth: data.date_of_birth,
        bloodType: data.blood_type,
        allergies: data.allergies,
        chronicConditions: data.chronic_conditions,
        avatarUrl: data.avatar_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      return { data: profile, error: null };
    } catch (error) {
      return { data: null, error: parseAuthError(error) };
    }
  }
}
