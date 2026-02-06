import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../../constants/theme';

interface EmptyStateProps {
  message: string;
  description?: string;
  icon?: string;
}

export function EmptyState({
  message,
  description,
  icon = '-',
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.message}>{message}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
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
    gap: spacing.sm,
  },
  icon: {
    fontSize: 48,
    color: colors.neutral[400],
    width: 64,
    height: 64,
    lineHeight: 64,
    textAlign: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 32,
    overflow: 'hidden',
  },
  message: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[700],
    textAlign: 'center',
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    textAlign: 'center',
    maxWidth: 280,
  },
});
