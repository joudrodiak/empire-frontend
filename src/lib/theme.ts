export const EMPIRE_COLORS = {
  obsidian: '#080810',
  gold: '#C9A233',
  ivory: '#F4EFE3',
  surface: '#12121F',
  border: '#2A2A44',
  muted: '#7A7468',
} as const

export const DEPARTMENT_ACCENT = EMPIRE_COLORS.gold
export const POSITIVE_ACCENT = EMPIRE_COLORS.gold
export const WATCH_ACCENT = EMPIRE_COLORS.ivory
export const RISK_ACCENT = EMPIRE_COLORS.obsidian

const PALETTE = new Set([
  EMPIRE_COLORS.obsidian.toLowerCase(),
  EMPIRE_COLORS.gold.toLowerCase(),
  EMPIRE_COLORS.ivory.toLowerCase(),
])

export function empireColor(value?: string | null, fallback = EMPIRE_COLORS.gold) {
  const color = (value || '').trim().toLowerCase()
  if (!color) return fallback
  if (PALETTE.has(color)) {
    if (color === EMPIRE_COLORS.obsidian.toLowerCase()) return EMPIRE_COLORS.obsidian
    if (color === EMPIRE_COLORS.ivory.toLowerCase()) return EMPIRE_COLORS.ivory
    return EMPIRE_COLORS.gold
  }
  return fallback
}

export function empireTint(value?: string | null, alpha = '22', fallback = EMPIRE_COLORS.gold) {
  return `${empireColor(value, fallback)}${alpha}`
}

export function toneForState(state?: string) {
  const value = (state || '').toLowerCase()
  if (/(risk|critical|blocked|breach|churn|void|failed|urgent|high|overdue)/.test(value)) return RISK_ACCENT
  if (/(watch|pending|draft|review|medium|sent|progress|talks)/.test(value)) return WATCH_ACCENT
  return POSITIVE_ACCENT
}
