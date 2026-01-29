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
import { supabase } from '../lib/supabase';

interface PatientActivateScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function PatientActivateScreen({
  onBack,
  onSuccess,
}: PatientActivateScreenProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const codeInputs = useRef<(TextInput | null)[]>([]);

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
  };

  const handleCodeKeyPress = (index: number, key: string) => {
    // Handle backspace to go to previous input
    if (key === 'Backspace' && !code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  // Debug function to reset test account (DEV only)
  const handleDebugReset = async () => {
    if (!__DEV__) return;

    const testEmail = email.trim().toLowerCase() || 'team.afeia@gmail.com';

    Alert.alert(
      '⚠️ DEBUG: Reset compte',
      `Supprimer le compte ${testEmail} et créer un nouveau code 123456 ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              console.log(`🔧 DEBUG: Reset compte ${testEmail}`);

              // Delete old OTP codes for this email
              const { error: otpDeleteError } = await supabase
                .from('otp_codes')
                .delete()
                .eq('email', testEmail);

              if (otpDeleteError) {
                console.log('⚠️ Erreur suppression OTP:', otpDeleteError);
              }

              // Create a new test code
              const { error: insertError } = await supabase
                .from('otp_codes')
                .insert({
                  email: testEmail,
                  code: '123456',
                  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
                });

              if (insertError) {
                console.error('❌ Erreur création code:', insertError);
                Alert.alert('Erreur', insertError.message);
              } else {
                console.log('✅ Code test créé: 123456');
                // Pre-fill the code
                setCode(['1', '2', '3', '4', '5', '6']);
                setEmail(testEmail);
                Alert.alert(
                  '✅ Reset effectué',
                  `Email: ${testEmail}\nCode: 123456\n\nNote: Si un compte Auth existe déjà, supprimez-le via Supabase Dashboard.`
                );
              }
            } catch (err) {
              console.error('❌ Exception reset:', err);
              Alert.alert('Erreur', String(err));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleActivate = async () => {
    const codeString = code.join('');

    // Validations
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return;
    }

    if (codeString.length !== 6) {
      Alert.alert('Erreur', 'Le code doit contenir 6 chiffres');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    const { success, error } = await patientAuthService.activateAccount(
      email,
      codeString,
      password
    );
    setLoading(false);

    if (success) {
      Alert.alert('Succes', 'Compte active avec succes!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } else {
      Alert.alert('Erreur', error || 'Une erreur est survenue');
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
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Activez votre compte</Text>
        <Text style={styles.subtitle}>Entrez le code recu par email</Text>

        {/* Email */}
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

        {/* 6-digit code */}
        <Text style={styles.label}>🔐 Code d'activation (6 chiffres)</Text>
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

        {/* Password */}
        <Text style={styles.label}>🔒 Creer un mot de passe</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Min. 8 caracteres"
            placeholderTextColor={Colors.grisChaud}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.showPasswordButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.showPasswordText}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        {/* Confirm Password */}
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
              password.length >= 8 && styles.requirementMet,
            ]}
          >
            {password.length >= 8 ? '✓' : '○'} Minimum 8 caracteres
          </Text>
          <Text
            style={[
              styles.requirement,
              password === confirmPassword && password.length > 0 && styles.requirementMet,
            ]}
          >
            {password === confirmPassword && password.length > 0 ? '✓' : '○'} Mots de
            passe identiques
          </Text>
        </View>

        {/* Activate button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleActivate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.blanc} />
          ) : (
            <Text style={styles.buttonText}>Activer mon compte</Text>
          )}
        </TouchableOpacity>

        {/* Note */}
        <Text style={styles.note}>Code non recu ? Contactez votre praticien</Text>

        {/* Debug button - DEV only */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.debugButton}
            onPress={handleDebugReset}
            disabled={loading}
          >
            <Text style={styles.debugButtonText}>
              🔧 DEBUG: Reset compte test
            </Text>
          </TouchableOpacity>
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
    marginBottom: 8,
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
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.blanc,
    fontSize: 18,
    fontWeight: '600',
  },
  note: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.grisChaud,
    marginTop: 16,
  },
  debugButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 12,
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#DC2626',
    borderStyle: 'dashed',
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
