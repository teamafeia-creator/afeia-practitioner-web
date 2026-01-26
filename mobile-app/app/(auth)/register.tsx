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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, LoadingSpinner } from '../../components/ui';
import { Colors } from '../../constants/Colors';
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
} from '../../utils/validation';

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; inviteCode?: string }>();
  const { register, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: params.email || '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ
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

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.error || '';
    }

    const confirmValidation = validatePasswordConfirm(
      formData.password,
      formData.confirmPassword
    );
    if (!confirmValidation.valid) {
      newErrors.confirmPassword = confirmValidation.error || '';
    }

    if (!formData.acceptTerms) {
      newErrors.terms = 'Vous devez accepter les CGU';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      console.log('✅ Register: Creating account');
      await register({
        email: formData.email,
        password: formData.password,
        inviteCode: params.inviteCode || '',
      });

      console.log('✅ Register: Account created successfully');
      // La redirection sera gérée par le AuthContext
      router.replace('/');
    } catch (err: any) {
      console.error('❌ Register: Failed', err);
      Alert.alert(
        'Erreur',
        err.response?.data?.message || 'Erreur lors de la création du compte'
      );
    }
  };

  const handleBack = () => {
    router.back();
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
            <Text style={styles.title}>Créer votre compte</Text>
            <Text style={styles.subtitle}>
              Renseignez vos informations pour commencer votre accompagnement
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
                autoFocus={!params.email}
                editable={!params.email}
              />

              <Input
                label="Mot de passe"
                value={formData.password}
                onChangeText={value => handleChange('password', value)}
                type="password"
                placeholder="Minimum 8 caractères"
                error={errors.password}
                helper="Au moins 8 caractères, 1 majuscule, 1 minuscule et 1 chiffre"
              />

              <Input
                label="Confirmer le mot de passe"
                value={formData.confirmPassword}
                onChangeText={value => handleChange('confirmPassword', value)}
                type="password"
                placeholder="Répétez le mot de passe"
                error={errors.confirmPassword}
              />

              {/* Checkbox CGU */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => handleChange('acceptTerms', !formData.acceptTerms)}
              >
                <View
                  style={[
                    styles.checkbox,
                    formData.acceptTerms && styles.checkboxChecked,
                  ]}
                >
                  {formData.acceptTerms && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkboxLabel}>
                  J'accepte les{' '}
                  <Text style={styles.link}>Conditions Générales d'Utilisation</Text>
                  {' '}et la{' '}
                  <Text style={styles.link}>Politique de Confidentialité</Text>
                </Text>
              </TouchableOpacity>
              {errors.terms && (
                <Text style={styles.errorText}>{errors.terms}</Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Bouton */}
        <View style={styles.buttonContainer}>
          <Button
            title="Créer mon compte"
            onPress={handleRegister}
            variant="primary"
            fullWidth
            size="large"
            loading={isLoading}
          />
        </View>

        {isLoading && <LoadingSpinner fullScreen overlay message="Création en cours..." />}
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.grisChaud,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.blanc,
  },
  checkboxChecked: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  checkmark: {
    color: Colors.blanc,
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.charcoal,
    lineHeight: 20,
  },
  link: {
    color: Colors.teal,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
  },
});
