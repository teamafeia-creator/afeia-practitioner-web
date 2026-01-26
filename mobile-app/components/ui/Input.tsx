import { TextInput, Text, View, StyleSheet, TextInputProps } from 'react-native';
import { Colors } from '../../constants/Colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={Colors.grisChaud}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.charcoal,
    marginBottom: 5,
  },
  input: {
    backgroundColor: Colors.blanc,
    borderWidth: 1,
    borderColor: Colors.teal,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: Colors.charcoal,
  },
  inputError: {
    borderColor: '#D32F2F',
  },
  error: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 5,
  },
});
