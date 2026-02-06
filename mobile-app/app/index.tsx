import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/ui/LoadingScreen';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/welcome');
    }
  }, [isAuthenticated, isLoading, router]);

  return <LoadingScreen message="AFEIA" />;
}
