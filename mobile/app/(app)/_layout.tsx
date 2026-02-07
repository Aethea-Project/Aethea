import { Stack } from 'expo-router';
import { AuthProvider } from '../../contexts/AuthProvider';

export default function AppLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="lab-results/index" />
        <Stack.Screen name="lab-results/[id]" />
        <Stack.Screen name="scans/index" />
        <Stack.Screen name="scans/[id]" />
      </Stack>
    </AuthProvider>
  );
}
