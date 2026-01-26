import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/Colors';

// Écran de redirection initial
export default function Index() {
  const { isAuthenticated, isInitialized, user } = useAuth();

  useEffect(() => {
    console.log('✅ Index: Checking auth state', {
      isInitialized,
      isAuthenticated,
      hasUser: !!user,
      anamneseComplete: user?.anamneseComplete,
    });
  }, [isInitialized, isAuthenticated, user]);

  // Attendre l'initialisation
  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.teal} />
      </View>
    );
  }

  // Rediriger selon l'état d'authentification
  if (!isAuthenticated) {
    console.log('✅ Index: Redirecting to welcome');
    return <Redirect href="/(auth)/welcome" />;
  }

  // Si l'utilisateur n'a pas complété l'anamnèse
  if (user && !user.anamneseComplete) {
    console.log('✅ Index: Redirecting to anamnese');
    return <Redirect href="/(onboarding)/anamnese" />;
  }

  // Sinon, rediriger vers le dashboard
  console.log('✅ Index: Redirecting to dashboard');
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.sable,
  },
});
