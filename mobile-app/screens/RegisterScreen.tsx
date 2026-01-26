import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors } from '../constants/Colors';

export default function RegisterScreen({ otpData, onSuccess }: any) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    // BYPASS API POUR TESTER
    console.log('Compte créé pour:', otpData?.email);
    onSuccess();
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Créez votre compte</Text>
      <Text style={styles.subtitle}>Email : {otpData?.email}</Text>

      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Mot de passe"
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirmer le mot de passe"
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Création...' : 'Créer mon compte'}
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
});
