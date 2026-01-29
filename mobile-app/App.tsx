import './polyfill';
import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
// New Patient Auth Screens
import PatientWelcomeScreen from './screens/PatientWelcomeScreen';
import PatientActivateScreen from './screens/PatientActivateScreen';
import PatientLoginScreen from './screens/PatientLoginScreen';
import PatientForgotPasswordScreen from './screens/PatientForgotPasswordScreen';
// App Screens
import AnamneseScreen from './screens/AnamneseScreen';
import DashboardScreen from './screens/DashboardScreen';
import JournalScreen from './screens/JournalScreen';
import MessagesScreen from './screens/MessagesScreen';
import PlansScreen from './screens/PlansScreen';
import ProfileScreen from './screens/ProfileScreen';
import { Colors } from './constants/Colors';

type Screen =
  | 'patient-welcome'
  | 'patient-activate'
  | 'patient-login'
  | 'patient-forgot-password'
  | 'anamnese'
  | 'dashboard'
  | 'journal'
  | 'messages'
  | 'plans'
  | 'profile';

function AppContent() {
  const { user, loading, isAuthenticated, signOut } = useAuthContext();
  const [currentScreen, setCurrentScreen] = useState<Screen>('patient-welcome');
  const [hasAnamnesis, setHasAnamnesis] = useState(false);

  // Auto-navigate based on auth state
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        console.log('✅ User authenticated, navigating to dashboard');
        setCurrentScreen('dashboard');
      } else {
        console.log('⚠️ User not authenticated, showing patient welcome');
        setCurrentScreen('patient-welcome');
      }
    }
  }, [isAuthenticated, loading]);

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
  };

  const handleLogout = async () => {
    await signOut();
    setHasAnamnesis(false);
    setCurrentScreen('patient-welcome');
  };

  const handleAuthSuccess = () => {
    console.log('✅ Authentication successful, navigating to dashboard');
    setCurrentScreen('dashboard');
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.teal} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Patient Auth Screens */}
      {currentScreen === 'patient-welcome' && (
        <PatientWelcomeScreen
          onActivate={() => setCurrentScreen('patient-activate')}
          onLogin={() => setCurrentScreen('patient-login')}
          onForgotPassword={() => setCurrentScreen('patient-forgot-password')}
        />
      )}
      {currentScreen === 'patient-activate' && (
        <PatientActivateScreen
          onBack={() => setCurrentScreen('patient-welcome')}
          onSuccess={handleAuthSuccess}
        />
      )}
      {currentScreen === 'patient-login' && (
        <PatientLoginScreen
          onBack={() => setCurrentScreen('patient-welcome')}
          onSuccess={handleAuthSuccess}
          onForgotPassword={() => setCurrentScreen('patient-forgot-password')}
        />
      )}
      {currentScreen === 'patient-forgot-password' && (
        <PatientForgotPasswordScreen
          onBack={() => setCurrentScreen('patient-welcome')}
          onSuccess={() => setCurrentScreen('patient-login')}
        />
      )}

      {/* App Screens */}
      {currentScreen === 'anamnese' && (
        <AnamneseScreen
          onComplete={() => {
            setHasAnamnesis(true);
            setCurrentScreen('dashboard');
          }}
          onSkip={() => setCurrentScreen('dashboard')}
        />
      )}
      {currentScreen === 'dashboard' && <DashboardScreen onNavigate={handleNavigate} />}
      {currentScreen === 'journal' && (
        <JournalScreen onBack={() => setCurrentScreen('dashboard')} />
      )}
      {currentScreen === 'messages' && (
        <MessagesScreen onBack={() => setCurrentScreen('dashboard')} />
      )}
      {currentScreen === 'plans' && (
        <PlansScreen onBack={() => setCurrentScreen('dashboard')} />
      )}
      {currentScreen === 'profile' && (
        <ProfileScreen
          onBack={() => setCurrentScreen('dashboard')}
          onLogout={handleLogout}
          onEditAnamnese={() => setCurrentScreen('anamnese')}
          hasAnamnesis={hasAnamnesis}
        />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sable,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.sable,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.charcoal,
  },
});
