import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, LoadingSpinner } from '../../components/ui';
import { Colors } from '../../constants/Colors';
import { validateEmail } from '../../utils/validation';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.error || '';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      console.log('✅ Login: Attempting login');
      await login(formData);

      console.log('✅ Login: Success');
      router.replace('/');
    } catch (err: any) {
      console.error('❌ Login: Failed', err);
      Alert.alert(
        'Erreur',
        err.response?.data?.message || 'Identifiants incorrects'
      );
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Mot de passe oublié',
      'Contactez votre naturopathe pour réinitialiser votre mot de passe.'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>

          <View style={styles.content}>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>
              Connectez-vous pour accéder à votre espace patient
            </Text>

            {/* Formulaire */}
            <View style={styles.form}>
              <Input
                label="Email"
                value={formData.email}
                onChangeText={value => handleChange('email', value)}
                type="email"
                placeholder="votre@email.com"
                error={errors.email}
                autoFocus
              />

              <Input
                label="Mot de passe"
                value={formData.password}
                onChangeText={value => handleChange('password', value)}
                type="password"
                placeholder="Votre mot de passe"
                error={errors.password}
              />

              {/* Mot de passe oublié */}
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>
                  Mot de passe oublié ?
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bouton */}
        <View style={styles.buttonContainer}>
          <Button
            title="Se connecter"
            onPress={handleLogin}
            variant="primary"
            fullWidth
            size="large"
            loading={isLoading}
          />

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/otp')}>
              <Text style={styles.registerLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading && <LoadingSpinner fullScreen overlay message="Connexion..." />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sable,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backText: {
    fontSize: 16,
    color: Colors.teal,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.grisChaud,
    marginBottom: 32,
    lineHeight: 24,
  },
  form: {
    gap: 8,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.teal,
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    gap: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: Colors.grisChaud,
  },
  registerLink: {
    fontSize: 14,
    color: Colors.teal,
    fontWeight: '600',
  },
});
