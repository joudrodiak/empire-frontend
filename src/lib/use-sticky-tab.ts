'use client'
import { useState, useEffect, useCallback } from 'react'

/**
 * Tab state that survives a page reload. The active tab is persisted to
 * localStorage under a stable key (one per tab group), so reloading the page
 * keeps you on the exact section you were viewing instead of snapping back to
 * the first tab. SSR-safe: renders `initial` on the server, then restores the
 * stored value on mount (a one-frame flash, never a hydration mismatch).
 */
export function useStickyTab(key: string, initial: string): [string, (v: string) => void] {
  const storageKey = `empire:tab:${key}`
  const [tab, setTabState] = useState<string>(initial)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setTabState(stored)
    } catch { /* localStorage unavailable — fall back to initial */ }
  }, [storageKey])

  const setTab = useCallback((v: string) => {
    setTabState(v)
    try { localStorage.setItem(storageKey, v) } catch { /* ignore */ }
  }, [storageKey])

  return [tab, setTab]
}
