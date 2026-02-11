/**
 * Mobile Auth Service
 * React Native specific auth implementation using SecureStore for tokens
 */

import { createClient } from '@supabase/supabase-js';
import { AuthService } from '@shared/auth/auth-service';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '@shared/auth/auth-types';

/**
 * Custom storage adapter for React Native.
 * - Tokens → expo-secure-store (encrypted keychain / keystore)
 * - Non-sensitive data → AsyncStorage
 *
 * Implements the Supabase SupportedStorage interface.
 */
class ReactNativeStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      if (key.includes('token') || key.includes('auth')) {
        return await SecureStore.getItemAsync(key);
      }
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (key.includes('token') || key.includes('auth')) {
        await SecureStore.setItemAsync(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (key.includes('token') || key.includes('auth')) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  }
}

const rnStorage = new ReactNativeStorage();

// Initialize Supabase with React Native custom storage adapter
const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: rnStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // not applicable in RN
      storageKey: 'medical-platform-auth',
      flowType: 'pkce',
    },
    global: {
      headers: { 'x-app-name': 'medical-platform-mobile' },
    },
  }
);

// Create auth service instance
export const authService = new AuthService(supabase);

// Export storage for other uses
export const storage = rnStorage;

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
