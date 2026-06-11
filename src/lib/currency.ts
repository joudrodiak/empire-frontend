/**
 * System currency (backlog A14): money inputs show the active currency symbol
 * fixed inside the field. The choice persists per device (like text scale) and
 * defaults to EUR — the platform's accounting default.
 */
export const CURRENCY_KEY = 'empire-os-currency'

export const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export function currencyCode(): CurrencyCode {
  if (typeof window === 'undefined') return 'EUR'
  try {
    const c = localStorage.getItem(CURRENCY_KEY)
    if (c && CURRENCIES.some(x => x.code === c)) return c as CurrencyCode
  } catch { /* noop */ }
  return 'EUR'
}

export function currencySymbol(): string {
  const code = currencyCode()
  return CURRENCIES.find(c => c.code === code)?.symbol ?? '€'
}
