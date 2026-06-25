/**
 * Auth Provider - React Web Implementation
 * Wraps app and provides auth state to all components
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, defaultAuthState } from '@core/auth/auth-context';
import { STORAGE_KEYS } from '@core/auth/constants';
import { authService } from '../services/auth';
import { completePasswordChange as completePasswordChangeApi } from '../services/authApi';
import type { AuthState, SignUpCredentials, ProfileUpdateRequest } from '@core/auth/auth-types';
import { useAutoLogout } from '../hooks/useAutoLogout';
import { getPostLoginPath, resolveAccountType } from '../lib/authResolution';

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
          // Server-validate the user — catches deleted/banned accounts
          const userResponse = await authService.getUser();

          if (!mounted) return;

          if (userResponse.error || !userResponse.data) {
            // The session token exists in storage but the server rejected it
            // (user deleted, banned, or token revoked). Force a clean sign-out.
            await authService.getSupabaseClient().auth.signOut();
            if (mounted) {
              setAuthState({ ...defaultAuthState, loading: false });
            }
            return;
          }

          const profileResponse = await authService.getUserProfile(
            userResponse.data.id
          );

          if (!mounted) return;

          // Hydration / Sync Check:
          // If the postgres public profile differs from the Supabase JWT metadata,
          // instantly refresh the local token to resolve "split-brain" states.
          let finalSession = sessionResponse.data;
          let finalUser = userResponse.data;
          const tokenType = finalSession.user?.app_metadata?.account_type 
                         || finalSession.user?.user_metadata?.account_type;
          
          if (profileResponse.data?.accountType && tokenType !== profileResponse.data.accountType) {
            const refreshResult = await authService.getSupabaseClient().auth.refreshSession();
            if (refreshResult.data?.session) {
              finalSession = refreshResult.data.session;
              // Also update the user to reflect the new metadata
              finalUser = refreshResult.data.user ?? finalUser;
            }
          }

          if (mounted) {
            setAuthState({
              user: finalUser,
              session: finalSession,
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
          // On any unexpected error, clear state so the UI doesn't show a
          // phantom session from localStorage.
          try {
            await authService.getSupabaseClient().auth.signOut();
          } catch { /* best-effort cleanup */ }

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
          const accountType = resolveAccountType(newState.session, newState.profile?.accountType);
          navigate(getPostLoginPath(accountType), { replace: true });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [navigate]);

  // Sign in handler
  const signIn = useCallback(async (email: string, password: string, captchaToken?: string, rememberMe: boolean = false) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Set storage preference BEFORE signIn so the Supabase SDK writes
      // tokens to the correct store (sessionStorage vs localStorage).
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEYS.USER_SESSION, rememberMe ? 'remember-30d' : 'session-only');
      }

      const response = await authService.signIn({ email, password, captchaToken, rememberMe });

      if (response.error) {
        // Undo preference on failure so a stale value doesn't affect the next attempt
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
        }
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: response.error,
        }));
        throw new Error(response.error.message);
      } else {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEYS.USER_SESSION, rememberMe ? 'remember-30d' : 'session-only');
        }
        // Clear loading — session state will be updated by onAuthStateChange
        setAuthState((prev) => ({ ...prev, loading: false }));
      }
      // State will be updated by onAuthStateChange
    } catch (error) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
      }
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? { message: error.message } : null,
      }));
      throw error;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Set preference before the OAuth redirect so the returning callback
      // writes tokens to sessionStorage (session-only by default).
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEYS.USER_SESSION, 'session-only');
      }

      const response = await authService.signInWithGoogle();

      if (response.error) {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
        }
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: response.error,
        }));
        throw new Error(response.error.message);
      }

      // OAuth redirects away; keep loading state until redirect occurs
    } catch (error) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
      }
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? { message: error.message } : null,
      }));
      throw error;
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
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
        }
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
  const resetPassword = useCallback(async (email: string, captchaToken?: string) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authService.resetPassword({ email, captchaToken });

      if (response.error) {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: response.error,
        }));
        throw new Error(response.error.message);
      }

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: null,
      }));
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? { message: error.message } : null,
      }));
      throw error;
    }
  }, []);

  // Update password handler
  const updatePassword = useCallback(async (newPassword: string) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authService.updatePassword({ newPassword });

      if (!response.error) {
        await completePasswordChangeApi({ recoveryFlow: true });

        // Force refresh to fetch JWT claims with must_change_password=false.
        const { data: refreshed, error: refreshError } = await authService
          .getSupabaseClient()
          .auth.refreshSession();

        if (refreshError) {
          throw refreshError;
        }

        const refreshedUser = refreshed.session?.user ?? response.data;
        const refreshedSession = refreshed.session;

        let refreshedProfile = null;
        if (refreshedUser) {
          const profileResponse = await authService.getUserProfile(refreshedUser.id);
          refreshedProfile = profileResponse.data;
        }

        setAuthState((prev) => ({
          ...prev,
          user: refreshedUser,
          session: refreshedSession,
          profile: refreshedProfile,
          loading: false,
          error: null,
        }));
        return;
      }

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: response.error,
      }));
      throw new Error(response.error.message);
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? { message: error.message } : null,
      }));
      throw error;
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
    } catch {
      // Ignore transient refresh failures and keep existing profile state.
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
          await signOut();
        }
      )
      .subscribe();

    // Fallback: Check profile every 30 seconds (in case realtime fails)
    const intervalId = setInterval(async () => {
      try {
        const response = await authService.getUserProfile(userId);

        if (response.error) {
          return;
        }

        // If profile truly missing, logout user
        if (!response.data) {
          await signOut();
        }
      } catch {
        // Don't logout on network errors, only on missing profile
      }
    }, 30000); // Check every 30 seconds

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [authState.user?.id, authState.session, signOut]);

  // HIPAA Auto-Logout: 15-minute inactivity timeout
  const isActiveSession = Boolean(authState.session);
  useAutoLogout(
    () => {
      // Best-effort console log, but this will redirect to login anyway
      console.log('Session timed out due to inactivity.');
      signOut().catch(() => {});
    },
    isActiveSession,
    15 * 60 * 1000
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      ...authState,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      updateProfile,
      refreshProfile,
    }),
    [authState, signIn, signInWithGoogle, signUp, signOut, resetPassword, updatePassword, updateProfile, refreshProfile]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
