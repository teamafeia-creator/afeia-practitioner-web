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
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif']
      },
      colors: {
        // Primary AFEIA colors - Updated design system
        teal: {
          dark: '#1A6C6C',
          deep: '#155858',
          DEFAULT: '#1A6C6C',
          medium: '#2A8080',
          light: '#E8F0F0'
        },
        aubergine: {
          DEFAULT: '#85004F'
        },
        gold: {
          DEFAULT: '#FF9A3D'
        },
        marine: {
          DEFAULT: '#40464F'
        },
        sage: {
          DEFAULT: '#89A889'
        },
        sable: {
          DEFAULT: '#F5EFE7',
          light: '#FFF8F0',
          dark: '#EDE5D8'
        },
        warmgray: {
          DEFAULT: '#8C8680',
          light: '#C4C0BC'
        },
        charcoal: {
          DEFAULT: '#3D3D3D'
        },
        // Modern wellness color palette
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#4169E1',
          600: '#5B7FE8',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81'
        },
        emerald: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B'
        },
        accent: {
          orange: '#F59E0B',
          pink: '#EC4899',
          success: '#22C55E',
          danger: '#EF4444',
          warning: '#F59E0B'
        },
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
        }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,0.06)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 20px 40px rgba(0,0,0,0.1)',
        glow: '0 0 20px rgba(65, 105, 225, 0.3)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-orange': '0 0 20px rgba(245, 158, 11, 0.3)',
        // New shadows for design system
        sm: '0 2px 8px rgba(26, 108, 108, 0.04)',
        md: '0 4px 20px rgba(26, 108, 108, 0.08)',
        lg: '0 8px 32px rgba(26, 108, 108, 0.12)',
        'teal-glow': '0 4px 12px rgba(26, 108, 108, 0.3)',
        'teal-hover': '0 6px 24px rgba(26, 108, 108, 0.12)',
        'action-hover': '0 12px 32px rgba(26, 108, 108, 0.25)'
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '12px',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'gradient': 'gradient 8s ease infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
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
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-wellness': 'linear-gradient(135deg, #4169E1 0%, #5B7FE8 50%, #10B981 100%)',
        'gradient-calm': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-ocean': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        // New gradients for design system
        'gradient-sable': 'linear-gradient(135deg, #EDE5D8 0%, #F5EFE7 25%, #FFF8F0 50%, #F5F4F0 75%, #EDE5D8 100%)',
        'gradient-teal-btn': 'linear-gradient(135deg, #1A6C6C 0%, #155858 100%)'
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
