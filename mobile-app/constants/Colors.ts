/**
 * AFEIA Design System - Couleurs
 *
 * Principe de répartition:
 * - 70% Teal → Professionnalisme clinique
 * - 15% Aubergine → Identité distinctive premium (avec parcimonie)
 * - 10% Doré → Dynamisme & action
 * - 5% Neutres → Respiration & lisibilité
 */

export const Colors = {
  // Couleurs Primaires (70% de l'interface)
  primary: {
    tealDeep: '#1A5C5C',      // Headers principaux, éléments d'autorité
    teal: '#2A8080',          // Navigation, boutons standards, liens (signature)
    tealLight: '#5BA6A6',     // Hover states, backgrounds légers
    tealPale: '#E8F4F4',      // Backgrounds très légers
  },

  // Couleurs Secondaires (15% de l'interface)
  secondary: {
    aubergine: '#85004F',     // Badges Premium uniquement, petits accents
    auberginePale: '#F5E6EF', // Background premium badges
    gold: '#FF9A3D',          // CTA principaux, notifications positives
    goldLight: '#FFF3E6',     // Background doré léger
    marine: '#40464F',        // Textes longs, footer
    sage: '#89A889',          // Notifications succès, éléments naturels
    sageLight: '#E8F0E8',     // Background succès
  },

  // Couleurs Neutres (10-15% de l'interface)
  neutral: {
    sand: '#F5EFE7',          // Backgrounds, sections, cards
    sandDark: '#E8DFD3',      // Borders
    grayWarm: '#8C8680',      // Textes secondaires, placeholders
    charcoal: '#3D3D3D',      // Textes principaux, titres
    white: '#FFFFFF',         // Fond principal
    black: '#000000',
  },

  // États
  state: {
    error: '#DC3545',
    errorLight: '#FDECEA',
    warning: '#FFC107',
    warningLight: '#FFF8E1',
    success: '#89A889',
    successLight: '#E8F0E8',
    info: '#2A8080',
    infoLight: '#E8F4F4',
  },

  // Dégradés
  gradient: {
    teal: ['#1A5C5C', '#2A8080'],
    tealLight: ['#2A8080', '#5BA6A6'],
    gold: ['#FF9A3D', '#FFB366'],
    sand: ['#F5EFE7', '#FFFFFF'],
  },

  // Ombres
  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.2)',
    teal: 'rgba(42, 128, 128, 0.2)',
    gold: 'rgba(255, 154, 61, 0.2)',
  },
} as const;

// Couleurs par défaut du thème
export const Theme = {
  background: Colors.neutral.white,
  backgroundSecondary: Colors.neutral.sand,
  text: Colors.neutral.charcoal,
  textSecondary: Colors.neutral.grayWarm,
  textInverse: Colors.neutral.white,
  primary: Colors.primary.teal,
  primaryDark: Colors.primary.tealDeep,
  primaryLight: Colors.primary.tealLight,
  accent: Colors.secondary.gold,
  border: Colors.neutral.sandDark,
  card: Colors.neutral.white,
  error: Colors.state.error,
  success: Colors.state.success,
  premium: Colors.secondary.aubergine,
} as const;

export type ColorType = typeof Colors;
export type ThemeType = typeof Theme;
