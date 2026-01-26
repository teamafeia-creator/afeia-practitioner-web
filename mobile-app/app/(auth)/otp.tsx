import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Button, LoadingSpinner } from '../../components/ui';
import { Colors } from '../../constants/Colors';
import { Config } from '../../constants/Config';
import { validateOTP } from '../../utils/validation';

const OTP_LENGTH = Config.OTP_LENGTH;

export default function OTPScreen() {
  const router = useRouter();
  const { verifyOTP, isLoading } = useAuth();

  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string>('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Focus sur le premier input au montage
  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  const handleChange = (value: string, index: number) => {
    // Accepter uniquement les chiffres
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus vers le prochain input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Si le code est complet, vérifier automatiquement
    if (newCode.every(c => c !== '') && newCode.join('').length === OTP_LENGTH) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    // Gérer le backspace
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || code.join('');

    // Validation
    const validation = validateOTP(fullCode);
    if (!validation.valid) {
      setError(validation.error || 'Code invalide');
      return;
    }

    try {
      console.log('✅ OTP: Verifying code', fullCode);
      const result = await verifyOTP(fullCode);

      if (result.valid) {
        console.log('✅ OTP: Code valid, email:', result.email);
        // Naviguer vers l'inscription avec l'email pré-rempli
        router.push({
          pathname: '/(auth)/register',
          params: {
            email: result.email || '',
            inviteCode: fullCode,
          },
        });
      } else {
        setError('Code invalide ou expiré');
        setCode(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      console.error('❌ OTP: Verification failed', err);
      setError(err.response?.data?.message || 'Erreur de vérification');
      setCode(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
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
        {/* Header */}
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>Entrez votre code</Text>
          <Text style={styles.subtitle}>
            Saisissez le code à 6 chiffres fourni par votre naturopathe
          </Text>

          {/* Inputs OTP */}
          <View style={styles.otpContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.otpInput,
                  digit ? styles.otpInputFilled : null,
                  error ? styles.otpInputError : null,
                ]}
                value={digit}
                onChangeText={value => handleChange(value, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoComplete="one-time-code"
              />
            ))}
          </View>

          {/* Erreur */}
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Ce code a été généré par votre naturopathe lors de votre première
              consultation. Si vous ne l'avez pas, contactez votre praticien.
            </Text>
          </View>
        </View>

        {/* Bouton */}
        <View style={styles.buttonContainer}>
          <Button
            title="Vérifier le code"
            onPress={() => handleVerify()}
            variant="primary"
            fullWidth
            size="large"
            loading={isLoading}
            disabled={code.some(c => !c)}
          />
        </View>

        {isLoading && <LoadingSpinner fullScreen overlay message="Vérification..." />}
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
    alignItems: 'center',
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.grisChaud,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: Colors.grisChaud,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: Colors.blanc,
    color: Colors.charcoal,
  },
  otpInputFilled: {
    borderColor: Colors.teal,
    backgroundColor: Colors.blanc,
  },
  otpInputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  infoContainer: {
    backgroundColor: Colors.blanc,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  infoText: {
    fontSize: 14,
    color: Colors.grisChaud,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
});
