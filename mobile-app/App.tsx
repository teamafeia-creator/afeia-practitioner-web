import './polyfill';
import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import WelcomeScreen from './screens/WelcomeScreen';
import OTPScreen from './screens/OTPScreen';
import RegisterScreen from './screens/RegisterScreen';
import AnamneseScreen from './screens/AnamneseScreen';
import DashboardScreen from './screens/DashboardScreen';
import JournalScreen from './screens/JournalScreen';
import MessagesScreen from './screens/MessagesScreen';
import ProfileScreen from './screens/ProfileScreen';
import { Colors } from './constants/Colors';

type Screen =
  | 'welcome'
  | 'otp'
  | 'register'
  | 'anamnese'
  | 'dashboard'
  | 'journal'
  | 'messages'
  | 'profile'
  | 'login';

function AppContent() {
  const { user, loading, isAuthenticated, signOut } = useAuthContext();
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [otpData, setOtpData] = useState<Record<string, unknown> | null>(null);
  const [hasAnamnesis, setHasAnamnesis] = useState(false);

  // Auto-navigate based on auth state
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        console.log('✅ User authenticated, navigating to dashboard');
        setCurrentScreen('dashboard');
      } else {
        console.log('⚠️ User not authenticated, showing welcome');
        setCurrentScreen('welcome');
      }
    }
  }, [isAuthenticated, loading]);

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
  };

  const handleLogout = async () => {
    await signOut();
    setOtpData(null);
    setHasAnamnesis(false);
    setCurrentScreen('welcome');
  };

  const handleRegistrationSuccess = (needsAnamnese: boolean) => {
    setHasAnamnesis(!needsAnamnese);
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
      {currentScreen === 'welcome' && (
        <WelcomeScreen onNext={() => setCurrentScreen('otp')} />
      )}
      {currentScreen === 'otp' && (
        <OTPScreen
          onSuccess={(data) => {
            setOtpData(data);
            setCurrentScreen('register');
          }}
        />
      )}
      {currentScreen === 'register' && (
        <RegisterScreen otpData={otpData} onSuccess={handleRegistrationSuccess} />
      )}
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
