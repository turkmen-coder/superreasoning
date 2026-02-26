/**
 * Tailwind CSS konfigürasyonu — docs/design-system.json ile uyumlu.
 * Design tokens: cyberpunk renk paleti, tipografi, spacing.
 * @see docs/design-system.json, docs/WCAG_CHECKLIST.md
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './*.{tsx,ts,html}',
    './components/**/*.{tsx,ts}',
    './services/**/*.{tsx,ts}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic colors (META-ARCH V4 theme)
        'cyber-black': '#121212', // Deep Charcoal
        'cyber-dark': '#0a0a0f',
        'cyber-gray': '#1e1e24', // Slate Gray
        'cyber-border': '#2a2a35',
        'cyber-primary': '#00E5FF', // Electric Cyan
        'cyber-secondary': '#ff003c',
        'cyber-accent': '#7000ff',
        'cyber-success': '#00ff9f',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': '0.625rem',
        'sm': '0.75rem',
        'base': '0.875rem',
        'lg': '1rem',
        'xl': '1.125rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '5xl': '3rem',
        '7xl': '4.5rem',
      },
      borderRadius: {
        'sm': '2px',
        'md': '4px',
        'lg': '8px',
        'full': '9999px',
      },
      boxShadow: {
        'glow-primary': '0 0 25px rgba(0, 229, 255, 0.6)',
        'glow-primary-soft': '0 0 15px rgba(0, 229, 255, 0.15)',
        'glow-primary-subtle': '0 0 10px rgba(0, 229, 255, 0.08)',
        'glow-secondary': '0 0 25px rgba(255, 0, 60, 0.6)',
        'glow-accent': '0 0 25px rgba(112, 0, 255, 0.6)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'gradient-xy': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
      },
    },
  },
  plugins: [],
};
