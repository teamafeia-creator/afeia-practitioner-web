import { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import WelcomeScreen from './screens/WelcomeScreen';
import OTPScreen from './screens/OTPScreen';
import RegisterScreen from './screens/RegisterScreen';
import AnamneseScreen from './screens/AnamneseScreen';
import DashboardScreen from './screens/DashboardScreen';

type Screen = 'welcome' | 'otp' | 'register' | 'anamnese' | 'dashboard';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [otpData, setOtpData] = useState<any>(null);

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
      {currentScreen === 'dashboard' && <DashboardScreen />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE7' },
});
