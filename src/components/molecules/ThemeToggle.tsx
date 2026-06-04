'use client'
import React from 'react'
import { EmpireIcon } from '../atoms/EmpireIcon'

/**
 * ThemeToggle — flips the whole surface between the dark void palette and a
 * warm parchment light theme by toggling `html.dark` / `html.light`. The choice
 * persists in localStorage (`empire-os-theme`) and is read back by the inline
 * boot script in layout.tsx so there's no flash on reload.
 */
type Theme = 'dark' | 'light'

function current(): Theme {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.classList.contains('light') ? 'light' : 'dark'
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = React.useState<Theme>('dark')

  React.useEffect(() => {
    setTheme(current())
  }, [])

  function toggle() {
    const next: Theme = current() === 'light' ? 'dark' : 'light'
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(next)
    try {
      localStorage.setItem('empire-os-theme', next)
    } catch {
      /* storage blocked — runtime toggle still applies */
    }
    setTheme(next)
  }

  const isLight = theme === 'light'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Dark mode' : 'Light mode'}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-empire-border/70 bg-empire-elevated/60 leading-none text-empire-text-muted transition-colors hover:border-empire-gold/50 hover:text-empire-gold ${className}`}
    >
      <EmpireIcon name={isLight ? 'moon' : 'sun'} size={16} />
    </button>
  )
}
