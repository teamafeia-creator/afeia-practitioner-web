import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Complement } from '../../types';
import { colors, spacing, fontSize } from '../../constants/theme';

interface ComplementCardProps {
  complement: Complement;
  onToggle: (complementId: string, taken: boolean) => void;
  toggling?: boolean;
}

export function ComplementCard({
  complement,
  onToggle,
  toggling = false,
}: ComplementCardProps) {
  return (
    <Card variant="elevated" padding="md">
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.name}>{complement.name}</Text>
          <Text style={styles.dosage}>{complement.dosage}</Text>
          {complement.frequency && (
            <Text style={styles.frequency}>{complement.frequency}</Text>
          )}
          {complement.instructions && (
            <Text style={styles.instructions}>{complement.instructions}</Text>
          )}
        </View>
        <Switch
          value={complement.takenToday}
          onValueChange={(taken) => onToggle(complement.id, taken)}
          disabled={toggling}
          trackColor={{
            false: colors.neutral[300],
            true: colors.primary[300],
          }}
          thumbColor={
            complement.takenToday ? colors.primary[500] : colors.neutral[50]
          }
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  dosage: {
    fontSize: fontSize.sm,
    color: colors.primary[700],
    marginTop: 2,
  },
  frequency: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    marginTop: 2,
  },
  instructions: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});
