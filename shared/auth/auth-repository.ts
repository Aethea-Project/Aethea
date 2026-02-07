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
      const fullName = `${credentials.firstName} ${credentials.lastName}`.trim();
      const fullPhone = `${credentials.countryCode}${credentials.phone}`;

      const { data, error } = await this.supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          captchaToken: credentials.captchaToken,
          data: {
            first_name: credentials.firstName,
            last_name: credentials.lastName,
            full_name: fullName,
            gender: credentials.gender,
            phone: fullPhone,
            date_of_birth: credentials.dateOfBirth,
          },
        },
      });

      if (error) {
        return { data: null, error: parseAuthError(error) };
      }

      // Supabase returns a user object even when email already exists,
      // but the user will have no identities (empty array)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return {
          data: null,
          error: {
            message: 'This email is already registered. Please sign in instead.',
            code: 'EMAIL_EXISTS',
          },
        };
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
        options: {
          captchaToken: credentials.captchaToken,
        },
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
        firstName: data.first_name,
        lastName: data.last_name,
        fullName: data.full_name,
        gender: data.gender as any,
        phone: data.phone,
        dateOfBirth: data.date_of_birth,
        bloodType: data.blood_type as any,
        allergies: data.allergies,
        chronicConditions: data.chronic_conditions,
        heightCm: data.height_cm,
        weightKg: data.weight_kg,
        emergencyContactName: data.emergency_contact_name,
        emergencyContactPhone: data.emergency_contact_phone,
        insuranceProvider: data.insurance_provider,
        insurancePolicyNumber: data.insurance_policy_number,
        medicalNotes: data.medical_notes,
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
          first_name: updates.firstName,
          last_name: updates.lastName,
          gender: updates.gender,
          phone: updates.phone,
          date_of_birth: updates.dateOfBirth,
          blood_type: updates.bloodType,
          allergies: updates.allergies,
          chronic_conditions: updates.chronicConditions,
          height_cm: updates.heightCm,
          weight_kg: updates.weightKg,
          emergency_contact_name: updates.emergencyContactName,
          emergency_contact_phone: updates.emergencyContactPhone,
          insurance_provider: updates.insuranceProvider,
          insurance_policy_number: updates.insurancePolicyNumber,
          medical_notes: updates.medicalNotes,
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
        firstName: data.first_name,
        lastName: data.last_name,
        fullName: data.full_name,
        gender: data.gender as any,
        phone: data.phone,
        dateOfBirth: data.date_of_birth,
        bloodType: data.blood_type as any,
        allergies: data.allergies,
        chronicConditions: data.chronic_conditions,
        heightCm: data.height_cm,
        weightKg: data.weight_kg,
        emergencyContactName: data.emergency_contact_name,
        emergencyContactPhone: data.emergency_contact_phone,
        insuranceProvider: data.insurance_provider,
        insurancePolicyNumber: data.insurance_policy_number,
        medicalNotes: data.medical_notes,
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
