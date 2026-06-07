const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

// Active company (tenant) — Empire OS profiles are COMPANIES. The active company
// slug is stored in localStorage by the profile switcher; we forward it to the
// API as `x-company-slug` so every request is scoped to the selected company.
// Server-side / no storage → no header (back-compat: API returns all rows).
const PROFILE_KEY = 'empire-os-active-profile'
const TOKEN_KEY = 'empire-os-token'

function activeCompanySlug(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(PROFILE_KEY) } catch { return null }
}

function authToken(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

// Every request carries the active company scope AND (when logged in) the
// session token so the API can enforce IAM. The server soft-attaches the user
// from this Bearer header; protected writes require it.
function companyHeaders(base: Record<string, string> = {}): Record<string, string> {
  const out = { ...base }
  // An explicit override (e.g. seeding a brand-new tenant from the onboarding
  // wizard before it becomes the active company) wins over the stored slug.
  const slug = out['x-company-slug'] || activeCompanySlug()
  if (slug) out['x-company-slug'] = slug
  const tok = authToken()
  if (tok) out['Authorization'] = `Bearer ${tok}`
  return out
}

// Panels fetch their data on mount with the current company header. When the
// active company changes we must re-pull every panel with the new scope; the
// switcher dispatches `empire-profile-change`. A single reload here (in the lib,
// not in any panel) guarantees all in-flight and cached data is refetched for
// the newly selected company. Guarded so it only ever runs in the browser.
if (typeof window !== 'undefined') {
  window.addEventListener('empire-profile-change', () => {
    // Defer so localStorage is written by the switcher before we re-read it.
    setTimeout(() => window.location.reload(), 0)
  })
}

// Surface the server's JSON `error` message (not just the status code) so UI
// can show a real reason — e.g. "That reporting line would create a cycle."
async function ensureOk(res: Response) {
  if (res.ok) return
  // Session gone/expired → drop the token and let the AuthGate bounce to /login.
  if (res.status === 401 && typeof window !== 'undefined') {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
    window.dispatchEvent(new Event('empire-auth-expired'))
  }
  let msg = `API error: ${res.status}`
  try {
    const body = await res.json()
    if (body && typeof body.error === 'string') msg = body.error
  } catch { /* non-JSON error body — keep the status message */ }
  throw new Error(msg)
}

export async function fetcher(path: string) {
  const res = await fetch(`${API}${path}`, { headers: companyHeaders() })
  await ensureOk(res)
  return res.json()
}

export async function post(path: string, body: unknown, companySlug?: string) {
  const base: Record<string, string> = { 'Content-Type': 'application/json' }
  if (companySlug) base['x-company-slug'] = companySlug
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: companyHeaders(base),
    body: JSON.stringify(body),
  })
  await ensureOk(res)
  return res.json()
}

export async function patch(path: string, body: unknown, companySlug?: string) {
  const base: Record<string, string> = { 'Content-Type': 'application/json' }
  if (companySlug) base['x-company-slug'] = companySlug
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: companyHeaders(base),
    body: JSON.stringify(body),
  })
  await ensureOk(res)
  return res.json()
}

export async function del(path: string) {
  const res = await fetch(`${API}${path}`, { method: 'DELETE', headers: companyHeaders() })
  await ensureOk(res)
  return res.json()
}

// Download a file (e.g. a CSV export) through the API with the active company +
// auth headers attached, then trigger a browser save. A plain <a download> can't
// carry the tenant/auth headers, so we fetch as a blob and save it here.
export async function download(path: string, filename: string) {
  const res = await fetch(`${API}${path}`, { headers: companyHeaders() })
  await ensureOk(res)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ragColor(status: string) {
  switch (status) {
    case 'GREEN': return 'rag-green'
    case 'AMBER': return 'rag-amber'
    case 'RED': return 'rag-red'
    default: return 'rag-pending'
  }
}

export function ragLabel(status: string) {
  switch (status) {
    case 'GREEN': return 'Thriving'
    case 'AMBER': return 'Stable'
    case 'RED': return 'Critical'
    default: return 'Pending'
  }
}

export function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}
