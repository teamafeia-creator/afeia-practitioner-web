import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors } from '../constants/Colors';
import { api } from '../services/api';

type OTPData = {
  success: boolean;
  email: string;
  patientId: string;
  tempToken?: string;
};

export default function OTPScreen({
  onSuccess,
}: {
  onSuccess: (data: OTPData) => void;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Erreur', 'Le code doit contenir 6 chiffres');
      return;
    }

    setLoading(true);

    try {
      console.log('📊 Verifying OTP code:', code);

      // Try to verify via Supabase edge function
      const result = await api.verifyOTP(code);

      if (result?.success) {
        console.log('✅ OTP verified:', result);
        onSuccess({
          success: true,
          email: result.email,
          patientId: result.patientId,
          tempToken: result.tempToken,
        });
      } else {
        Alert.alert('Erreur', result?.error || 'Code invalide');
      }
    } catch (error) {
      console.error('❌ OTP verification error:', error);
      Alert.alert(
        'Erreur',
        'Impossible de verifier le code. Verifiez votre connexion et reessayez.'
      );
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
        onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
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

      <Text style={styles.helpText}>
        Le code a été envoyé à votre adresse email par votre naturopathe.
      </Text>
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
  helpText: {
    marginTop: 30,
    fontSize: 14,
    color: Colors.grisChaud,
    textAlign: 'center',
    lineHeight: 20,
  },
});
