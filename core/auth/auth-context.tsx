/**
 * Auth Context - Shared definition
 * Web implementation lives in web/src/contexts/AuthProvider.tsx
 */

import { createContext } from 'react';
import { AuthState, SignUpCredentials, ProfileUpdateRequest } from './auth-types';

// Context value interface
export interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string, captchaToken?: string, rememberMe?: boolean) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, captchaToken?: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (updates: ProfileUpdateRequest) => Promise<{ success: boolean; message?: string }>;
  refreshProfile: () => Promise<void>;
}

// Create context with default null value
export const AuthContext = createContext<AuthContextValue | null>(null);

// Default initial state
export const defaultAuthState: AuthState = {
  user: null,
  session: null,
  profile: null,
  loading: true,
  error: null,
};
