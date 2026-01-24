import { colors } from './colors'

export const styles = {
  // Cards
  card: {
    base: {
      background: '#FFFFFF',
      border: '1px solid #E5E5E5',
      transition: 'all 0.2s ease',
    },
    hover: {
      borderColor: colors.teal.main,
      boxShadow: '0 4px 12px rgba(42, 128, 128, 0.08)',
    },
  },

  // Signature bar (top 3px gradient)
  signatureBar: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: `linear-gradient(90deg, ${colors.teal.main} 0%, ${colors.aubergine.main} 100%)`,
  },

  // Sections separator
  separator: {
    borderTop: '1px solid #F5F5F5',
  },

  // Typography
  heading: {
    h1: {
      fontSize: '32px',
      fontWeight: 700,
      color: colors.teal.deep,
      letterSpacing: '-0.03em',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '24px',
      fontWeight: 700,
      color: colors.teal.deep,
      letterSpacing: '-0.02em',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '18px',
      fontWeight: 600,
      color: colors.teal.deep,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
  },

  // Buttons
  button: {
    primary: {
      background: colors.gold,
      color: 'white',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 600,
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    secondary: {
      background: 'white',
      color: colors.teal.main,
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 600,
      border: `1.5px solid ${colors.teal.main}`,
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
  },

  // Avatar
  avatar: {
    base: {
      width: '56px',
      height: '56px',
      background: `linear-gradient(135deg, ${colors.teal.light} 0%, ${colors.teal.main} 100%)`,
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      position: 'relative' as const,
      flexShrink: 0,
    },
    small: {
      width: '36px',
      height: '36px',
      fontSize: '16px',
    },
  },

  // Status indicator
  statusIndicator: {
    position: 'absolute' as const,
    bottom: '-2px',
    right: '-2px',
    width: '14px',
    height: '14px',
    background: '#10B981',
    border: '2.5px solid white',
    borderRadius: '50%',
  },

  // Badge Premium
  badgePremium: {
    background: `linear-gradient(135deg, ${colors.teal.main} 0%, ${colors.aubergine.main} 100%)`,
    color: 'white',
    padding: '6px 14px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    borderRadius: '2px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },

  // Badge Standard
  badgeStandard: {
    background: 'rgba(42, 128, 128, 0.08)',
    color: colors.teal.main,
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    borderRadius: '2px',
  },
}
