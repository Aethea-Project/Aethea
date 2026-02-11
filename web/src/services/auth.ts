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

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const sessionResponse = await authService.getSession();
  return !!sessionResponse.data;
};

// Helper to get current user
export const getCurrentUser = async () => {
  const userResponse = await authService.getUser();
  return userResponse.data;
};

// Helper to redirect to login if not authenticated
export const requireAuth = async (redirectUrl: string = '/login'): Promise<boolean> => {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    window.location.href = redirectUrl;
    return false;
  }
  return true;
};
