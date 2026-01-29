import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { Colors } from '../constants/Colors';
import { patientAuthService } from '../services/patient-auth.service';

interface PatientLoginScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  onForgotPassword: () => void;
}

export default function PatientLoginScreen({
  onBack,
  onSuccess,
  onForgotPassword,
}: PatientLoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return;
    }

    if (!password) {
      Alert.alert('Erreur', 'Veuillez entrer votre mot de passe');
      return;
    }

    setLoading(true);
    const { success, error } = await patientAuthService.signIn(email, password);
    setLoading(false);

    if (success) {
      onSuccess();
    } else {
      Alert.alert('Erreur', error || 'Email ou mot de passe incorrect');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.subtitle}>Connectez-vous a votre espace patient</Text>

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

        {/* Password */}
        <Text style={styles.label}>🔒 Mot de passe</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Votre mot de passe"
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

        {/* Remember me checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setRememberMe(!rememberMe)}
          disabled={loading}
        >
          <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
            {rememberMe && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Se souvenir de moi</Text>
        </TouchableOpacity>

        {/* Login button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.blanc} />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        {/* Forgot password */}
        <TouchableOpacity onPress={onForgotPassword} style={styles.linkContainer}>
          <Text style={styles.link}>Mot de passe oublie ?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blanc,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 24,
    left: 24,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.grisChaud,
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  checkmark: {
    color: Colors.blanc,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: Colors.charcoal,
  },
  button: {
    backgroundColor: Colors.teal,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.blanc,
    fontSize: 18,
    fontWeight: '600',
  },
  linkContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  link: {
    fontSize: 14,
    color: Colors.teal,
    textDecorationLine: 'underline',
  },
});
