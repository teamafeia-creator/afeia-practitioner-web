import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

type Scale = Record<string, string>;

// Inverse les teintes claires et les textes foncés d'une échelle Tailwind
// pour qu'elle fonctionne sur fond sombre (bg-red-50 → teinte sombre, text-red-700 → texte clair)
const invert = (scale: Scale): Scale => ({
  50: scale[950],
  100: scale[900],
  200: scale[800],
  300: scale[700],
  400: scale[400],
  500: scale[500],
  600: scale[600],
  700: scale[300],
  800: scale[200],
  900: scale[100],
  950: scale[50]
});

// Gris du thème mobile, du plus sombre (50) au plus clair (950)
const darkGray: Scale = {
  50: '#10141C',
  100: '#151A23',
  200: '#2A3140',
  300: '#3A4252',
  400: '#5C6573',
  500: '#8B95A5',
  600: '#A3ACBA',
  700: '#BFC6D1',
  800: '#D6DCE5',
  900: '#E8EDF4',
  950: '#F4F7FA'
};

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        serif: ['var(--font-source-serif)', 'Source Serif 4', 'Georgia', 'serif']
      },
      colors: {
        // Palette alignée sur le thème de l'app mobile (lib/core/theme/app_theme.dart)

        // ── SURFACES (dark) ──
        ink: '#0A0E14',              // cosmicBlack — fond principal / texte sur couleur pastel
        cream: '#0A0E14',            // ancien fond crème → fond principal sombre
        surface: {
          DEFAULT: '#151A23',        // deepSlate — cartes
          raised: '#1C2230'          // raisedSlate — cartes élevées, champs
        },
        white: '#FFFFFF',

        // ── SIDEBAR ──
        'sidebar-bg': '#151A23',
        'sidebar-text': '#E8EDF4',
        'sidebar-hover': 'rgba(255,255,255,0.06)',
        'sidebar-active': '#6DD4B8',

        // ── PRIMAIRE (vert menthe AFEIA) ──
        sage: {
          DEFAULT: '#6DD4B8',        // primaryGreen
          light: '#23383B',          // teinte menthe sur fond sombre
          dark: '#A8E6CF',           // mintGreen — hover / texte sur teinte
          deep: '#5BC2A6'            // menthe un ton plus soutenu (hover)
        },

        // ── ACCENT CHAUD (vitalité & énergie) ──
        terracotta: {
          DEFAULT: '#E8A87C',        // vibrantOrange
          light: '#373131',
          dark: '#D4A574'            // goldOrange
        },

        // ── SÉMANTIQUE ──
        gold: {
          DEFAULT: '#D4A574'
        },
        rose: {
          DEFAULT: '#E57B7B'         // error
        },
        sky: {
          DEFAULT: '#7B93DB'         // calmBlue
        },
        success: {
          DEFAULT: '#6DD4B8'
        },

        // ── TEXTE ──
        charcoal: {
          DEFAULT: '#E8EDF4'         // textWhite — texte principal
        },
        stone: {
          DEFAULT: '#8B95A5'         // textGray — texte secondaire
        },
        mist: {
          DEFAULT: '#5C6573'         // textDim — texte tertiaire
        },
        divider: {
          DEFAULT: '#2A3140'         // dividerGray
        },

        // Legacy aliases for compatibility (map old → new)
        teal: {
          ...invert(colors.teal),
          dark: '#6DD4B8',
          deep: '#2D7A6E',
          DEFAULT: '#6DD4B8',
          medium: '#6DD4B8',
          light: '#23383B'
        },
        aubergine: {
          DEFAULT: '#E8A87C'
        },
        marine: {
          DEFAULT: '#E8EDF4'
        },
        sable: {
          DEFAULT: '#0A0E14',
          light: '#151A23',
          dark: '#2A3140'
        },
        warmgray: {
          DEFAULT: '#8B95A5',
          light: '#2A3140'
        },

        // Échelles de gris inversées pour le mode sombre (50 = le plus sombre)
        neutral: darkGray,
        gray: darkGray,
        slate: darkGray,
        zinc: darkGray,

        // Teintes claires (50-300) et textes foncés (700-950) inversés,
        // les tons pleins (400-600) restent identiques
        red: invert(colors.red),
        orange: invert(colors.orange),
        amber: invert(colors.amber),
        yellow: invert(colors.yellow),
        lime: invert(colors.lime),
        green: invert(colors.green),
        emerald: invert(colors.emerald),
        cyan: invert(colors.cyan),
        blue: invert(colors.blue),
        indigo: invert(colors.indigo),
        violet: invert(colors.violet),
        purple: invert(colors.purple),
        fuchsia: invert(colors.fuchsia),
        pink: invert(colors.pink),

        // Legacy accent colors mapped to new palette
        accent: {
          orange: '#E8A87C',
          pink: '#E8A5C6',
          success: '#6DD4B8',
          danger: '#E57B7B',
          warning: '#E8A87C'
        }
      },
      ringOffsetColor: {
        DEFAULT: '#0A0E14'
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15)',
        'card-hover': '0 2px 8px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.25)',
        'soft': '0 1px 2px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15)',
        'sm': '0 1px 2px rgba(0, 0, 0, 0.25)',
        'md': '0 2px 8px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2)',
        'lg': '0 4px 16px rgba(0, 0, 0, 0.35), 0 12px 32px rgba(0, 0, 0, 0.25)',
        // Legacy aliases
        'teal-glow': '0 2px 8px rgba(109, 212, 184, 0.15)',
        'teal-hover': '0 2px 8px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.25)',
        'action-hover': '0 2px 8px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.25)',
        'glow': '0 0 20px rgba(109, 212, 184, 0.2)',
        'glow-emerald': '0 0 20px rgba(109, 212, 184, 0.2)',
        'glow-orange': '0 0 20px rgba(232, 168, 124, 0.2)'
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
        'gradient-cream': 'linear-gradient(180deg, #0A0E14 0%, #151A23 100%)',
        'gradient-primary': 'linear-gradient(135deg, #6DD4B8 0%, #2D7A6E 100%)',
        'gradient-energy': 'linear-gradient(135deg, #E8A87C 0%, #D4A574 100%)',
        'gradient-calm': 'linear-gradient(135deg, #7B93DB 0%, #4A5F8C 100%)',
        'gradient-cycle': 'linear-gradient(135deg, #E8A5C6 0%, #B89FD9 100%)',
        'gradient-clarity': 'linear-gradient(135deg, #6DCFE0 0%, #5FB5A6 100%)'
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      maxWidth: {
        content: '1180px'
      },
      spacing: {
        'sidebar': '248px',
        'header': '64px'
      }
    }
  },
  plugins: []
} satisfies Config;
