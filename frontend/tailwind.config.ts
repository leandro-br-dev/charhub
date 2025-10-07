import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Cor principal amarelo/dourado #FFC917
        primary: {
          DEFAULT: '#FFC917',
          100: '#FFDE72',
          500: '#FFC917',
          900: '#967300'
        },
        secondary: {
          DEFAULT: '#10b981',
          500: '#10b981'
        },
        accent: '#f59e0b',
        muted: '#6b7280',
        danger: '#ef4444',
        success: '#22c55e',
        info: '#0ea5e9',

        // Cores de fundo e texto
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',

        // Cores semânticas
        title: 'var(--color-title)',
        description: 'var(--color-description)',
        content: 'var(--color-content)',

        // Superfícies
        card: 'var(--color-card)',
        border: 'var(--color-border)',

        // Níveis de cor
        light: 'var(--color-light)',
        normal: 'var(--color-normal)',
        dark: 'var(--color-dark)'
      }
    }
  },
  plugins: [forms]
};

export default config;
