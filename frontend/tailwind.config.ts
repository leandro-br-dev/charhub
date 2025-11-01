import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import lineClamp from '@tailwindcss/line-clamp';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Cyberpunk Neon Colors - Using CSS variables for theme switching
        primary: {
          DEFAULT: 'var(--color-primary)',
          100: 'var(--color-primary-100)',
          500: 'var(--color-primary-500)',
          900: 'var(--color-primary-900)'
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          500: 'var(--color-secondary)'
        },
        accent: 'var(--color-accent)',
        muted: 'var(--color-muted)',
        danger: 'var(--color-danger)',
        success: 'var(--color-success)',
        info: 'var(--color-info)',

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
  plugins: [forms, lineClamp]
};

export default config;
