/**
 * Auth Provider - React Web Implementation
 * Wraps app and provides auth state to all components
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, defaultAuthState } from '@core/auth/auth-context';
import { authService } from '../services/auth';
import type { AuthState, SignUpCredentials, ProfileUpdateRequest } from '@core/auth/auth-types';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);
  const navigate = useNavigate();

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const sessionResponse = await authService.getSession();
        
        if (!mounted) return;

        if (sessionResponse.data) {
          const userResponse = await authService.getUser();
          const profileResponse = await authService.getUserProfile(
            sessionResponse.data.user.id
          );

          if (mounted) {
            setAuthState({
              user: userResponse.data,
              session: sessionResponse.data,
              profile: profileResponse.data,
              loading: false,
              error: null,
            });
          }
        } else {
          if (mounted) {
            setAuthState({
              ...defaultAuthState,
              loading: false,
            });
          }
        }
      } catch (error) {
        if (mounted) {
          setAuthState({
            ...defaultAuthState,
            loading: false,
            error: error instanceof Error ? { message: error.message } : null,
          });
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((newState) => {
      setAuthState((prev) => ({
        ...prev,
        ...newState,
      }));

      // Only navigate if user is logged in (don't redirect away from public pages)
      if (newState.user && newState.session) {
        // Only redirect if currently on an auth page
        const currentPath = window.location.pathname;
        if (currentPath === '/login' || currentPath === '/register') {
          navigate('/dashboard', { replace: true });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [navigate]);

  // Sign in handler
  const signIn = useCallback(async (email: string, password: string, captchaToken?: string) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authService.signIn({ email, password, captchaToken });

      if (response.error) {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: response.error,
        }));
      } else {
        // Clear loading — session state will be updated by onAuthStateChange
        setAuthState((prev) => ({ ...prev, loading: false }));
      }
      // State will be updated by onAuthStateChange
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? { message: error.message } : null,
      }));
    }
  }, []);

  // Sign up handler
  const signUp = useCallback(
    async (credentials: SignUpCredentials): Promise<{ success: boolean; message?: string }> => {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await authService.signUp(credentials);

        if (response.error) {
          setAuthState((prev) => ({
            ...prev,
            loading: false,
            error: response.error,
          }));
          return { success: false, message: response.error.message };
        }

        setAuthState((prev) => ({ ...prev, loading: false }));
        return {
          success: true,
          message: 'Registration successful! Please check your email to confirm your account.',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Registration failed';
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: { message },
        }));
        return { success: false, message };
      }
    },
    []
  );

  // Sign out handler
  const signOut = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authService.signOut();

      if (response.error) {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: response.error,
        }));
      } else {
        setAuthState({
          ...defaultAuthState,
          loading: false,
        });
        navigate('/', { replace: true });
      }
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? { message: error.message } : null,
      }));
    }
  }, [navigate]);

  // Reset password handler
  const resetPassword = useCallback(async (email: string) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authService.resetPassword({ email });

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: response.error,
      }));
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? { message: error.message } : null,
      }));
    }
  }, []);

  // Update password handler
  const updatePassword = useCallback(async (newPassword: string) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authService.updatePassword({ newPassword });

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: response.error,
      }));
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? { message: error.message } : null,
      }));
    }
  }, []);

  // Update profile handler
  const updateProfile = useCallback(
    async (updates: ProfileUpdateRequest): Promise<{ success: boolean; message?: string }> => {
      const userId = authState.user?.id;
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      try {
        const response = await authService.updateProfile(userId, updates);

        if (response.error) {
          return { success: false, message: response.error.message };
        }

        // Update local profile state
        if (response.data) {
          setAuthState((prev) => ({
            ...prev,
            profile: response.data,
          }));
        }

        return { success: true, message: 'Profile updated successfully' };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Profile update failed';
        return { success: false, message };
      }
    },
    [authState.user?.id]
  );

  // Refresh profile handler (re-fetch from DB)
  const refreshProfile = useCallback(async () => {
    const userId = authState.user?.id;
    if (!userId) return;

    try {
      const profileResponse = await authService.getUserProfile(userId);
      if (profileResponse.data) {
        setAuthState((prev) => ({
          ...prev,
          profile: profileResponse.data,
        }));
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  }, [authState.user?.id]);

  // Monitor profile deletion for auto-logout
  useEffect(() => {
    const userId = authState.user?.id;
    if (!userId || !authState.session) return;

    const supabase = authService.getSupabaseClient();

    // Real-time subscription for immediate profile deletion detection
    const subscription = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        async () => {
          console.warn('Profile deleted, logging out immediately...');
          await signOut();
        }
      )
      .subscribe();

    // Fallback: Check profile every 30 seconds (in case realtime fails)
    const intervalId = setInterval(async () => {
      try {
        const response = await authService.getUserProfile(userId);
        
        // If profile not found or error, logout user
        if (response.error || !response.data) {
          console.warn('Profile deleted or inaccessible, logging out...');
          await signOut();
        }
      } catch (error) {
        console.error('Profile check failed:', error);
        // Don't logout on network errors, only on missing profile
      }
    }, 30000); // Check every 30 seconds

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [authState.user?.id, authState.session, signOut]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      ...authState,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      updateProfile,
      refreshProfile,
    }),
    [authState, signIn, signUp, signOut, resetPassword, updatePassword, updateProfile, refreshProfile]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
