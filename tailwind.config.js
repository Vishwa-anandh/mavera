/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Google Sans Flex"', '"Google Sans"', 'system-ui', 'sans-serif'],
        sans: ['"Google Sans Flex"', '"Google Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          0: '#FFFFFF',
          25: '#FCFCFD',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        brand: {
          50: '#F2F9FD',
          100: '#E4F3FA',
          200: '#C5E5F4',
          300: '#98D0E8',
          400: '#68B5DB',
          500: '#3C93CB',
          600: '#2178B2',
          700: '#17689F',
          800: '#165E8E',
          900: '#164E73',
          950: '#0C2A3E',
        },
        save: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a6f4cf',
          300: '#6ee7b6',
          400: '#34d39e',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        warn: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      animation: {
        'marquee': 'marquee 40s linear infinite',
        'fade-up': 'fade-up 0.6s ease-out both',
        'fade-in': 'fade-in 0.5s ease-out both',
        'float': 'float 6s ease-in-out infinite',
        'slide-x': 'slide-x 3s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-x': {
          '0%,100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(8px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-dot': {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.3)' },
        },
      },
    },
  },
  plugins: [],
};
