/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7f1',
          100: '#d5ecdd',
          200: '#acd8bc',
          500: '#3c8a5e',
          600: '#2f7350',
          700: '#2a6045',
          800: '#244e39',
          900: '#1d3f2f',
        },
        // Fixture difficulty palette (matches the original spreadsheet's conditional formatting).
        fdr: {
          1: '#2e8b57',
          2: '#63be7b',
          3: '#ffe484',
          4: '#f8a36b',
          5: '#f06a6a',
          blank: '#d1d5db',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
