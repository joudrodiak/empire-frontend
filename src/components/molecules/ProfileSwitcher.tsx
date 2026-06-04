'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { LiquidMetalButton } from '@/components/atoms/LiquidMetalButton'
import { Modal } from '@/components/molecules/Modal'
import { COMPANIES } from '@/lib/profiles'
import { fetcher, post } from '@/lib/api'
import { useAuth, userCan } from '@/lib/auth'

/**
 * EMPIRE OS wordmark + company switcher. Profiles are COMPANIES (Cregen Inc.,
 * Studio, Labs, Advisory + any tenant provisioned at runtime) — each with its
 * own identity and data kept separate. DB-driven: reads `/api/companies` and
 * writes the active slug to localStorage (`empire-os-active-profile`), which
 * `lib/api.ts` forwards as `x-company-slug` to scope every request. Owners with
 * `company:manage` can spin up a fresh tenant inline.
 */
type Company = { id: string; slug: string; name: string; short: string; tagline: string; type: string; hq: string; founded: string }
type Branded = Company & { icon: IconName; accent: string }

const KEY = 'empire-os-active-profile'
const EVT = 'empire-profile-change'

// Brand metadata (glyph + accent) lives client-side; merge onto DB rows by slug.
// New tenants fall back to the crown glyph and the house gold.
const META: Record<string, { icon: IconName; accent: string }> = Object.fromEntries(
  COMPANIES.map(c => [c.id, { icon: c.icon, accent: c.accent }])
)
const brand = (c: Company): Branded => ({ ...c, ...(META[c.slug] ?? { icon: 'crown', accent: '#C9A233' }) })

function readActiveSlug(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}

export function ProfileSwitcher({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth()
  const [companies, setCompanies] = useState<Branded[]>([])
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const canManage = userCan(user, 'company:manage') || userCan(user, '*')

  const load = useCallback(async () => {
    try {
      const rows: Company[] = (await fetcher('/api/companies')) || []
      const branded = rows.map(brand)
      setCompanies(branded)
      setActiveSlug(prev => {
        const saved = prev ?? readActiveSlug()
        return branded.some(c => c.slug === saved) ? saved : branded[0]?.slug ?? null
      })
    } catch { /* keep last good list */ }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  // Stay in sync if another mount switches companies.
  useEffect(() => {
    const onChange = (e: Event) => setActiveSlug((e as CustomEvent).detail as string)
    window.addEventListener(EVT, onChange)
    return () => window.removeEventListener(EVT, onChange)
  }, [])

  function select(slug: string) {
    setActiveSlug(slug); setOpen(false)
    try { localStorage.setItem(KEY, slug) } catch { /* noop */ }
    window.dispatchEvent(new CustomEvent(EVT, { detail: slug }))
  }

  const active = companies.find(c => c.slug === activeSlug) ?? companies[0]

  return (
    <div ref={ref} className="relative select-none">
      {!compact && (
        <div className="mb-1.5 flex items-center gap-2">
          <EmpireIcon name="crown" size={16} className="text-empire-gold" />
          <span className="font-empire text-sm uppercase tracking-[0.25em] text-empire-text">Empire OS</span>
        </div>
      )}

      {/* Trigger — liquid-metal gold hairline over glass */}
      <button
        onClick={() => setOpen(o => !o)}
        className="metal-frame group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all duration-200 hover:-translate-y-px"
      >
        <span className="medallion" style={{ width: 30, height: 30 }}>
          <EmpireIcon name={active?.icon ?? 'crown'} size={15} className="relative z-10" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-empire-text">{active?.name ?? 'Empire OS'}</span>
          <span className="block truncate text-[10px] uppercase tracking-widest text-empire-text-muted">{active?.type ?? '—'}</span>
        </span>
        <EmpireIcon name="chevron-down" size={14} className={`ml-1 text-empire-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <GlassPanel variant="gold" className="absolute left-0 z-50 mt-2 w-80 overflow-hidden p-1.5 animate-pop-in">
          <p className="px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-empire-text-muted">Switch company</p>
          <div className="max-h-[44vh] space-y-0.5 overflow-y-auto">
            {companies.map(c => {
              const on = c.slug === active?.slug
              return (
                <button
                  key={c.id}
                  onClick={() => select(c.slug)}
                  className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${on ? 'bg-empire-gold/15' : 'hover:bg-empire-elevated/60'}`}
                >
                  <span className="medallion mt-0.5 shrink-0" style={{ width: 30, height: 30 }}>
                    <EmpireIcon name={c.icon} size={15} className="relative z-10" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-empire-text">{c.name}</span>
                      {on && <EmpireIcon name="check" size={14} className="shrink-0 text-empire-gold" />}
                    </span>
                    <span className="block truncate text-[10px] text-empire-text-muted">{c.tagline}</span>
                    <span className="mt-0.5 block truncate text-[10px] uppercase tracking-widest text-empire-text-muted/80">{c.type} · {c.hq}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {canManage && (
            <>
              <div className="my-1 h-px bg-empire-border/60" aria-hidden />
              <button
                onClick={() => { setOpen(false); setCreateOpen(true) }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-empire-gold transition-colors hover:bg-empire-gold/10"
              >
                <span className="grid h-[30px] w-[30px] place-items-center rounded-full border border-dashed border-empire-gold/40">
                  <EmpireIcon name="plus" size={15} />
                </span>
                Create company
              </button>
            </>
          )}
        </GlassPanel>
      )}

      {createOpen && (
        <CreateCompanyModal
          onClose={() => setCreateOpen(false)}
          onCreated={async (slug) => { setCreateOpen(false); await load(); select(slug) }}
        />
      )}
    </div>
  )
}

const field = 'w-full rounded-lg border border-empire-border bg-empire-surface/60 px-3 py-2 text-sm text-empire-text placeholder:text-empire-text-dim outline-none transition-colors focus:border-empire-gold/50'
const label = 'mb-1 block text-[10px] uppercase tracking-widest text-empire-text-muted'

function CreateCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (slug: string) => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('Subsidiary')
  const [tagline, setTagline] = useState('')
  const [hq, setHq] = useState('')
  const [founded, setFounded] = useState(String(new Date().getFullYear()))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (!name.trim()) return
    setErr(null); setBusy(true)
    try {
      const c = await post('/api/companies', { name, type, tagline, hq, founded })
      onCreated(c.slug)
    } catch (e: any) { setErr(e?.message || 'Failed to create company') } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title="Create company" icon={<EmpireIcon name="crown" size={18} />}>
      <div className="space-y-3.5">
        <p className="text-[11px] text-empire-text-muted">
          Provisions a fresh tenant with its own roles, ranks and data. All eleven Units appear immediately —
          empty until you hire people, sign contracts and log work under the new company.
        </p>
        <div><label className={label}>Company name</label><input className={field} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cregen Ventures" autoFocus /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Type</label><input className={field} value={type} onChange={e => setType(e.target.value)} placeholder="Subsidiary" /></div>
          <div><label className={label}>Founded</label><input className={field} value={founded} onChange={e => setFounded(e.target.value)} /></div>
        </div>
        <div><label className={label}>Tagline</label><input className={field} value={tagline} onChange={e => setTagline(e.target.value)} placeholder="One line of identity" /></div>
        <div><label className={label}>Headquarters</label><input className={field} value={hq} onChange={e => setHq(e.target.value)} placeholder="City, Country" /></div>
        {err && (
          <div className="flex items-center gap-2 rounded-lg border border-empire-red/40 bg-empire-red/10 px-3 py-2 text-xs text-empire-red-bright">
            <EmpireIcon name="alert" size={14} /> {err}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg px-3.5 py-2 text-xs text-empire-text-muted transition-colors hover:text-empire-text">Cancel</button>
          <LiquidMetalButton variant="gold" size="sm" icon={<EmpireIcon name="check" size={14} />} onClick={submit} disabled={busy || !name.trim()}>
            {busy ? 'Provisioning…' : 'Create tenant'}
          </LiquidMetalButton>
        </div>
      </div>
    </Modal>
  )
}
