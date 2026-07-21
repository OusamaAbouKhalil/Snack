import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['ui-sans-serif', 'system-ui', 'serif'],
      },
      colors: {
        // Every `gray-*` utility in the app (cards, borders, muted text, dark
        // surfaces) used Tailwind's default cool blue-gray, which read as a
        // mismatched, generic admin theme next to the warm gold/green brand
        // palette. Rebasing `gray` onto Tailwind's warm "stone" ramp retints
        // every existing `gray-*`/`dark:bg-gray-*` class at once.
        gray: colors.stone,
        primary: {
          50: '#fffef9',
          100: '#fffef5',
          200: '#fffbeb',
          300: '#fff6d6',
          400: '#ffe6ae', // Light cream - base color
          500: '#F1B71C', // Gold/yellow - main brand color
          600: '#d9a519',
          700: '#c19316',
          800: '#a98113',
          900: '#916f10',
        },
        green: {
          50: '#e6f0e8',
          100: '#cce1d1',
          200: '#99c3a3',
          300: '#66a575',
          400: '#338747',
          500: '#044211', // Dark green - base color
          600: '#033b0f',
          700: '#02340d',
          800: '#022d0b',
          900: '#012609',
        },
        cream: {
          50: '#fffef9',
          100: '#fffef5',
          200: '#fffceb',
          300: '#fff9e1',
          400: '#ffe6ae', // Light cream - base color
          500: '#ffd97a',
          600: '#ffcc46',
          700: '#ffbf12',
          800: '#e6a800',
          900: '#cc9600',
        },
        // Keep brown for backward compatibility, but use green tones
        brown: {
          50: '#e6f0e8',
          100: '#cce1d1',
          200: '#99c3a3',
          300: '#66a575',
          400: '#338747',
          500: '#044211', // Dark green
          600: '#033b0f',
          700: '#02340d',
          800: '#022d0b',
          900: '#012609',
        },
        // Dark admin-sidebar tone, built from the brand's own dark green
        // rather than an unrelated brown, so the rail stays on-brand.
        cocoa: {
          800: '#022d0b',
          900: '#012609',
          950: '#011a04',
        },
      },
      boxShadow: {
        card: '0 2px 12px -2px rgb(4 66 17 / 0.10), 0 1px 3px rgb(4 66 17 / 0.06)',
        'card-hover': '0 20px 45px -15px rgb(4 66 17 / 0.30)',
        glow: '0 0 0 6px rgb(241 183 28 / 0.18)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
