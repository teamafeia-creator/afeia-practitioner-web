/**
 * Input Component
 * AFEIA Design System
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme, Spacing, BorderRadius, ComponentHeight, TextStyles } from '@/constants';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  isPassword,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasError = !!error;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          hasError && styles.inputError,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || isPassword) && styles.inputWithRightIcon,
            style,
          ]}
          placeholderTextColor={Colors.neutral.grayWarm}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.neutral.grayWarm}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !isPassword && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>

      {(error || hint) && (
        <Text style={[styles.helperText, hasError && styles.errorText]}>
          {error || hint}
        </Text>
      )}
    </View>
  );
}

// OTP Input Component
export interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
}

export function OTPInput({ value, onChange, length = 6, error }: OTPInputProps) {
  const inputRef = React.useRef<TextInput>(null);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  return (
    <View>
      <TouchableOpacity onPress={handlePress} activeOpacity={1}>
        <View style={styles.otpContainer}>
          {Array.from({ length }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.otpBox,
                value.length === index && styles.otpBoxActive,
                error && styles.otpBoxError,
              ]}
            >
              <Text style={styles.otpText}>{value[index] || ''}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      <TextInput
        ref={inputRef}
        style={styles.otpHiddenInput}
        value={value}
        onChangeText={(text) => {
          const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
          onChange(cleaned);
        }}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
      />

      {error && <Text style={[styles.helperText, styles.errorText]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  label: {
    ...TextStyles.label,
    color: Theme.text,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.white,
    borderWidth: 1,
    borderColor: Colors.neutral.sandDark,
    borderRadius: BorderRadius.md,
    height: ComponentHeight.input,
  },
  inputFocused: {
    borderColor: Colors.primary.teal,
    borderWidth: 2,
  },
  inputError: {
    borderColor: Colors.state.error,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: Spacing.base,
    ...TextStyles.body,
    color: Theme.text,
  },
  inputWithLeftIcon: {
    paddingLeft: Spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: Spacing.sm,
  },
  leftIcon: {
    paddingLeft: Spacing.base,
  },
  rightIcon: {
    paddingRight: Spacing.base,
  },
  helperText: {
    ...TextStyles.bodySmall,
    color: Theme.textSecondary,
    marginTop: Spacing.xs,
  },
  errorText: {
    color: Colors.state.error,
  },

  // OTP Styles
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: Colors.neutral.sandDark,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral.white,
  },
  otpBoxActive: {
    borderColor: Colors.primary.teal,
  },
  otpBoxError: {
    borderColor: Colors.state.error,
  },
  otpText: {
    ...TextStyles.h3,
    color: Theme.text,
  },
  otpHiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});
