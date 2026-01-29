import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors } from '../constants/Colors';
import { useAuthContext } from '../contexts/AuthContext';

type RegisterScreenProps = {
  otpData: Record<string, unknown> | null;
  onSuccess: (needsAnamnese: boolean) => void;
};

export default function RegisterScreen({ otpData, onSuccess }: RegisterScreenProps) {
  const { signUp, signIn } = useAuthContext();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(false);

  const email = (otpData?.email as string) || 'team.afeia@gmail.com';
  const patientId = (otpData?.patientId as string) || '';

  const handleRegister = async () => {
    if (password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Login existing user
        console.log('📊 Logging in:', email);
        const result = await signIn(email, password);

        if (!result.success) {
          Alert.alert('Erreur', result.error || 'Impossible de se connecter');
          setLoading(false);
          return;
        }

        console.log('✅ Login successful');
      } else {
        // Register new user
        console.log('📊 Registering:', email);
        const result = await signUp(email, password, {
          patient_id: patientId,
        });

        if (!result.success) {
          // If user already exists, suggest login
          if (result.error?.includes('already registered')) {
            Alert.alert(
              'Compte existant',
              'Un compte existe déjà avec cette adresse email. Voulez-vous vous connecter ?',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Se connecter',
                  onPress: () => setIsLogin(true),
                },
              ]
            );
            setLoading(false);
            return;
          }

          Alert.alert('Erreur', result.error || 'Impossible de créer le compte');
          setLoading(false);
          return;
        }

        console.log('✅ Registration successful');
      }

      // Success - navigate to dashboard
      // Pass false = anamnesis not strictly required (can be filled optionally later)
      onSuccess(false);
    } catch (error) {
      console.error('❌ Auth error:', error);
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isLogin ? 'Connectez-vous' : 'Créez votre compte'}
      </Text>
      <Text style={styles.subtitle}>Email : {email}</Text>

      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Mot de passe"
        secureTextEntry
        autoCapitalize="none"
      />

      {!isLogin && (
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirmer le mot de passe"
          secureTextEntry
          autoCapitalize="none"
        />
      )}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading
            ? isLogin
              ? 'Connexion...'
              : 'Création...'
            : isLogin
            ? 'Se connecter'
            : 'Créer mon compte'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switchButton}
        onPress={() => {
          setIsLogin(!isLogin);
          setConfirmPassword('');
        }}
      >
        <Text style={styles.switchButtonText}>
          {isLogin
            ? "Je n'ai pas de compte - Créer un compte"
            : "J'ai déjà un compte - Se connecter"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.sable,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.charcoal,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.charcoal,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: Colors.blanc,
    borderWidth: 1,
    borderColor: Colors.teal,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.dore,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.blanc,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  switchButton: {
    marginTop: 20,
    padding: 10,
  },
  switchButtonText: {
    color: Colors.teal,
    fontSize: 14,
    textAlign: 'center',
  },
});
