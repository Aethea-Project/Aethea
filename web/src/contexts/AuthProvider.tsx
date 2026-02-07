/**
 * Auth Provider - React Web Implementation
 * Wraps app and provides auth state to all components
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, defaultAuthState } from '@shared/auth/auth-context';
import { authService } from '../services/auth';
import type { AuthState } from '@shared/auth/auth-types';

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

      // Navigate on auth state changes
      if (newState.user && newState.session) {
        navigate('/dashboard');
      } else if (!newState.user) {
        navigate('/login');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [navigate]);

  // Sign in handler
  const signIn = useCallback(async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authService.signIn({ email, password });

      if (response.error) {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: response.error,
        }));
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
    async (email: string, password: string, fullName?: string) => {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await authService.signUp({
          email,
          password,
          fullName,
        });

        if (response.error) {
          setAuthState((prev) => ({
            ...prev,
            loading: false,
            error: response.error,
          }));
        }
        // State will be updated by onAuthStateChange
      } catch (error) {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? { message: error.message } : null,
        }));
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
      }
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? { message: error.message } : null,
      }));
    }
  }, []);

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

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      ...authState,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [authState, signIn, signUp, signOut, resetPassword, updatePassword]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
