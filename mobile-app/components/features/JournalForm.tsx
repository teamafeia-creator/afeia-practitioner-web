import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MoodSelector } from './MoodSelector';
import { colors, spacing, fontSize, borderRadius } from '../../constants/theme';

interface LevelOption {
  value: string;
  label: string;
}

const LEVELS: LevelOption[] = [
  { value: 'very_low', label: 'Très bas' },
  { value: 'low', label: 'Bas' },
  { value: 'medium', label: 'Moyen' },
  { value: 'high', label: 'Bon' },
  { value: 'very_high', label: 'Excellent' },
];

interface LevelSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function LevelSelector({ label, value, onChange }: LevelSelectorProps) {
  return (
    <View style={styles.levelContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.levelOptions}>
        {LEVELS.map((level) => (
          <View
            key={level.value}
            style={[
              styles.levelDot,
              value === level.value && styles.levelDotSelected,
            ]}
          >
            <Text
              style={[
                styles.levelText,
                value === level.value && styles.levelTextSelected,
              ]}
              onPress={() => onChange(level.value)}
            >
              {level.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface JournalFormData {
  mood: string;
  sleepQuality: string;
  energyLevel: string;
  alimentationQuality: string;
}

interface JournalFormProps {
  data: JournalFormData;
  onChange: (data: JournalFormData) => void;
}

export function JournalForm({ data, onChange }: JournalFormProps) {
  return (
    <View style={styles.container}>
      <MoodSelector
        label="Comment vous sentez-vous ?"
        value={data.mood}
        onChange={(mood) => onChange({ ...data, mood })}
      />

      <LevelSelector
        label="Qualité du sommeil"
        value={data.sleepQuality}
        onChange={(sleepQuality) => onChange({ ...data, sleepQuality })}
      />

      <LevelSelector
        label="Niveau d'énergie"
        value={data.energyLevel}
        onChange={(energyLevel) => onChange({ ...data, energyLevel })}
      />

      <LevelSelector
        label="Alimentation"
        value={data.alimentationQuality}
        onChange={(alimentationQuality) =>
          onChange({ ...data, alimentationQuality })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  levelContainer: {
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: spacing.sm,
  },
  levelOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  levelDot: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  levelDotSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  levelText: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    textAlign: 'center',
  },
  levelTextSelected: {
    color: colors.primary[700],
    fontWeight: '600',
  },
});
