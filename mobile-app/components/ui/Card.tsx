/**
 * Card Component
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
import { Colors, Theme, Spacing, BorderRadius, Shadows, TextStyles } from '@/constants';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outline' | 'premium';
  style?: ViewStyle;
}

export function Card({
  children,
  title,
  subtitle,
  icon,
  rightElement,
  onPress,
  variant = 'default',
  style,
}: CardProps) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.base, styles[variant], style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.9 : 1}
    >
      {(title || icon || rightElement) && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <View>
              {title && <Text style={styles.title}>{title}</Text>}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          </View>
          {rightElement && <View>{rightElement}</View>}
        </View>
      )}
      <View style={[styles.content, (title || icon) && styles.contentWithHeader]}>
        {children}
      </View>
    </Container>
  );
}

// Premium Badge for cards
export function PremiumBadge() {
  return (
    <View style={styles.premiumBadge}>
      <Text style={styles.premiumBadgeText}>PREMIUM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.md,
  },

  // Variants
  default: {},
  elevated: {
    ...Shadows.lg,
  },
  outline: {
    ...Shadows.none,
    borderWidth: 1,
    borderColor: Colors.neutral.sandDark,
  },
  premium: {
    borderWidth: 1,
    borderColor: Colors.secondary.auberginePale,
    backgroundColor: Colors.neutral.white,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  title: {
    ...TextStyles.h5,
    color: Theme.text,
  },
  subtitle: {
    ...TextStyles.bodySmall,
    color: Theme.textSecondary,
    marginTop: Spacing.xxs,
  },

  // Content
  content: {},
  contentWithHeader: {
    marginTop: Spacing.md,
  },

  // Premium Badge
  premiumBadge: {
    backgroundColor: Colors.secondary.auberginePale,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: BorderRadius.xs,
  },
  premiumBadgeText: {
    ...TextStyles.overline,
    color: Colors.secondary.aubergine,
    fontSize: 10,
  },
});
