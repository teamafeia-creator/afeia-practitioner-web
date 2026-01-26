/**
 * Loading Spinner & States Components
 * AFEIA Design System
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme, Spacing, TextStyles } from '@/constants';
import { Button } from './Button';

// ============================================
// Loading Spinner
// ============================================

export interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

export function LoadingSpinner({
  size = 'large',
  color = Colors.primary.teal,
  style,
}: LoadingSpinnerProps) {
  return (
    <View style={[styles.spinnerContainer, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

// ============================================
// Loading Screen
// ============================================

export interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Chargement...' }: LoadingScreenProps) {
  return (
    <View style={styles.fullScreen}>
      <ActivityIndicator size="large" color={Colors.primary.teal} />
      <Text style={styles.loadingMessage}>{message}</Text>
    </View>
  );
}

// ============================================
// Empty State
// ============================================

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon = 'folder-open-outline',
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.stateContainer, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={40} color={Colors.neutral.grayWarm} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {message && <Text style={styles.stateMessage}>{message}</Text>}
      {actionLabel && onAction && (
        <Button variant="outline" onPress={onAction} style={styles.stateButton}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

// ============================================
// Error State
// ============================================

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({
  title = 'Une erreur est survenue',
  message = 'Veuillez réessayer plus tard.',
  onRetry,
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.stateContainer, style]}>
      <View style={[styles.iconCircle, styles.iconCircleError]}>
        <Ionicons name="alert-circle-outline" size={40} color={Colors.state.error} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {message && <Text style={styles.stateMessage}>{message}</Text>}
      {onRetry && (
        <Button variant="outline" onPress={onRetry} style={styles.stateButton}>
          Réessayer
        </Button>
      )}
    </View>
  );
}

// ============================================
// Success State
// ============================================

export interface SuccessStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function SuccessState({
  title,
  message,
  actionLabel,
  onAction,
  style,
}: SuccessStateProps) {
  return (
    <View style={[styles.stateContainer, style]}>
      <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
        <Ionicons name="checkmark-circle-outline" size={40} color={Colors.state.success} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {message && <Text style={styles.stateMessage}>{message}</Text>}
      {actionLabel && onAction && (
        <Button variant="primary" onPress={onAction} style={styles.stateButton}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  spinnerContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMessage: {
    ...TextStyles.body,
    color: Theme.textSecondary,
    marginTop: Spacing.base,
  },

  // State containers
  stateContainer: {
    padding: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  iconCircleError: {
    backgroundColor: Colors.state.errorLight,
  },
  iconCircleSuccess: {
    backgroundColor: Colors.state.successLight,
  },
  stateTitle: {
    ...TextStyles.h4,
    color: Theme.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  stateMessage: {
    ...TextStyles.body,
    color: Theme.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  stateButton: {
    marginTop: Spacing.lg,
  },
});
