/**
 * Register Screen
 * Create account after OTP verification
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { Input, Button, Checkbox } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { formatApiError } from '@/services/api';
import { Colors, Theme, Spacing, TextStyles } from '@/constants';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export default function RegisterScreen() {
  const { patientId, tempToken, email: prefilledEmail, name } = useLocalSearchParams<{
    patientId: string;
    tempToken: string;
    email: string;
    name: string;
  }>();

  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      email: prefilledEmail || '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const password = watch('password');

  const validatePassword = (value: string) => {
    if (value.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caractères';
    }
    if (!/[A-Z]/.test(value)) {
      return 'Le mot de passe doit contenir au moins une majuscule';
    }
    if (!/[a-z]/.test(value)) {
      return 'Le mot de passe doit contenir au moins une minuscule';
    }
    if (!/[0-9]/.test(value)) {
      return 'Le mot de passe doit contenir au moins un chiffre';
    }
    return true;
  };

  const onSubmit = async (data: FormData) => {
    if (!patientId || !tempToken) {
      setError('Session invalide. Veuillez recommencer.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await register({
        patientId,
        tempToken,
        email: data.email,
        password: data.password,
      });

      // Navigation is handled by AuthContext
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
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

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={styles.titleSection}>
            {name && (
              <Text style={styles.welcomeText}>Bienvenue {name.split(' ')[0]} !</Text>
            )}
            <Text style={styles.title}>Créez votre compte sécurisé</Text>
            <Text style={styles.subtitle}>
              Vous pourrez ensuite accéder à votre espace personnel AFEIA.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={Colors.state.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Controller
              control={control}
              name="email"
              rules={{
                required: 'L\'email est requis',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Adresse email invalide',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="votre@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  editable={!prefilledEmail}
                  leftIcon={
                    <Ionicons name="mail-outline" size={20} color={Colors.neutral.grayWarm} />
                  }
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              rules={{
                required: 'Le mot de passe est requis',
                validate: validatePassword,
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Mot de passe"
                  placeholder="••••••••"
                  isPassword
                  autoCapitalize="none"
                  autoComplete="password-new"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  hint="8 caractères min., 1 majuscule, 1 minuscule, 1 chiffre"
                  leftIcon={
                    <Ionicons name="lock-closed-outline" size={20} color={Colors.neutral.grayWarm} />
                  }
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              rules={{
                required: 'Veuillez confirmer le mot de passe',
                validate: (value) =>
                  value === password || 'Les mots de passe ne correspondent pas',
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirmer le mot de passe"
                  placeholder="••••••••"
                  isPassword
                  autoCapitalize="none"
                  autoComplete="password-new"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                  leftIcon={
                    <Ionicons name="lock-closed-outline" size={20} color={Colors.neutral.grayWarm} />
                  }
                />
              )}
            />

            <Controller
              control={control}
              name="acceptTerms"
              rules={{
                validate: (value) =>
                  value === true || 'Vous devez accepter les conditions d\'utilisation',
              }}
              render={({ field: { onChange, value } }) => (
                <View style={styles.termsContainer}>
                  <Checkbox
                    checked={value}
                    onChange={onChange}
                    label="J'accepte les conditions générales d'utilisation et la politique de confidentialité"
                  />
                  {errors.acceptTerms && (
                    <Text style={styles.fieldError}>{errors.acceptTerms.message}</Text>
                  )}
                </View>
              )}
            />

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
              style={styles.submitButton}
            >
              Créer mon compte
            </Button>
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  titleSection: {
    marginBottom: Spacing.xl,
  },
  welcomeText: {
    ...TextStyles.h4,
    color: Colors.primary.teal,
    marginBottom: Spacing.sm,
  },
  title: {
    ...TextStyles.h3,
    color: Theme.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...TextStyles.body,
    color: Theme.textSecondary,
  },
  form: {},
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.state.errorLight,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.base,
  },
  errorText: {
    ...TextStyles.bodySmall,
    color: Colors.state.error,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  termsContainer: {
    marginBottom: Spacing.lg,
  },
  fieldError: {
    ...TextStyles.bodySmall,
    color: Colors.state.error,
    marginTop: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
});
