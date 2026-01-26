/**
 * Login Screen
 * For existing users
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { Input, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { formatApiError } from '@/services/api';
import { Colors, Theme, Spacing, TextStyles } from '@/constants';

interface FormData {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await login(data);
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

  const handleForgotPassword = () => {
    // TODO: Implement forgot password
    router.push('/(auth)/otp');
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
          {/* Logo */}
          <View style={styles.logoSection}>
            <Text style={styles.logoText}>AFEIA</Text>
          </View>

          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>
              Accédez à votre espace personnel
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
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Mot de passe"
                  placeholder="••••••••"
                  isPassword
                  autoCapitalize="none"
                  autoComplete="password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  leftIcon={
                    <Ionicons name="lock-closed-outline" size={20} color={Colors.neutral.grayWarm} />
                  }
                />
              )}
            />

            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
              style={styles.submitButton}
            >
              Se connecter
            </Button>
          </View>

          {/* Register Link */}
          <View style={styles.registerSection}>
            <Text style={styles.registerText}>
              Vous n'avez pas encore de compte ?
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/otp')}>
              <Text style={styles.registerLink}>Créer un compte avec mon code</Text>
            </TouchableOpacity>
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
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary.teal,
    letterSpacing: 3,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...TextStyles.h2,
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotText: {
    ...TextStyles.bodySmall,
    color: Colors.primary.teal,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  registerSection: {
    alignItems: 'center',
    marginTop: Spacing['2xl'],
  },
  registerText: {
    ...TextStyles.body,
    color: Theme.textSecondary,
    marginBottom: Spacing.xs,
  },
  registerLink: {
    ...TextStyles.body,
    color: Colors.primary.teal,
    fontWeight: '600',
  },
});
