/**
 * Button Component
 * AFEIA Design System
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Colors, Theme, Spacing, BorderRadius, ComponentHeight, Shadows } from '@/constants';

export interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isDisabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  ...props
}: ButtonProps) {
  const isInteractive = !isDisabled && !isLoading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        !isInteractive && styles.disabled,
        style as ViewStyle,
      ]}
      disabled={!isInteractive}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? Theme.primary : Theme.textInverse}
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`text_${size}`],
              leftIcon && styles.textWithLeftIcon,
              rightIcon && styles.textWithRightIcon,
            ]}
          >
            {children}
          </Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },

  // Variants
  primary: {
    backgroundColor: Colors.secondary.gold,
  },
  secondary: {
    backgroundColor: Colors.primary.teal,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary.teal,
    ...Shadows.none,
  },
  ghost: {
    backgroundColor: 'transparent',
    ...Shadows.none,
  },
  danger: {
    backgroundColor: Colors.state.error,
  },

  // Sizes
  size_sm: {
    height: ComponentHeight.buttonSmall,
    paddingHorizontal: Spacing.md,
  },
  size_md: {
    height: ComponentHeight.button,
    paddingHorizontal: Spacing.lg,
  },
  size_lg: {
    height: ComponentHeight.buttonLarge,
    paddingHorizontal: Spacing.xl,
  },

  // States
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },

  // Text styles
  text: {
    fontWeight: '600',
  },
  text_primary: {
    color: Colors.neutral.white,
  },
  text_secondary: {
    color: Colors.neutral.white,
  },
  text_outline: {
    color: Colors.primary.teal,
  },
  text_ghost: {
    color: Colors.primary.teal,
  },
  text_danger: {
    color: Colors.neutral.white,
  },
  text_sm: {
    fontSize: 14,
  },
  text_md: {
    fontSize: 16,
  },
  text_lg: {
    fontSize: 18,
  },
  textWithLeftIcon: {
    marginLeft: Spacing.sm,
  },
  textWithRightIcon: {
    marginRight: Spacing.sm,
  },
});
