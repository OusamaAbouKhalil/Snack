/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
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
        }
      }
    },
  },
  plugins: [],
};
