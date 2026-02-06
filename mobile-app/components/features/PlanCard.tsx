import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../ui/Card';
import { Plan } from '../../types';
import { formatDate } from '../../utils/dates';
import { colors, spacing, fontSize } from '../../constants/theme';

interface PlanCardProps {
  plan: Plan;
}

export function PlanCard({ plan }: PlanCardProps) {
  const [expanded, setExpanded] = useState(false);

  const content = plan.content as Record<string, unknown>;
  const sections = Object.entries(content).filter(
    ([key]) => key !== 'id' && key !== 'version',
  );

  return (
    <Card variant="elevated" padding="lg">
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Plan de soins</Text>
            {plan.sharedAt && (
              <Text style={styles.date}>{formatDate(plan.sharedAt)}</Text>
            )}
          </View>
          <Text style={styles.chevron}>{expanded ? '\u25B2' : '\u25BC'}</Text>
        </View>

        {plan.practitioner && (
          <Text style={styles.practitioner}>
            Par {plan.practitioner.name}
          </Text>
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {sections.length > 0 ? (
            sections.map(([key, value]) => (
              <View key={key} style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {key.replace(/_/g, ' ')}
                </Text>
                <Text style={styles.sectionContent}>
                  {typeof value === 'string'
                    ? value
                    : JSON.stringify(value, null, 2)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyContent}>
              Contenu du plan non disponible
            </Text>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    marginTop: 2,
  },
  chevron: {
    fontSize: fontSize.sm,
    color: colors.neutral[400],
  },
  practitioner: {
    fontSize: fontSize.sm,
    color: colors.primary[700],
    marginTop: spacing.xs,
  },
  content: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[700],
    textTransform: 'capitalize',
  },
  sectionContent: {
    fontSize: fontSize.md,
    color: colors.neutral[800],
    lineHeight: 22,
  },
  emptyContent: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    fontStyle: 'italic',
  },
});
