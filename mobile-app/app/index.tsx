/**
 * Entry Point - Routing Logic
 * Redirects based on auth state
 */

import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/ui';

export default function Index() {
  const { isLoading, isAuthenticated, needsAnamnese } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Bienvenue chez AFEIA" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (needsAnamnese) {
    return <Redirect href="/(onboarding)/anamnese" />;
  }

  return <Redirect href="/(tabs)" />;
}
