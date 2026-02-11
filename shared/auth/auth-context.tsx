/**
 * Auth Context - Shared definition
 * Platform-specific implementations in mobile/web folders
 */

import { createContext } from 'react';
import { AuthState, SignUpCredentials, ProfileUpdateRequest, UserProfile } from './auth-types';

// Context value interface
export interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string, captchaToken?: string) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
