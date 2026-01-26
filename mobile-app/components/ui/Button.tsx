import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Colors } from '../../constants/Colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
}) => {
  const isDisabled = disabled || loading;

  const getButtonStyle = () => {
    const baseStyles: ViewStyle[] = [styles.base, styles[size]];

    if (fullWidth) {
      baseStyles.push(styles.fullWidth);
    }

    switch (variant) {
      case 'primary':
        baseStyles.push(styles.primary);
        break;
      case 'secondary':
        baseStyles.push(styles.secondary);
        break;
      case 'outline':
        baseStyles.push(styles.outline);
        break;
      case 'ghost':
        baseStyles.push(styles.ghost);
        break;
    }

    if (isDisabled) {
      baseStyles.push(styles.disabled);
    }

    return style ? [baseStyles, style] : baseStyles;
  };

  const getTextStyle = () => {
    const baseStyles: TextStyle[] = [styles.text, styles[`${size}Text`]];

    switch (variant) {
      case 'primary':
        baseStyles.push(styles.primaryText);
        break;
      case 'secondary':
        baseStyles.push(styles.secondaryText);
        break;
      case 'outline':
        baseStyles.push(styles.outlineText);
        break;
      case 'ghost':
        baseStyles.push(styles.ghostText);
        break;
    }

    if (isDisabled) {
      baseStyles.push(styles.disabledText);
    }

    return textStyle ? [baseStyles, textStyle] : baseStyles;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.blanc : Colors.teal}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  fullWidth: {
    width: '100%',
  },

  // Sizes
  small: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 48,
  },
  large: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    minHeight: 56,
  },

  // Variants
  primary: {
    backgroundColor: Colors.dore,
  },
  secondary: {
    backgroundColor: Colors.teal,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.teal,
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  // States
  disabled: {
    backgroundColor: Colors.grisChaud,
    borderColor: Colors.grisChaud,
    opacity: 0.6,
  },

  // Text
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  primaryText: {
    color: Colors.blanc,
  },
  secondaryText: {
    color: Colors.blanc,
  },
  outlineText: {
    color: Colors.teal,
  },
  ghostText: {
    color: Colors.teal,
  },
  disabledText: {
    color: Colors.blanc,
  },
});

export default Button;
