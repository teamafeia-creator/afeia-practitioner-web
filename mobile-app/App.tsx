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

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
  };

  const handleLogout = () => {
    setOtpData(null);
    setCurrentScreen('welcome');
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
          onSuccess={() => setCurrentScreen('anamnese')}
        />
      )}
      {currentScreen === 'anamnese' && (
        <AnamneseScreen onComplete={() => setCurrentScreen('dashboard')} />
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
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE7' },
});
