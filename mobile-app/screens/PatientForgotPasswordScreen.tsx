import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useState, useRef } from 'react';
import { Colors } from '../constants/Colors';
import { patientAuthService } from '../services/patient-auth.service';

type Step = 'email' | 'code' | 'password';

interface PatientForgotPasswordScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function PatientForgotPasswordScreen({
  onBack,
  onSuccess,
}: PatientForgotPasswordScreenProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const codeInputs = useRef<(TextInput | null)[]>([]);

  const handleRequestCode = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return;
    }

    setLoading(true);
    const result = await patientAuthService.requestPasswordReset(email);
    setLoading(false);

    if (result.success) {
      if (result.devCode) {
        // In dev mode, show the code
        setDevCode(result.devCode);
        Alert.alert(
          'Code de test',
          `Code (DEV): ${result.devCode}\n\nUtilisez ce code pour tester.`,
          [{ text: 'OK', onPress: () => setStep('code') }]
        );
      } else {
        Alert.alert('Succes', 'Un code a ete envoye a votre email', [
          { text: 'OK', onPress: () => setStep('code') },
        ]);
      }
    } else {
      Alert.alert('Erreur', result.error || 'Une erreur est survenue');
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      codeInputs.current[index + 1]?.focus();
    }

    // Auto-advance to password step when code is complete
    if (newCode.every((d) => d) && index === 5) {
      setTimeout(() => setStep('password'), 300);
    }
  };

  const handleCodeKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  const handleResetPassword = async () => {
    const codeString = code.join('');

    if (!newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    const { success, error } = await patientAuthService.resetPassword(
      email,
      codeString,
      newPassword
    );
    setLoading(false);

    if (success) {
      Alert.alert(
        'Succes',
        error || 'Mot de passe reinitialise! Vous pouvez maintenant vous connecter.',
        [{ text: 'OK', onPress: onSuccess }]
      );
    } else {
      Alert.alert('Erreur', error || 'Une erreur est survenue');
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    const result = await patientAuthService.requestPasswordReset(email);
    setLoading(false);

    if (result.success) {
      if (result.devCode) {
        setDevCode(result.devCode);
        Alert.alert('Code renvoye', `Nouveau code (DEV): ${result.devCode}`);
      } else {
        Alert.alert('Succes', 'Un nouveau code a ete envoye');
      }
    } else {
      Alert.alert('Erreur', result.error || 'Impossible de renvoyer le code');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={step === 'email' ? onBack : () => setStep('email')}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        {/* STEP 1: Email */}
        {step === 'email' && (
          <>
            <Text style={styles.title}>Mot de passe oublie</Text>
            <Text style={styles.subtitle}>
              Entrez votre email pour recevoir un code de reinitialisation
            </Text>

            <Text style={styles.label}>📧 Email</Text>
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              placeholderTextColor={Colors.grisChaud}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRequestCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.blanc} />
              ) : (
                <Text style={styles.buttonText}>Recevoir un code</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.note}>
              Vous recevrez un code par email pour reinitialiser votre mot de passe
            </Text>
          </>
        )}

        {/* STEP 2: Code */}
        {step === 'code' && (
          <>
            <Text style={styles.title}>Entrez le code</Text>
            <Text style={styles.subtitle}>Code envoye a {email}</Text>

            {devCode && (
              <View style={styles.devCodeContainer}>
                <Text style={styles.devCodeLabel}>Code de test:</Text>
                <Text style={styles.devCodeValue}>{devCode}</Text>
              </View>
            )}

            <Text style={styles.label}>🔐 Code de reinitialisation</Text>
            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    codeInputs.current[index] = ref;
                  }}
                  style={styles.codeInput}
                  value={digit}
                  onChangeText={(value) => handleCodeChange(index, value)}
                  onKeyPress={({ nativeEvent }) =>
                    handleCodeKeyPress(index, nativeEvent.key)
                  }
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!loading}
                />
              ))}
            </View>

            <TouchableOpacity onPress={handleResendCode} disabled={loading}>
              <Text style={styles.link}>Renvoyer le code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => setStep('password')}
            >
              <Text style={styles.buttonTextSecondary}>Continuer</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 3: New Password */}
        {step === 'password' && (
          <>
            <Text style={styles.title}>Nouveau mot de passe</Text>
            <Text style={styles.subtitle}>Choisissez un nouveau mot de passe securise</Text>

            <Text style={styles.label}>🔒 Nouveau mot de passe</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Min. 8 caracteres"
                placeholderTextColor={Colors.grisChaud}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.showPasswordText}>
                  {showPassword ? '🙈' : '👁'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>🔒 Confirmer le mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="Retapez votre mot de passe"
              placeholderTextColor={Colors.grisChaud}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />

            {/* Password requirements */}
            <View style={styles.requirements}>
              <Text
                style={[
                  styles.requirement,
                  newPassword.length >= 8 && styles.requirementMet,
                ]}
              >
                {newPassword.length >= 8 ? '✓' : '○'} Minimum 8 caracteres
              </Text>
              <Text
                style={[
                  styles.requirement,
                  newPassword === confirmPassword &&
                    newPassword.length > 0 &&
                    styles.requirementMet,
                ]}
              >
                {newPassword === confirmPassword && newPassword.length > 0 ? '✓' : '○'}{' '}
                Mots de passe identiques
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.blanc} />
              ) : (
                <Text style={styles.buttonText}>Reinitialiser</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blanc,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  backButton: {
    marginBottom: 24,
  },
  backText: {
    fontSize: 16,
    color: Colors.teal,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.charcoal,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.grisChaud,
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.charcoal,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.grisChaud,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: Colors.sable,
    color: Colors.charcoal,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grisChaud,
    borderRadius: 12,
    backgroundColor: Colors.sable,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: Colors.charcoal,
  },
  showPasswordButton: {
    padding: 16,
  },
  showPasswordText: {
    fontSize: 20,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
  },
  codeInput: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: Colors.teal,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: Colors.sable,
    color: Colors.charcoal,
  },
  devCodeContainer: {
    backgroundColor: Colors.dore + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devCodeLabel: {
    fontSize: 14,
    color: Colors.charcoal,
    marginRight: 8,
  },
  devCodeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dore,
    letterSpacing: 4,
  },
  requirements: {
    marginTop: 16,
    marginBottom: 8,
  },
  requirement: {
    fontSize: 12,
    color: Colors.grisChaud,
    marginBottom: 4,
  },
  requirementMet: {
    color: Colors.teal,
  },
  button: {
    backgroundColor: Colors.teal,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonSecondary: {
    backgroundColor: Colors.sable,
    borderWidth: 2,
    borderColor: Colors.teal,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.blanc,
    fontSize: 18,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: Colors.teal,
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    textAlign: 'center',
    fontSize: 14,
    color: Colors.teal,
    textDecorationLine: 'underline',
  },
  note: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.grisChaud,
    marginTop: 24,
  },
});
