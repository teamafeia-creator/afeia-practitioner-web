import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../constants/theme';

interface MoodOption {
  value: string;
  label: string;
  emoji: string;
}

const MOODS: MoodOption[] = [
  { value: 'very_bad', label: 'Très mal', emoji: '\uD83D\uDE1E' },
  { value: 'bad', label: 'Mal', emoji: '\uD83D\uDE41' },
  { value: 'neutral', label: 'Neutre', emoji: '\uD83D\uDE10' },
  { value: 'good', label: 'Bien', emoji: '\uD83D\uDE42' },
  { value: 'very_good', label: 'Très bien', emoji: '\uD83D\uDE04' },
];

interface MoodSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function MoodSelector({ value, onChange, label }: MoodSelectorProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.options}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.value}
            style={[
              styles.option,
              value === mood.value && styles.optionSelected,
            ]}
            onPress={() => onChange(mood.value)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <Text
              style={[
                styles.optionLabel,
                value === mood.value && styles.optionLabelSelected,
              ]}
            >
              {mood.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: spacing.sm,
  },
  options: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  optionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  emoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  optionLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
  },
  optionLabelSelected: {
    color: colors.primary[700],
    fontWeight: '600',
  },
});
