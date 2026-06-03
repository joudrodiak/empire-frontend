// Deterministic demo-data engine — seeded so server & client render identically (no hydration drift).
// Real API data overrides these where available; this keeps every enterprise module populated.

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seedFrom(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** Trending series of `n` points around `base`, with growth and noise. */
export function series(seed: string, n: number, base: number, growth = 0.04, noise = 0.08) {
  const rnd = mulberry32(seedFrom(seed))
  const out: number[] = []
  let v = base
  for (let i = 0; i < n; i++) {
    v = v * (1 + growth + (rnd() - 0.5) * noise)
    out.push(Math.max(0, Math.round(v)))
  }
  return out
}

export function pct(seed: string, n: number, base: number, swing = 6) {
  const rnd = mulberry32(seedFrom(seed))
  return Array.from({ length: n }, () => Math.max(0, Math.min(100, Math.round(base + (rnd() - 0.5) * swing))))
}

export function pick<T>(seed: string, arr: T[]): T {
  const rnd = mulberry32(seedFrom(seed))
  return arr[Math.floor(rnd() * arr.length)]
}

export function delta(s: number[]) {
  if (s.length < 2) return { txt: '0%', good: true }
  const d = (s[s.length - 1] - s[s.length - 2]) / (s[s.length - 2] || 1) * 100
  return { txt: `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`, good: d >= 0 }
}

export const MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
export function lastMonths(n: number) {
  const now = new Date(); const out: string[] = []
  for (let i = n - 1; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); out.push(MONTHS[d.getMonth()]) }
  return out
}

export function eur(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)
}
export function eurK(n: number) {
  if (Math.abs(n) >= 1000) return `€${(n / 1000).toFixed(1)}k`
  return eur(n)
}
export function num(n: number) { return new Intl.NumberFormat('en-US').format(Math.round(n || 0)) }

export const ACCENTS: Record<string, string> = {
  finance: '#c9a233', engineering: '#3b82f6', marketing: '#22c55e', partnerships: '#06b6d4',
  'client-success': '#10b981', creative: '#e8b4b8', hr: '#a78bfa', legal: '#94a3b8',
  operations: '#8b5cf6', executive: '#e8c14f', advisory: '#f59e0b',
}
