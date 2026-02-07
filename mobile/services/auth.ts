/**
 * Mobile Auth Service
 * React Native specific auth implementation
 */

import { initializeSupabase } from '@shared/auth/supabase-client';
import { AuthService } from '@shared/auth/auth-service';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@shared/auth/constants';

// Custom storage implementation for React Native
class ReactNativeStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      // Try secure storage first for sensitive data
      if (key.includes('token')) {
        return await SecureStore.getItemAsync(key);
      }
      // Use AsyncStorage for non-sensitive data
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (key.includes('token')) {
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
      if (key.includes('token')) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  }
}

// Initialize Supabase with React Native storage
const supabase = initializeSupabase({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
});

// Create auth service instance
export const authService = new AuthService(supabase);

// Export storage for other uses
export const storage = new ReactNativeStorage();

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
