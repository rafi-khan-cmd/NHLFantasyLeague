/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        nhl: {
          blue: '#003E7E',      // NHL Primary Blue
          'blue-dark': '#002244', // Darker NHL Blue
          'blue-light': '#1E5BA8', // Lighter NHL Blue
          red: '#C8102E',       // NHL Red
          'red-dark': '#8B0000',  // Darker Red
          'red-light': '#E63946', // Lighter Red
          white: '#FFFFFF',
          black: '#000000',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        maroon: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#800000', // Maroon
        },
      },
    },
  },
  plugins: [],
}

