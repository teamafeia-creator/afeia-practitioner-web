import { Stack } from 'expo-router';
import { Colors } from '../../constants/Colors';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.sable },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="anamnese" />
    </Stack>
  );
}
