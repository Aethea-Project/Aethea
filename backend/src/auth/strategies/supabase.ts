/**
 * Backend Supabase Auth Strategy
 * Server-side authentication handling
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseAuthStrategy {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    // Use service role key for admin operations
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Verify user token and get user data
   */
  async verifyToken(accessToken: string) {
    try {
      const { data, error } = await this.supabase.auth.getUser(accessToken);

      if (error) {
        return { valid: false, error: error.message };
      }

      return { valid: true, user: data.user };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get user by ID (admin operation)
   */
  async getUserById(userId: string) {
    try {
      const { data, error } = await this.supabase.auth.admin.getUserById(userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, user: data.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create user (admin operation)
   */
  async createUser(email: string, password: string, metadata?: any) {
    try {
      const { data, error } = await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, user: data.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete user (admin operation)
   */
  async deleteUser(userId: string) {
    try {
      const { error } = await this.supabase.auth.admin.deleteUser(userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user (admin operation)
   */
  async updateUser(userId: string, updates: any) {
    try {
      const { data, error } = await this.supabase.auth.admin.updateUserById(userId, updates);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, user: data.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Initialize Supabase Auth Strategy
 */
export const initializeSupabaseAuth = (supabaseUrl: string, supabaseServiceKey: string) => {
  return new SupabaseAuthStrategy(supabaseUrl, supabaseServiceKey);
};
