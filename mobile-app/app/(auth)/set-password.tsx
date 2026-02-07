import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize } from '../../constants/theme';

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Minimum 8 caractères';
  if (!/[A-Z]/.test(password)) return 'Au moins une majuscule';
  if (!/[a-z]/.test(password)) return 'Au moins une minuscule';
  if (!/[0-9]/.test(password)) return 'Au moins un chiffre';
  return null;
}

export default function SetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    consultantId: string;
    consultantEmail: string;
    consultantName: string;
    tempToken: string;
  }>();

  const { register } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordError = password.length > 0 ? validatePassword(password) : null;
  const confirmError =
    confirmPassword.length > 0 && password !== confirmPassword
      ? 'Les mots de passe ne correspondent pas'
      : null;

  const canSubmit =
    password.length >= 8 &&
    !passwordError &&
    !confirmError &&
    password === confirmPassword;

  async function handleRegister() {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const result = await register({
        consultantId: params.consultantId,
        email: params.consultantEmail,
        password,
        tempToken: params.tempToken,
      });

      if (result.success) {
        router.replace('/(tabs)');
      } else {
        setError(result.error || "Erreur lors de la création du compte");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inattendue';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Créer votre mot de passe</Text>
          {params.consultantName ? (
            <Text style={styles.greeting}>
              Bienvenue, {params.consultantName}
            </Text>
          ) : null}
          <Text style={styles.description}>
            Choisissez un mot de passe sécurisé pour accéder à votre espace.
          </Text>

          <View style={styles.form}>
            <Input
              label="Mot de passe"
              placeholder="Votre mot de passe"
              isPassword
              value={password}
              onChangeText={setPassword}
              error={passwordError || undefined}
              autoCapitalize="none"
            />

            <Input
              label="Confirmer le mot de passe"
              placeholder="Confirmez votre mot de passe"
              isPassword
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={confirmError || undefined}
              autoCapitalize="none"
            />

            <View style={styles.requirements}>
              <Text style={styles.requirementTitle}>
                Le mot de passe doit contenir :
              </Text>
              <Requirement met={password.length >= 8} text="8 caractères minimum" />
              <Requirement met={/[A-Z]/.test(password)} text="Une lettre majuscule" />
              <Requirement met={/[a-z]/.test(password)} text="Une lettre minuscule" />
              <Requirement met={/[0-9]/.test(password)} text="Un chiffre" />
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <Button
              title="Créer mon compte"
              onPress={handleRegister}
              loading={loading}
              disabled={!canSubmit}
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

function Requirement({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={requirementStyles.row}>
      <Text style={[requirementStyles.indicator, met && requirementStyles.indicatorMet]}>
        {met ? '\u2713' : '\u2022'}
      </Text>
      <Text style={[requirementStyles.text, met && requirementStyles.textMet]}>
        {text}
      </Text>
    </View>
  );
}

const requirementStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  indicator: {
    fontSize: fontSize.sm,
    color: colors.neutral[400],
    width: 16,
  },
  indicatorMet: {
    color: colors.success,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
  },
  textMet: {
    color: colors.success,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sand[50],
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  greeting: {
    fontSize: fontSize.lg,
    color: colors.primary[700],
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  description: {
    fontSize: fontSize.md,
    color: colors.neutral[600],
    textAlign: 'center',
    lineHeight: 24,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.xs,
  },
  requirements: {
    backgroundColor: colors.sand[100],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  requirementTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
