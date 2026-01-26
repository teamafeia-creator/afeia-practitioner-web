/**
 * Progress Bar Component
 * AFEIA Design System
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Theme, Spacing, BorderRadius, TextStyles, Animation } from '@/constants';

export interface ProgressBarProps {
  progress: number; // 0 to 1
  showLabel?: boolean;
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  showLabel = false,
  label,
  variant = 'default',
  size = 'md',
  style,
}: ProgressBarProps) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration: Animation.normal,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  const percentage = Math.round(progress * 100);

  return (
    <View style={[styles.container, style]}>
      {(showLabel || label) && (
        <View style={styles.labelContainer}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showLabel && <Text style={styles.percentage}>{percentage}%</Text>}
        </View>
      )}
      <View style={[styles.track, styles[`track_${size}`]]}>
        <Animated.View
          style={[
            styles.fill,
            styles[`fill_${variant}`],
            styles[`fill_${size}`],
            animatedStyle,
          ]}
        />
      </View>
    </View>
  );
}

// Step Progress for Anamnese
export interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  style?: ViewStyle;
}

export function StepProgress({ currentStep, totalSteps, style }: StepProgressProps) {
  return (
    <View style={[styles.stepContainer, style]}>
      <View style={styles.stepTrack}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <React.Fragment key={index}>
            <View
              style={[
                styles.stepDot,
                index < currentStep && styles.stepDotCompleted,
                index === currentStep && styles.stepDotActive,
              ]}
            >
              {index < currentStep && (
                <View style={styles.stepDotInner} />
              )}
            </View>
            {index < totalSteps - 1 && (
              <View
                style={[
                  styles.stepLine,
                  index < currentStep && styles.stepLineCompleted,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
      <Text style={styles.stepLabel}>
        Étape {currentStep + 1} sur {totalSteps}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  label: {
    ...TextStyles.labelSmall,
    color: Theme.text,
  },
  percentage: {
    ...TextStyles.labelSmall,
    color: Theme.textSecondary,
  },

  // Track
  track: {
    backgroundColor: Colors.neutral.sand,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  track_sm: {
    height: 4,
  },
  track_md: {
    height: 8,
  },
  track_lg: {
    height: 12,
  },

  // Fill
  fill: {
    borderRadius: BorderRadius.full,
  },
  fill_default: {
    backgroundColor: Colors.primary.teal,
  },
  fill_success: {
    backgroundColor: Colors.state.success,
  },
  fill_warning: {
    backgroundColor: Colors.state.warning,
  },
  fill_danger: {
    backgroundColor: Colors.state.error,
  },
  fill_sm: {
    height: 4,
  },
  fill_md: {
    height: 8,
  },
  fill_lg: {
    height: 12,
  },

  // Step Progress
  stepContainer: {
    alignItems: 'center',
  },
  stepTrack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.neutral.sand,
    borderWidth: 2,
    borderColor: Colors.neutral.sandDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: {
    backgroundColor: Colors.primary.teal,
    borderColor: Colors.primary.teal,
  },
  stepDotActive: {
    borderColor: Colors.primary.teal,
    borderWidth: 3,
  },
  stepDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral.white,
  },
  stepLine: {
    width: 20,
    height: 2,
    backgroundColor: Colors.neutral.sandDark,
  },
  stepLineCompleted: {
    backgroundColor: Colors.primary.teal,
  },
  stepLabel: {
    ...TextStyles.bodySmall,
    color: Theme.textSecondary,
    marginTop: Spacing.sm,
  },
});
