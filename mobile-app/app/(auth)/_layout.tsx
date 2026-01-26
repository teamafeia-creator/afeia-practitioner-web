/**
 * Auth Stack Layout
 */

import { Stack } from 'expo-router';
import { Colors } from '@/constants';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.neutral.white },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="register" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
