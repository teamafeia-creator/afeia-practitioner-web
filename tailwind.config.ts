import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          deep: '#1A5C5C',
          DEFAULT: '#2A8080',
          light: '#5BA6A6'
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
          DEFAULT: '#F5EFE7'
        },
        warmgray: {
          DEFAULT: '#8C8680'
        },
        charcoal: {
          DEFAULT: '#3D3D3D'
        }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,0.06)'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem'
      }
    }
  },
  plugins: []
} satisfies Config;
