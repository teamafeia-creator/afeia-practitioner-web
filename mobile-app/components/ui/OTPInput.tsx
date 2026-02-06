import React, { useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, Keyboard } from 'react-native';
import { Text } from 'react-native';
import { colors, borderRadius, spacing, fontSize } from '../../constants/theme';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  error,
  autoFocus = true,
}: OTPInputProps) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
    onChange(cleaned);
    if (cleaned.length === length) {
      Keyboard.dismiss();
    }
  };

  const digits = value.split('');

  return (
    <View style={styles.container}>
      <View style={styles.boxes}>
        {Array.from({ length }, (_, i) => (
          <View
            key={i}
            style={[
              styles.box,
              digits[i] ? styles.boxFilled : null,
              i === digits.length ? styles.boxActive : null,
              error ? styles.boxError : null,
            ]}
          >
            <Text style={styles.digit}>{digits[i] || ''}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  boxes: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  box: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  boxFilled: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  boxActive: {
    borderColor: colors.primary[500],
    borderWidth: 2,
  },
  boxError: {
    borderColor: colors.error,
  },
  digit: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.sm,
  },
});
