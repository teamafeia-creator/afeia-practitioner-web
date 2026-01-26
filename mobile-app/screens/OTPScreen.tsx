import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors } from '../constants/Colors';
import { api } from '../services/api';

export default function OTPScreen({ onSuccess }: { onSuccess: (data: any) => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Erreur', 'Le code doit contenir 6 chiffres');
      return;
    }

    setLoading(true);
    try {
      const result = await api.verifyOTP(code);
      if (result.success) {
        onSuccess(result);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entrez votre code d'accès</Text>
      <Text style={styles.subtitle}>Code à 6 chiffres reçu par email</Text>

      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Vérification...' : 'Vérifier'}
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
    borderWidth: 2,
    borderColor: Colors.teal,
    borderRadius: 8,
    padding: 15,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 10,
  },
  button: {
    backgroundColor: Colors.dore,
    paddingVertical: 15,
    borderRadius: 8,
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
