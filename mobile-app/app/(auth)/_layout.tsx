import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.sand[50] },
        animation: 'slide_from_right',
      }}
    />
  );
}
