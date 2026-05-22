import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: {
          950: '#07111f',
          900: '#0b1730',
          800: '#13254a',
          700: '#1d3c74',
          600: '#235ea8',
          500: '#3b82f6'
        }
      },
      boxShadow: {
        soft: '0 20px 60px rgba(15, 23, 42, 0.10)'
      }
    }
  },
  plugins: []
} satisfies Config;
