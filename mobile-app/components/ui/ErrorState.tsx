import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import { colors, spacing, fontSize } from '../../constants/theme';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Une erreur est survenue',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>!</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button title="Réessayer" onPress={onRetry} variant="outline" size="sm" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sand[50],
    padding: spacing.lg,
    gap: spacing.md,
  },
  icon: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.error,
    width: 64,
    height: 64,
    lineHeight: 64,
    textAlign: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 32,
    overflow: 'hidden',
  },
  message: {
    fontSize: fontSize.md,
    color: colors.neutral[600],
    textAlign: 'center',
    maxWidth: 280,
  },
});
