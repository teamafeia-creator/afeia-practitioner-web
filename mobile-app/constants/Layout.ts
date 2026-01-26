/**
 * AFEIA Design System - Layout & Spacing
 */

import { Dimensions, Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

export const Screen = {
  width,
  height,
  isSmallDevice: width < 375,
  isMediumDevice: width >= 375 && width < 414,
  isLargeDevice: width >= 414,
};

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const IconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  base: 24,
  lg: 28,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

export const AvatarSize = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 80,
  '3xl': 96,
  '4xl': 128,
} as const;

// Hauteurs de composants
export const ComponentHeight = {
  inputSmall: 40,
  input: 48,
  inputLarge: 56,
  button: 48,
  buttonSmall: 40,
  buttonLarge: 56,
  tabBar: 60,
  header: 56,
  headerLarge: 96,
  card: 'auto',
} as const;

// Safe area et navigation
export const SafeArea = {
  statusBarHeight: Platform.select({
    ios: 44,
    android: StatusBar.currentHeight ?? 24,
    default: 0,
  }),
  bottomTabHeight: 60,
  bottomInset: Platform.select({
    ios: 34,
    android: 0,
    default: 0,
  }),
} as const;

// Ombres
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

// Durées d'animation
export const Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 800,
} as const;
