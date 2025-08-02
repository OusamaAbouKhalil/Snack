/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf8f3',
          100: '#f4f0e6',
          200: '#e8dcc7',
          300: '#dac4a0',
          400: '#DAB674',
          500: '#c18141',
          600: '#a86b35',
          700: '#8b552a',
          800: '#714426',
          900: '#603913',
        },
        brown: {
          50: '#faf7f2',
          100: '#f4ede1',
          200: '#e8d8c2',
          300: '#dbbf9c',
          400: '#c18141',
          500: '#a86b35',
          600: '#8b552a',
          700: '#714426',
          800: '#5c3720',
          900: '#603913',
        }
      }
    },
  },
  plugins: [],
};
