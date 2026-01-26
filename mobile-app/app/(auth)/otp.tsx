/**
 * OTP Verification Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OTPInput, Button } from '@/components/ui';
import { authApi, formatApiError } from '@/services/api';
import { Colors, Theme, Spacing, TextStyles } from '@/constants';

export default function OTPScreen() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Veuillez entrer un code à 6 chiffres');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.verifyOTP(code);

      if (response.valid) {
        // Navigate to register screen with patient info
        router.push({
          pathname: '/(auth)/register',
          params: {
            patientId: response.patientId,
            tempToken: response.tempToken,
            email: response.patientEmail,
            name: response.patientName,
          },
        });
      } else {
        setError('Code invalide ou expiré');
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleHelp = () => {
    Alert.alert(
      "Besoin d'aide ?",
      "Si vous n'avez pas reçu votre code, veuillez contacter votre naturopathe ou écrire à support@afeia.com",
      [{ text: 'Compris' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Theme.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={48} color={Colors.primary.teal} />
          </View>

          <Text style={styles.title}>Entrez votre code d'accès</Text>
          <Text style={styles.subtitle}>
            Votre naturopathe vous a envoyé un code à 6 chiffres par email.
          </Text>

          <View style={styles.otpContainer}>
            <OTPInput value={code} onChange={setCode} error={error || undefined} />
          </View>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleVerify}
            isLoading={isLoading}
            isDisabled={code.length !== 6}
          >
            Vérifier le code
          </Button>

          <TouchableOpacity onPress={handleHelp} style={styles.helpButton}>
            <Text style={styles.helpText}>Je n'ai pas reçu de code</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...TextStyles.h3,
    color: Theme.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    ...TextStyles.body,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  otpContainer: {
    marginBottom: Spacing['2xl'],
  },
  helpButton: {
    alignSelf: 'center',
    marginTop: Spacing.lg,
    padding: Spacing.sm,
  },
  helpText: {
    ...TextStyles.body,
    color: Colors.primary.teal,
  },
});
