/**
 * AFEIA Design System - Typographie
 *
 * Police principale: Montserrat
 * Style: Minimalisme élégant, espaces respirants
 */

import { Platform } from 'react-native';

export const FontFamily = {
  light: Platform.select({
    ios: 'Montserrat-Light',
    android: 'Montserrat-Light',
    default: 'Montserrat-Light',
  }),
  regular: Platform.select({
    ios: 'Montserrat-Regular',
    android: 'Montserrat-Regular',
    default: 'Montserrat-Regular',
  }),
  medium: Platform.select({
    ios: 'Montserrat-Medium',
    android: 'Montserrat-Medium',
    default: 'Montserrat-Medium',
  }),
  semiBold: Platform.select({
    ios: 'Montserrat-SemiBold',
    android: 'Montserrat-SemiBold',
    default: 'Montserrat-SemiBold',
  }),
  bold: Platform.select({
    ios: 'Montserrat-Bold',
    android: 'Montserrat-Bold',
    default: 'Montserrat-Bold',
  }),
} as const;

// Fallback fonts for development without custom fonts
export const FontFamilyFallback = {
  light: Platform.select({
    ios: 'System',
    android: 'sans-serif-light',
    default: 'System',
  }),
  regular: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'System',
  }),
  semiBold: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'System',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
} as const;

export const FontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
} as const;

export const LineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

export const FontWeight = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

// Styles de texte prédéfinis
export const TextStyles = {
  // Titres
  h1: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.bold,
    lineHeight: FontSize['4xl'] * LineHeight.tight,
  },
  h2: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    lineHeight: FontSize['3xl'] * LineHeight.tight,
  },
  h3: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.semiBold,
    lineHeight: FontSize['2xl'] * LineHeight.tight,
  },
  h4: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semiBold,
    lineHeight: FontSize.xl * LineHeight.tight,
  },
  h5: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    lineHeight: FontSize.lg * LineHeight.normal,
  },

  // Corps de texte
  bodyLarge: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.md * LineHeight.relaxed,
  },
  body: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.base * LineHeight.relaxed,
  },
  bodySmall: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.sm * LineHeight.relaxed,
  },

  // Labels et boutons
  label: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    lineHeight: FontSize.base * LineHeight.normal,
  },
  labelSmall: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: FontSize.sm * LineHeight.normal,
  },
  button: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
    lineHeight: FontSize.md * LineHeight.normal,
  },
  buttonSmall: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semiBold,
    lineHeight: FontSize.base * LineHeight.normal,
  },

  // Captions et auxiliaires
  caption: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.xs * LineHeight.normal,
  },
  overline: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
} as const;
