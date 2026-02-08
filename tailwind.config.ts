import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        serif: ['Source Serif 4', 'Lora', 'Georgia', 'serif']
      },
      colors: {
        // ── SURFACES ──
        cream: '#FBF7F2',
        white: '#FFFFFF',

        // ── SIDEBAR (charcoal) ──
        'sidebar-bg': '#2D3436',
        'sidebar-text': '#E8E6E1',
        'sidebar-hover': 'rgba(255,255,255,0.08)',
        'sidebar-active': '#5B8C6E',

        // ── PRIMAIRE (sage — ~15% of screen) ──
        sage: {
          DEFAULT: '#5B8C6E',
          light: '#E8F0EB',
          dark: '#4A7A5D'
        },

        // ── ACCENT CHAUD (terracotta) ──
        terracotta: {
          DEFAULT: '#C4856C',
          light: '#F5E0D5',
          dark: '#A8705A'
        },

        // ── SÉMANTIQUE ──
        gold: {
          DEFAULT: '#D4A060'
        },
        rose: {
          DEFAULT: '#D4738B'
        },
        sky: {
          DEFAULT: '#7EB0D4'
        },
        success: {
          DEFAULT: '#7BAE7F'
        },

        // ── TEXTE ──
        charcoal: {
          DEFAULT: '#2D3436'
        },
        stone: {
          DEFAULT: '#6B7280'
        },
        mist: {
          DEFAULT: '#9CA3AF'
        },
        divider: {
          DEFAULT: '#E5E1DB'
        },

        // Legacy aliases for compatibility (map old → new)
        teal: {
          dark: '#5B8C6E',
          deep: '#4A7A5D',
          DEFAULT: '#5B8C6E',
          medium: '#5B8C6E',
          light: '#E8F0EB'
        },
        aubergine: {
          DEFAULT: '#C4856C'
        },
        marine: {
          DEFAULT: '#2D3436'
        },
        sable: {
          DEFAULT: '#FBF7F2',
          light: '#FBF7F2',
          dark: '#E5E1DB'
        },
        warmgray: {
          DEFAULT: '#6B7280',
          light: '#E5E1DB'
        },

        // Neutral scale (keep for compatibility)
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827'
        },

        // Legacy accent colors mapped to new palette
        accent: {
          orange: '#D4A060',
          pink: '#D4738B',
          success: '#7BAE7F',
          danger: '#D4738B',
          warning: '#D4A060'
        }
      },
      boxShadow: {
        'card': '0 1px 3px rgba(45, 52, 54, 0.03), 0 4px 12px rgba(45, 52, 54, 0.02)',
        'card-hover': '0 2px 8px rgba(45, 52, 54, 0.05), 0 8px 24px rgba(45, 52, 54, 0.04)',
        'soft': '0 1px 3px rgba(45, 52, 54, 0.03), 0 4px 12px rgba(45, 52, 54, 0.02)',
        'sm': '0 1px 2px rgba(45, 52, 54, 0.03)',
        'md': '0 2px 8px rgba(45, 52, 54, 0.05), 0 4px 16px rgba(45, 52, 54, 0.03)',
        'lg': '0 4px 16px rgba(45, 52, 54, 0.06), 0 12px 32px rgba(45, 52, 54, 0.04)',
        // Legacy aliases
        'teal-glow': '0 2px 8px rgba(91, 140, 110, 0.15)',
        'teal-hover': '0 2px 8px rgba(45, 52, 54, 0.05), 0 8px 24px rgba(45, 52, 54, 0.04)',
        'action-hover': '0 2px 8px rgba(45, 52, 54, 0.05), 0 8px 24px rgba(45, 52, 54, 0.04)',
        'glow': '0 0 20px rgba(91, 140, 110, 0.2)',
        'glow-emerald': '0 0 20px rgba(123, 174, 127, 0.2)',
        'glow-orange': '0 0 20px rgba(196, 133, 108, 0.2)'
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        }
      },
      backgroundImage: {
        'gradient-cream': 'linear-gradient(180deg, #FBF7F2 0%, #FFFFFF 60%, #FFFFFF 100%)'
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      spacing: {
        'sidebar': '240px',
        'header': '64px'
      }
    }
  },
  plugins: []
} satisfies Config;
