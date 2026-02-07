/**
 * Root Layout - Mobile App Entry Point
 * Wraps entire app with AuthProvider
 */

import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
