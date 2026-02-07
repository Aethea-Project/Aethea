/**
 * Custom Auth Hook - Shared across mobile and web
 * Provides easy access to auth context
 */

import { useContext } from 'react';
import { AuthContext } from './auth-context';

/**
 * Custom hook to access auth context
 * Must be used within AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

/**
 * Helper hook to check if user is authenticated
 */
export const useIsAuthenticated = (): boolean => {
  const { user, session } = useAuth();
  return !!(user && session);
};

/**
 * Helper hook to require authentication
 * Throws error if not authenticated (can be caught by error boundary)
 */
export const useRequireAuth = () => {
  const auth = useAuth();
  
  if (!auth.user || !auth.session) {
    throw new Error('Authentication required');
  }

  return auth;
};
