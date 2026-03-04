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

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeGender = (value: unknown): 'male' | 'female' | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'male' || normalized === 'female') return normalized;
  return null;
};

const splitName = (fullName: string | null): { firstName: string | null; lastName: string | null } => {
  if (!fullName) {
    return { firstName: null, lastName: null };
  }

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: null, lastName: null };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

/**
 * Map a Supabase profiles row (snake_case) to the app's UserProfile (camelCase).
 * Single source of truth — avoids duplicating the mapping in every method.
 */
function mapRowToUserProfile(row: Record<string, any>): UserProfile {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    gender: row.gender as any,
    phone: row.phone,
    dateOfBirth: row.date_of_birth,
    bloodType: row.blood_type as any,
    allergies: row.allergies,
    chronicConditions: row.chronic_conditions,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const buildFallbackProfileRow = (
  userId: string,
  email: string,
  firstName: string | null,
  lastName: string | null,
  fullName: string | null
) => {
  const now = new Date().toISOString();
  return {
    id: userId,
    email,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    gender: null,
    phone: null,
    date_of_birth: null,
    blood_type: null,
    allergies: null,
    chronic_conditions: null,
    height_cm: null,
    weight_kg: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    avatar_url: null,
    created_at: now,
    updated_at: now,
  };
};

export class AuthRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  private async ensureProfileRow(userId: string): Promise<AuthResponse<Record<string, any>>> {
    try {
      const authResult = await this.supabase.auth.getUser();
      if (authResult.error || !authResult.data.user || authResult.data.user.id !== userId) {
        return {
          data: null,
          error: parseAuthError(authResult.error ?? new Error('User not authenticated')),
        };
      }

      const authUser = authResult.data.user;
      const identityData = (authUser.identities?.[0]?.identity_data ?? {}) as Record<string, unknown>;
      const metadata = { ...identityData, ...(authUser.user_metadata ?? {}) } as Record<string, unknown>;

      const metadataFullName =
        toNullableString(metadata.full_name) ??
        toNullableString(metadata.name);

      const metadataFirstName =
        toNullableString(metadata.first_name) ??
        toNullableString(metadata.given_name);

      const metadataLastName =
        toNullableString(metadata.last_name) ??
        toNullableString(metadata.family_name);

      const nameFromFull = splitName(metadataFullName);

      const metadataResolvedFirstName = metadataFirstName ?? nameFromFull.firstName;
      const metadataResolvedLastName = metadataLastName ?? nameFromFull.lastName;
      const metadataDerivedFullName = [metadataResolvedFirstName, metadataResolvedLastName].filter(Boolean).join(' ').trim();
      const metadataResolvedFullName = metadataFullName ?? (metadataDerivedFullName || null);

      const existing = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (existing.error) {
        return { data: null, error: parseAuthError(existing.error) };
      }

      if (existing.data) {
        const existingRow = existing.data as Record<string, any>;
        const existingNameFromFull = splitName(toNullableString(existingRow.full_name));
        const existingFirstName = toNullableString(existingRow.first_name) ?? existingNameFromFull.firstName;
        const existingLastName = toNullableString(existingRow.last_name) ?? existingNameFromFull.lastName;

        const mergedFirstName = existingFirstName ?? metadataResolvedFirstName;
        const mergedLastName = existingLastName ?? metadataResolvedLastName;

        const patch = {
          email: toNullableString(existingRow.email) ?? authUser.email ?? '',
          first_name: mergedFirstName,
          last_name: mergedLastName,
        };

        const hasChanges =
          patch.email !== existingRow.email ||
          patch.first_name !== existingRow.first_name ||
          patch.last_name !== existingRow.last_name;

        if (!hasChanges) {
          return { data: existing.data, error: null };
        }

        const updated = await this.supabase
          .from('profiles')
          // @ts-expect-error — Supabase generic type inference for update payload is too narrow
          .update(patch)
          .eq('id', userId)
          .select('*')
          .single();

        if (updated.error) {
          return { data: existing.data, error: null };
        }

        return { data: updated.data, error: null };
      }

      return {
        data: buildFallbackProfileRow(
          userId,
          authUser.email ?? '',
          metadataResolvedFirstName,
          metadataResolvedLastName,
          metadataResolvedFullName
        ),
        error: null,
      };
    } catch (error) {
      return { data: null, error: parseAuthError(error) };
    }
  }

  /**
   * Sign in user with Google OAuth
   */
  async signInWithGoogle(): Promise<AuthResponse<void>> {
    try {
      const origin =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'https://app.aethea.com';

      const { error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/confirm`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
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
   * Sign up new user
   */
  async signUp(credentials: SignUpCredentials): Promise<AuthResponse<User>> {
    try {
      const fullName = `${credentials.firstName} ${credentials.lastName}`.trim();
      const fullPhone = `${credentials.countryCode}${credentials.phone}`;
      const origin =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'https://app.aethea.com';

      const { data, error } = await this.supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          captchaToken: credentials.captchaToken,
          emailRedirectTo: `${origin}/auth/confirm`,
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

      if (!data.user) {
        return {
          data: null,
          error: {
            message: 'Registration could not be completed. Please try again.',
            code: 'SIGNUP_NO_USER',
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
      // Build redirect URL safely for any environment (web / mobile / server)
      const origin =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'https://app.aethea.com'; // fallback for non-browser environments

      const { error } = await this.supabase.auth.resetPasswordForEmail(request.email, {
        redirectTo: `${origin}/reset-password`,
        captchaToken: request.captchaToken,
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
      const ensured = await this.ensureProfileRow(userId);
      if (ensured.error) {
        return { data: null, error: ensured.error };
      }

      if (!ensured.data) {
        return { data: null, error: null };
      }

      // Map database row to UserProfile using shared helper
      const profile = mapRowToUserProfile(ensured.data);

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
      const ensured = await this.ensureProfileRow(userId);
      if (ensured.error) {
        return { data: null, error: ensured.error };
      }

      if (!ensured.data) {
        return {
          data: null,
          error: {
            message: 'Could not prepare profile for update.',
            code: 'PROFILE_NOT_READY',
          },
        };
      }

      const updatePayload = {
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
        avatar_url: updates.avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('profiles')
        // @ts-expect-error — Supabase generic type inference for update payload is too narrow
        .update(updatePayload)
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (error) {
        return { data: null, error: parseAuthError(error) };
      }

      if (!data) {
        const { data: inserted, error: insertError } = await this.supabase
          .from('profiles')
          // @ts-expect-error — Supabase generic type inference for insert payload is too narrow
          .insert({
            id: userId,
            email: ensured.data.email,
            first_name: updates.firstName ?? ensured.data.first_name,
            last_name: updates.lastName ?? ensured.data.last_name,
            gender: updates.gender ?? ensured.data.gender,
            phone: updates.phone ?? ensured.data.phone,
            date_of_birth: updates.dateOfBirth ?? ensured.data.date_of_birth,
            blood_type: updates.bloodType ?? ensured.data.blood_type,
            allergies: updates.allergies ?? ensured.data.allergies,
            chronic_conditions: updates.chronicConditions ?? ensured.data.chronic_conditions,
            height_cm: updates.heightCm ?? ensured.data.height_cm,
            weight_kg: updates.weightKg ?? ensured.data.weight_kg,
            emergency_contact_name: updates.emergencyContactName ?? ensured.data.emergency_contact_name,
            emergency_contact_phone: updates.emergencyContactPhone ?? ensured.data.emergency_contact_phone,
            avatar_url: updates.avatarUrl ?? ensured.data.avatar_url,
          })
          .select()
          .single();

        if (insertError) {
          return { data: null, error: parseAuthError(insertError) };
        }

        const insertedProfile = mapRowToUserProfile(inserted);
        return { data: insertedProfile, error: null };
      }

      const profile = mapRowToUserProfile(data);

      return { data: profile, error: null };
    } catch (error) {
      return { data: null, error: parseAuthError(error) };
    }
  }
}
