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
        // Sampled directly from the Mat3amji logo (deep green badge, gold
        // chef-hat/text, cream utensils) so the app's theme pixel-matches it.
        primary: {
          50: '#fffef9',
          100: '#fffef5',
          200: '#fffbeb',
          300: '#fceec2',
          400: '#f8d772',
          500: '#F3B817', // Gold — sampled from logo text/chef-hat
          600: '#d9a415',
          700: '#bf9013',
          800: '#a67c10',
          900: '#8c680e',
        },
        green: {
          50: '#e9f3ee',
          100: '#c9e2d4',
          200: '#94c5a9',
          300: '#5ea87e',
          400: '#2d7f54',
          500: '#128040',
          600: '#0f6d37',
          700: '#0c5f30',
          800: '#0a5129',
          900: '#084322', // Deep green — sampled from logo background
        },
        cream: {
          50: '#fffef9',
          100: '#fffef5',
          200: '#fffceb',
          300: '#fef3d9',
          400: '#FEE7AD', // Cream — sampled from logo utensils
          500: '#fddb85',
          600: '#fccf5c',
          700: '#f5be2e',
          800: '#e6a800',
          900: '#cc9600',
        },
        // Keep brown for backward compatibility, but use green tones
        brown: {
          50: '#e9f3ee',
          100: '#c9e2d4',
          200: '#94c5a9',
          300: '#5ea87e',
          400: '#2d7f54',
          500: '#128040',
          600: '#0f6d37',
          700: '#0c5f30',
          800: '#0a5129',
          900: '#084322',
        },
        // Dark admin-sidebar tone, built from the brand's own logo-green
        // rather than an unrelated brown, so the rail stays on-brand.
        cocoa: {
          800: '#0a5129',
          900: '#084322',
          950: '#052b16',
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
