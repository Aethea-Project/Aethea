/**
 * Web Auth Service
 * React web specific auth implementation
 */

import { initializeSupabase } from '@core/auth/supabase-client';
import { AuthService } from '@core/auth/auth-service';

// Initialize Supabase for web (uses localStorage by default)
const supabase = initializeSupabase({
  url: import.meta.env.VITE_SUPABASE_URL!,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
});

// Create auth service instance
export const authService = new AuthService(supabase);

// Test API helper — easy to rename/remove later
export const testMessageEmailApi = async (email: string, captchaToken?: string) => {
  return authService.resetPassword({
    email,
    captchaToken,
  });
};
