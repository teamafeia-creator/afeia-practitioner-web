import './polyfill';
import { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import WelcomeScreen from './screens/WelcomeScreen';
import OTPScreen from './screens/OTPScreen';
import RegisterScreen from './screens/RegisterScreen';
import AnamneseScreen from './screens/AnamneseScreen';
import DashboardScreen from './screens/DashboardScreen';
import JournalScreen from './screens/JournalScreen';
import MessagesScreen from './screens/MessagesScreen';
import ProfileScreen from './screens/ProfileScreen';

type Screen = 'welcome' | 'otp' | 'register' | 'anamnese' | 'dashboard' | 'journal' | 'messages' | 'profile';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [otpData, setOtpData] = useState<any>(null);
  // Track if user has anamnesis (used for optional access from profile)
  const [hasAnamnesis, setHasAnamnesis] = useState(false);

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
  };

  const handleLogout = () => {
    setOtpData(null);
    setHasAnamnesis(false);
    setCurrentScreen('welcome');
  };

  // Handle registration success - anamnesis is now OPTIONAL
  // User goes directly to dashboard and can fill anamnesis later from profile
  const handleRegistrationSuccess = (needsAnamnese: boolean) => {
    setHasAnamnesis(!needsAnamnese);
    // Go directly to dashboard - anamnesis is no longer mandatory
    setCurrentScreen('dashboard');
  };

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
        <RegisterScreen
          otpData={otpData}
          onSuccess={handleRegistrationSuccess}
        />
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
      {currentScreen === 'dashboard' && (
        <DashboardScreen onNavigate={handleNavigate} />
      )}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE7' },
});
