import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        empire: {
          // Surface + text tokens are driven by CSS variables (see globals.css
          // :root / html.dark / html.light) so the dark/light toggle flips the
          // whole surface at once. Gold + RAG stay fixed hex. The `<alpha-value>`
          // placeholder keeps Tailwind opacity modifiers (e.g. /40) working.
          void: 'rgb(var(--e-void) / <alpha-value>)',
          deep: 'rgb(var(--e-deep) / <alpha-value>)',
          bg: 'rgb(var(--e-bg) / <alpha-value>)',
          'bg-soft': 'rgb(var(--e-bg-soft) / <alpha-value>)',
          surface: 'rgb(var(--e-surface) / <alpha-value>)',
          elevated: 'rgb(var(--e-elevated) / <alpha-value>)',
          border: 'rgb(var(--e-border) / <alpha-value>)',
          gold: 'rgb(var(--e-gold) / <alpha-value>)',
          'gold-muted': 'rgb(var(--e-gold) / <alpha-value>)',
          'gold-dim': 'rgb(var(--e-gold) / 0.18)',
          ivory: 'rgb(var(--e-ivory) / <alpha-value>)',
          ink: 'rgb(var(--e-ink) / <alpha-value>)',
          text: 'rgb(var(--e-text) / <alpha-value>)',
          'text-muted': 'rgb(var(--e-text-muted) / <alpha-value>)',
          'text-dim': 'rgb(var(--e-text-dim) / <alpha-value>)',
          green: 'rgb(var(--e-gold) / <alpha-value>)',
          'green-bright': 'rgb(var(--e-gold) / <alpha-value>)',
          'green-bg': 'rgb(var(--e-gold) / 0.12)',
          amber: 'rgb(var(--e-gold) / <alpha-value>)',
          'amber-bright': 'rgb(var(--e-text) / <alpha-value>)',
          'amber-bg': 'rgb(var(--e-elevated) / <alpha-value>)',
          red: 'rgb(var(--e-ink) / <alpha-value>)',
          'red-bright': 'rgb(var(--e-ivory) / <alpha-value>)',
          'red-bg': 'rgb(var(--e-void) / <alpha-value>)',
          crimson: 'rgb(var(--e-ink) / <alpha-value>)',
          'royal-blue': 'rgb(var(--e-border) / <alpha-value>)',
          'royal-purple': 'rgb(var(--e-border) / <alpha-value>)',
        }
      },
      fontFamily: {
        empire: ['Georgia', 'Times New Roman', 'serif'],
        data: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 20px rgba(201, 162, 51, 0.15)',
        'gold-border': 'inset 0 0 0 1px rgba(201, 162, 51, 0.2)',
        'empire-card': '0 4px 24px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'page-enter': 'page-enter 0.45s cubic-bezier(0.22,1,0.36,1)',
        'pop-in': 'pop-in 0.28s cubic-bezier(0.22,1,0.36,1)',
        'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.22,1,0.36,1)',
      },
      keyframes: {
        'page-enter': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.995)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.96)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201, 162, 51, 0)' },
          '50%': { boxShadow: '0 0 0 4px rgba(201, 162, 51, 0.1)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      }
    },
  },
  plugins: [],
}
export default config
