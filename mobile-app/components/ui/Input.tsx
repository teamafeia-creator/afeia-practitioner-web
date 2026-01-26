import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Colors } from '../../constants/Colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  type?: 'text' | 'email' | 'password' | 'number' | 'phone';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helper,
  containerStyle,
  inputStyle,
  labelStyle,
  leftIcon,
  rightIcon,
  type = 'text',
  secureTextEntry,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = type === 'password';
  const shouldHidePassword = isPassword && !isPasswordVisible;

  const getKeyboardType = (): TextInputProps['keyboardType'] => {
    switch (type) {
      case 'email':
        return 'email-address';
      case 'number':
        return 'numeric';
      case 'phone':
        return 'phone-pad';
      default:
        return 'default';
    }
  };

  const getAutoCapitalize = (): TextInputProps['autoCapitalize'] => {
    switch (type) {
      case 'email':
      case 'password':
        return 'none';
      default:
        return 'sentences';
    }
  };

  const inputContainerStyle: ViewStyle[] = [styles.inputContainer];
  if (isFocused) {
    inputContainerStyle.push(styles.inputFocused);
  }
  if (error) {
    inputContainerStyle.push(styles.inputError);
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>{label}</Text>
      )}

      <View style={inputContainerStyle}>
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : null,
            rightIcon || isPassword ? styles.inputWithRightIcon : null,
            inputStyle,
          ]}
          placeholderTextColor={Colors.grisChaud}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType={getKeyboardType()}
          autoCapitalize={getAutoCapitalize()}
          secureTextEntry={shouldHidePassword}
          autoCorrect={type === 'email' || type === 'password' ? false : undefined}
          {...rest}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.iconRight}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Text style={styles.passwordToggle}>
              {isPasswordVisible ? '👁️' : '👁️‍🗨️'}
            </Text>
          </TouchableOpacity>
        )}

        {rightIcon && !isPassword && (
          <View style={styles.iconRight}>{rightIcon}</View>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {helper && !error && <Text style={styles.helper}>{helper}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.charcoal,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blanc,
    borderWidth: 1,
    borderColor: Colors.grisChaud,
    borderRadius: 12,
    minHeight: 52,
  },
  inputFocused: {
    borderColor: Colors.teal,
    borderWidth: 2,
  },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.charcoal,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  iconLeft: {
    paddingLeft: 16,
  },
  iconRight: {
    paddingRight: 16,
  },
  passwordToggle: {
    fontSize: 20,
  },
  error: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  helper: {
    fontSize: 12,
    color: Colors.grisChaud,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default Input;
