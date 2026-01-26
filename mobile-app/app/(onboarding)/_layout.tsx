/**
 * Onboarding Layout
 */

import { Stack } from 'expo-router';
import { Colors } from '@/constants';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.neutral.white },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="anamnese" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
