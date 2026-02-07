/**
 * Auth Context - Shared definition
 * Platform-specific implementations in mobile/web folders
 */

import { createContext } from 'react';
import { AuthState } from './auth-types';

// Context value interface
export interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
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
