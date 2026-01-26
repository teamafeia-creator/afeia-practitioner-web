/**
 * Select Components (Radio, Checkbox, Rating)
 * AFEIA Design System
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme, Spacing, BorderRadius, TextStyles } from '@/constants';

// ============================================
// Radio Button
// ============================================

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  style?: ViewStyle;
}

export function RadioGroup({ options, value, onChange, label, error, style }: RadioGroupProps) {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.radioOption,
              value === option.value && styles.radioOptionSelected,
            ]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.radioCircle,
                value === option.value && styles.radioCircleSelected,
              ]}
            >
              {value === option.value && <View style={styles.radioInner} />}
            </View>
            <View style={styles.radioContent}>
              <Text style={styles.radioLabel}>{option.label}</Text>
              {option.description && (
                <Text style={styles.radioDescription}>{option.description}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ============================================
// Checkbox
// ============================================

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  style,
}: CheckboxProps) {
  return (
    <TouchableOpacity
      style={[styles.checkboxContainer, disabled && styles.checkboxDisabled, style]}
      onPress={() => !disabled && onChange(!checked)}
      activeOpacity={0.8}
    >
      <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
        {checked && <Ionicons name="checkmark" size={16} color={Colors.neutral.white} />}
      </View>
      {(label || description) && (
        <View style={styles.checkboxContent}>
          {label && <Text style={styles.checkboxLabel}>{label}</Text>}
          {description && <Text style={styles.checkboxDescription}>{description}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================
// Checkbox Group
// ============================================

export interface CheckboxGroupProps {
  options: RadioOption[];
  values: string[];
  onChange: (values: string[]) => void;
  label?: string;
  error?: string;
  style?: ViewStyle;
}

export function CheckboxGroup({
  options,
  values,
  onChange,
  label,
  error,
  style,
}: CheckboxGroupProps) {
  const handleChange = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...values, value]);
    } else {
      onChange(values.filter((v) => v !== value));
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <Checkbox
            key={option.value}
            checked={values.includes(option.value)}
            onChange={(checked) => handleChange(option.value, checked)}
            label={option.label}
            description={option.description}
          />
        ))}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ============================================
// Rating (Stars or Emojis)
// ============================================

export interface RatingProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  type?: 'star' | 'emoji';
  label?: string;
  error?: string;
  style?: ViewStyle;
}

const EMOJI_RATINGS = ['😢', '😕', '😐', '🙂', '😊'];

export function Rating({
  value,
  onChange,
  max = 5,
  type = 'star',
  label,
  error,
  style,
}: RatingProps) {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.ratingContainer}>
        {Array.from({ length: max }).map((_, index) => {
          const ratingValue = index + 1;
          const isActive = ratingValue <= value;

          if (type === 'emoji') {
            return (
              <TouchableOpacity
                key={index}
                onPress={() => onChange(ratingValue)}
                style={[
                  styles.emojiButton,
                  isActive && styles.emojiButtonActive,
                ]}
                activeOpacity={0.7}
              >
                <Text style={styles.emojiText}>{EMOJI_RATINGS[index]}</Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={index}
              onPress={() => onChange(ratingValue)}
              style={styles.starButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? 'star' : 'star-outline'}
                size={32}
                color={isActive ? Colors.secondary.gold : Colors.neutral.grayWarm}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  label: {
    ...TextStyles.label,
    color: Theme.text,
    marginBottom: Spacing.sm,
  },
  errorText: {
    ...TextStyles.bodySmall,
    color: Colors.state.error,
    marginTop: Spacing.xs,
  },
  optionsContainer: {
    gap: Spacing.sm,
  },

  // Radio styles
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.neutral.sandDark,
  },
  radioOptionSelected: {
    borderColor: Colors.primary.teal,
    backgroundColor: Colors.primary.tealPale,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.neutral.grayWarm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  radioCircleSelected: {
    borderColor: Colors.primary.teal,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary.teal,
  },
  radioContent: {
    flex: 1,
  },
  radioLabel: {
    ...TextStyles.body,
    color: Theme.text,
  },
  radioDescription: {
    ...TextStyles.bodySmall,
    color: Theme.textSecondary,
    marginTop: Spacing.xxs,
  },

  // Checkbox styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.neutral.sandDark,
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.xs,
    borderWidth: 2,
    borderColor: Colors.neutral.grayWarm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  checkboxBoxChecked: {
    backgroundColor: Colors.primary.teal,
    borderColor: Colors.primary.teal,
  },
  checkboxContent: {
    flex: 1,
  },
  checkboxLabel: {
    ...TextStyles.body,
    color: Theme.text,
  },
  checkboxDescription: {
    ...TextStyles.bodySmall,
    color: Theme.textSecondary,
    marginTop: Spacing.xxs,
  },

  // Rating styles
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  starButton: {
    padding: Spacing.xs,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral.sand,
  },
  emojiButtonActive: {
    backgroundColor: Colors.primary.tealPale,
    borderWidth: 2,
    borderColor: Colors.primary.teal,
  },
  emojiText: {
    fontSize: 24,
  },
});
