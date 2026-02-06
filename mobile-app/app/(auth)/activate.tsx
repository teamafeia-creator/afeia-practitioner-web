import React, { useState } from 'react';
import { View, Text, StyleSheet, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OTPInput } from '../../components/ui/OTPInput';
import { Button } from '../../components/ui/Button';
import { verifyOtp } from '../../services/auth';
import { colors, spacing, fontSize } from '../../constants/theme';

export default function ActivateScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (code.length !== 6) {
      setError('Veuillez entrer les 6 chiffres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await verifyOtp(code);

      if (result.valid) {
        router.push({
          pathname: '/(auth)/set-password',
          params: {
            patientId: result.patientId || '',
            patientEmail: result.patientEmail || '',
            patientName: result.patientName || '',
            tempToken: result.tempToken || '',
          },
        });
      } else {
        setError('Code invalide. Vérifiez le code reçu par email.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de vérification';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Activation du compte</Text>
          <Text style={styles.description}>
            Entrez le code à 6 chiffres que vous avez reçu par email de votre
            naturopathe.
          </Text>

          <View style={styles.otpContainer}>
            <OTPInput
              value={code}
              onChange={(value) => {
                setCode(value);
                setError(null);
              }}
              error={error || undefined}
            />
          </View>

          <Button
            title="Vérifier le code"
            onPress={handleVerify}
            loading={loading}
            disabled={code.length !== 6}
            fullWidth
            size="lg"
          />
        </View>

        <View style={styles.footer}>
          <Button
            title="Retour"
            onPress={() => router.back()}
            variant="ghost"
          />
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sand[50],
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.neutral[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  otpContainer: {
    marginBottom: spacing.xl,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
});
