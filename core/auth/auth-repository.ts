/**
 * Authentication Repository - Repository Pattern
 * Handles all authentication data operations
 */

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
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
import { getSupabaseConfig } from './constants';

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Authorization claims — sourced from JWT (custom_access_token_hook).
    // Profiles table does not store these; they are enriched via the session.
    accountType: row.account_type ?? null,
    accountStatus: row.account_status ?? null,
    mustChangePassword: row.must_change_password ?? false,
  };
}

const buildFallbackProfileRow = (
  userId: string,
  email: string,
  firstName: string | null,
  lastName: string | null,
  fullName: string | null,
  gender: string | null = null,
  phone: string | null = null,
  dateOfBirth: string | null = null
) => {
  const now = new Date().toISOString();
  return {
    id: userId,
    email,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    gender,
    phone,
    date_of_birth: dateOfBirth,
    avatar_url: null,
    created_at: now,
    updated_at: now,
  };
};

export class AuthRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Build a dedicated client for recovery email links using implicit flow.
   * This avoids PKCE verifier coupling to the initiating browser storage.
   */
  private getPasswordRecoveryClient(): SupabaseClient<Database> {
    const { url, anonKey } = getSupabaseConfig();

    if (!url || !anonKey) {
      return this.supabase;
    }

    return createClient<Database>(url, anonKey, {
      auth: {
        flowType: 'implicit',
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

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

      const metadataGender = toNullableString(metadata.gender);
      const metadataPhone = toNullableString(metadata.phone);
      const metadataDateOfBirth = toNullableString(metadata.date_of_birth);

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
        const existingRow = existing.data as Record<string, unknown>;
        const existingNameFromFull = splitName(toNullableString(existingRow.full_name));
        const existingFirstName = toNullableString(existingRow.first_name) ?? existingNameFromFull.firstName;
        const existingLastName = toNullableString(existingRow.last_name) ?? existingNameFromFull.lastName;

        const mergedFirstName = existingFirstName ?? metadataResolvedFirstName;
        const mergedLastName = existingLastName ?? metadataResolvedLastName;

        const existingGender = toNullableString(existingRow.gender);
        const existingPhone = toNullableString(existingRow.phone);
        const existingDateOfBirth = toNullableString(existingRow.date_of_birth);

        const patch = {
          email: toNullableString(existingRow.email) ?? authUser.email ?? '',
          first_name: mergedFirstName,
          last_name: mergedLastName,
          gender: existingGender ?? metadataGender,
          phone: existingPhone ?? metadataPhone,
          date_of_birth: existingDateOfBirth ?? metadataDateOfBirth,
        };

        const hasChanges =
          patch.email !== existingRow.email ||
          patch.first_name !== existingRow.first_name ||
          patch.last_name !== existingRow.last_name ||
          patch.gender !== existingRow.gender ||
          patch.phone !== existingRow.phone ||
          patch.date_of_birth !== existingRow.date_of_birth;

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
          metadataResolvedFullName,
          metadataGender,
          metadataPhone,
          metadataDateOfBirth
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
            account_type: 'patient',
            account_status: 'active',
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
      // Build redirect URL safely for browser and server contexts.
      const origin =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'https://app.aethea.com'; // fallback for non-browser environments

      const recoveryClient = this.getPasswordRecoveryClient();
      const { error } = await recoveryClient.auth.resetPasswordForEmail(request.email, {
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
          .insert({
            id: userId,
            email: ensured.data.email,
            first_name: updates.firstName ?? ensured.data.first_name,
            last_name: updates.lastName ?? ensured.data.last_name,
            gender: updates.gender ?? ensured.data.gender,
            phone: updates.phone ?? ensured.data.phone,
            date_of_birth: updates.dateOfBirth ?? ensured.data.date_of_birth,
            avatar_url: updates.avatarUrl ?? ensured.data.avatar_url,
          } as any)
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
