'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'
import { LiquidMetalButton } from '@/components/atoms/LiquidMetalButton'
import { LiquidMetalFrame } from '@/components/atoms/LiquidMetalFrame'
import { Modal } from '@/components/molecules/Modal'
import { PasswordInput } from '@/components/molecules/PasswordInput'
import { COMPANIES } from '@/lib/profiles'
import { EMBLEMS, deterministicEmblem } from '@/lib/emblems'
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
type Company = { id: string; slug: string; name: string; short: string; tagline: string; type: string; hq: string; founded: string; industry?: string | null; accent?: string | null; icon?: string | null }
type Branded = Company & { icon: IconName; accent: string }

const KEY = 'empire-os-active-profile'
const EVT = 'empire-profile-change'

// Brand metadata (glyph + accent) lives client-side; merge onto DB rows by slug.
// New tenants fall back to the crown glyph and the house gold.
const META: Record<string, { icon: IconName; accent: string }> = Object.fromEntries(
  COMPANIES.map(c => [c.id, { icon: c.icon, accent: c.accent }])
)
// DB-persisted branding (icon/accent set in the onboarding wizard) wins; fall
// back to the client META for the seeded portfolio, then the house defaults.
const brand = (c: Company): Branded => {
  const base = META[c.slug] ?? { icon: 'crown' as IconName, accent: '#C9A233' }
  return { ...c, icon: (c.icon as IconName) || base.icon, accent: c.accent || base.accent }
}

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

      {/* Trigger — REAL liquid-metal shader rim (LiquidMetalFrame) over a glass body */}
      <LiquidMetalFrame
        onClick={() => setOpen(o => !o)}
        variant="gold"
        borderWidth={3}
        radius={14}
        className="w-full text-left transition-transform duration-200 hover:-translate-y-px"
        innerClassName="items-center gap-2.5 px-3 py-2"
      >
        <span className="medallion grid place-items-center shrink-0" style={{ width: 30, height: 30 }}>
          <EmpireIcon name={active?.icon ?? 'crown'} size={15} className="relative z-10" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-empire-text">{active?.name ?? 'Empire OS'}</span>
          <span className="block truncate text-[10px] uppercase tracking-widest text-empire-text-muted">{active?.type ?? '—'}</span>
        </span>
        <EmpireIcon name="chevron-down" size={14} className={`ml-1 text-empire-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </LiquidMetalFrame>

      {open && (
        <div className="glass-solid absolute left-0 z-[70] mt-2 w-80 overflow-hidden p-1.5 animate-fade-in">
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
        </div>
      )}

      {createOpen && (
        <CompanyOnboardingWizard
          onClose={() => setCreateOpen(false)}
          onCreated={async (slug) => { setCreateOpen(false); await load(); select(slug) }}
        />
      )}
    </div>
  )
}

const field = 'w-full rounded-lg border border-empire-border bg-empire-surface/60 px-3 py-2 text-sm text-empire-text placeholder:text-empire-text-dim outline-none transition-colors focus:border-empire-gold/50'
const label = 'mb-1 block text-[10px] uppercase tracking-widest text-empire-text-muted'

/* ---------------- Onboarding wizard (§15 + final_backlog §1-6) ---------------- */
type Unit = { id: string; name: string; slug: string; description?: string | null }
type SeedHire = { firstName: string; lastName: string; email: string; password: string; role: string; departmentId: string; salaryAmount: string }

const INDUSTRIES = ['AI / Software', 'Creative / Media', 'Research & Development', 'Consulting / Advisory', 'Finance', 'E-commerce', 'Healthcare', 'Education', 'Real Estate', 'Other']
const ACCENTS = ['#C9A233', '#e8b4b8', '#7aa2f7', '#8bd5a0', '#c78bf0', '#e0884f', '#5fd3c4', '#d65f6f']
// Core units (final_backlog §2) — always enabled, locked on in the picker.
const CORE_UNIT_SLUGS = ['executive', 'hr', 'finance', 'legal']
const WIZARD_STEPS = ['Identity', 'Branding', 'Structure', 'Team', 'Review'] as const
const emptyHire = (departmentId = ''): SeedHire => ({ firstName: '', lastName: '', email: '', password: '', role: '', departmentId, salaryAmount: '' })
const isCoreUnit = (u: Unit) => CORE_UNIT_SLUGS.includes(u.slug)

function CompanyOnboardingWizard({ onClose, onCreated }: { onClose: () => void; onCreated: (slug: string) => void }) {
  const [step, setStep] = useState(0)
  // identity
  const [name, setName] = useState('')
  const [type, setType] = useState('Subsidiary')
  const [industry, setIndustry] = useState(INDUSTRIES[0])
  const [tagline, setTagline] = useState('')
  const [hq, setHq] = useState('')
  const [founded, setFounded] = useState(String(new Date().getFullYear()))
  // branding — icon null means "auto": the backend assigns a deterministic emblem
  const [short, setShort] = useState('')
  const [accent, setAccent] = useState(ACCENTS[0])
  const [icon, setIcon] = useState<IconName | null>(null)
  // structure — selected OPTIONAL units (department ids); core units are implied
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set())
  const [unitSearch, setUnitSearch] = useState('')
  // team
  const [units, setUnits] = useState<Unit[]>([])
  const [hires, setHires] = useState<SeedHire[]>([])
  // provisioning
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { fetcher('/api/departments').then((d: Unit[]) => setUnits(d || [])).catch(() => {}) }, [])

  const shortLabel = short.trim() || name.trim().split(/\s+/)[0]
  const validHires = hires.filter(h => h.firstName.trim() && h.lastName.trim() && h.email.trim() && h.password.length >= 10 && h.role.trim() && h.departmentId)
  const canNext = step !== 0 || name.trim().length > 0
  // The emblem shown everywhere: the explicit pick, else the deterministic auto one.
  const effectiveIcon: IconName = icon ?? deterministicEmblem(name.trim() || shortLabel || 'empire')
  // Units enabled for this tenant = core (always) + selected optional ones.
  const enabledUnits = units.filter(u => isCoreUnit(u) || selectedUnits.has(u.id))
  const filteredUnits = units.filter(u => {
    const q = unitSearch.trim().toLowerCase()
    return !q || u.name.toLowerCase().includes(q) || (u.description || '').toLowerCase().includes(q)
  })

  function toggleUnit(u: Unit) {
    if (isCoreUnit(u)) return // core units are locked on
    setSelectedUnits(prev => {
      const next = new Set(prev)
      next.has(u.id) ? next.delete(u.id) : next.add(u.id)
      return next
    })
  }

  function addHire() { setHires(h => [...h, emptyHire(enabledUnits[0]?.id || '')]) }
  function updateHire(i: number, patch: Partial<SeedHire>) { setHires(h => h.map((row, idx) => idx === i ? { ...row, ...patch } : row)) }
  function removeHire(i: number) { setHires(h => h.filter((_, idx) => idx !== i)) }

  async function provision() {
    if (!name.trim()) { setStep(0); return }
    setErr(null); setBusy(true); setProgress('Provisioning tenant…')
    try {
      const c = await post('/api/companies', {
        name, type, tagline, hq, founded,
        short: shortLabel, industry, accent,
        // omit icon when null so the backend assigns the deterministic emblem
        ...(icon ? { icon } : {}),
        // optional units; core units are forced on server-side
        units: [...selectedUnits],
      })
      // Seed the starting team INTO the new tenant (explicit slug so they scope to
      // the new company even though it isn't active yet — no mid-wizard reload).
      for (let i = 0; i < validHires.length; i++) {
        const h = validHires[i]
        setProgress(`Hiring ${h.firstName} ${h.lastName} (${i + 1}/${validHires.length})…`)
        await post('/api/employees', {
          firstName: h.firstName.trim(), lastName: h.lastName.trim(), email: h.email.trim(), password: h.password,
          role: h.role.trim(), departmentId: h.departmentId,
          ...(h.salaryAmount.trim() && { salaryAmount: Number(h.salaryAmount) }),
        }, c.slug)
      }
      setProgress('Done.')
      onCreated(c.slug)
    } catch (e: any) {
      setErr(e?.message || 'Failed to provision company'); setBusy(false); setProgress(null)
    }
  }

  return (
    <Modal open onClose={onClose} title="Onboard a company" icon={<EmpireIcon name="crown" size={18} />} width="max-w-3xl">
      <div className="max-w-full overflow-hidden space-y-4">
        {/* step rail */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s} className="min-w-0">
              <button
                type="button"
                onClick={() => { if (i < step || (i > step && name.trim())) setStep(i) }}
                className={`flex w-full min-w-0 items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-widest transition-colors ${i === step ? 'border-empire-gold/50 bg-empire-gold/15 text-empire-gold' : i < step ? 'border-empire-border text-empire-text-muted hover:text-empire-text' : 'border-empire-border/60 text-empire-text-dim'}`}
              >
                <span className={`grid h-4 w-4 place-items-center rounded-full text-[9px] ${i < step ? 'bg-empire-gold/20 text-empire-gold' : 'bg-empire-elevated/60'}`}>
                  {i < step ? <EmpireIcon name="check" size={10} /> : i + 1}
                </span>
                <span className="truncate">{s}</span>
              </button>
            </div>
          ))}
        </div>

        {/* one scroll region for the active step — the rail above and nav below
            stay pinned, so the section header is always in view and no step
            (e.g. Review) can flow outside the box. */}
        <div className="max-h-[58vh] max-w-full space-y-4 overflow-y-auto overflow-x-hidden pr-1">
        {/* ---- Step 1: Identity ---- */}
        {step === 0 && (
          <div className="space-y-3.5 animate-fade-in">
            <p className="text-[11px] text-empire-text-muted">
              Provisions a fresh tenant with its own roles, ranks and isolated data. Core Units are always enabled;
              optional Units are selected in the structure step before you seed the starting team.
            </p>
            <div><label className={label}>Company name</label><input className={field} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cregen Ventures" autoFocus /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Type</label><input className={field} value={type} onChange={e => setType(e.target.value)} placeholder="Subsidiary" /></div>
              <div><label className={label}>Founded</label><input className={field} value={founded} onChange={e => setFounded(e.target.value)} /></div>
            </div>
            <div>
              <label className={label}>Industry</label>
              <select className={field} value={industry} onChange={e => setIndustry(e.target.value)}>
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div><label className={label}>Tagline</label><input className={field} value={tagline} onChange={e => setTagline(e.target.value)} placeholder="One line of identity" /></div>
            <div><label className={label}>Headquarters</label><input className={field} value={hq} onChange={e => setHq(e.target.value)} placeholder="City, Country" /></div>
          </div>
        )}

        {/* ---- Step 2: Branding ---- */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-[11px] text-empire-text-muted">The medallion, wordmark and accent persist with the tenant.</p>
            <div className="flex items-center gap-3 rounded-xl border border-empire-border bg-empire-surface/40 p-3">
              <span className="medallion grid place-items-center shrink-0" style={{ width: 44, height: 44, background: `radial-gradient(circle at 30% 26%, ${accent} 0%, ${accent}cc 45%, #4a3a0c 100%)` }}>
                <EmpireIcon name={effectiveIcon} size={20} className="relative z-10 text-empire-void" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-empire-text">{name.trim() || 'Company name'}</p>
                <p className="truncate text-[10px] uppercase tracking-widest text-empire-text-muted">{shortLabel || 'SHORT'} · {type}</p>
              </div>
            </div>
            <div><label className={label}>Short label (wordmark)</label><input className={field} value={short} onChange={e => setShort(e.target.value)} placeholder={shortLabel || 'e.g. Ventures'} /></div>
            <div>
              <label className={label}>Accent</label>
              <div className="flex flex-wrap items-center gap-2">
                {ACCENTS.map(a => (
                  <button key={a} type="button" onClick={() => setAccent(a)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${accent === a ? 'border-empire-text' : 'border-transparent'}`}
                    style={{ background: a }} aria-label={`Accent ${a}`} />
                ))}
                <label className="ml-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-empire-text-muted">
                  <input type="color" value={accent} onChange={e => setAccent(e.target.value)} className="h-7 w-7 cursor-pointer rounded border border-empire-border bg-transparent" />
                  Custom
                </label>
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className={label + ' mb-0'}>Company emblem · {EMBLEMS.length} options</label>
                <button type="button" onClick={() => setIcon(null)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest transition-colors ${icon === null ? 'border-empire-gold/60 bg-empire-gold/10 text-empire-gold' : 'border-empire-border text-empire-text-dim hover:text-empire-text'}`}>
                  <EmpireIcon name="sparkle" size={10} /> Auto
                </button>
              </div>
              <p className="mb-2 text-[10px] text-empire-text-dim">
                {icon === null
                  ? `No emblem chosen — auto-assigned "${effectiveIcon}" (deterministic from the name).`
                  : 'Pick one, or use Auto for a deterministic emblem.'}
              </p>
              <div className="grid grid-cols-6 gap-2">
                {EMBLEMS.map(ic => (
                  <button key={ic} type="button" onClick={() => setIcon(ic)}
                    className={`grid aspect-square place-items-center rounded-lg border transition-colors ${icon === ic ? 'border-empire-gold/60 bg-empire-gold/10 text-empire-gold' : icon === null && effectiveIcon === ic ? 'border-empire-gold/30 bg-empire-gold/5 text-empire-gold/70' : 'border-empire-border text-empire-text-muted hover:text-empire-text'}`}
                    aria-label={ic}>
                    <EmpireIcon name={ic} size={18} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---- Step 3: Structure (final_backlog §2-4) ---- */}
        {step === 2 && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-[11px] text-empire-text-muted">
              Choose this company&apos;s organizational units. The four core units are always created;
              add any optional units you need — each becomes a live, scoped Unit with its own agent.
            </p>
            <div className="relative">
              <EmpireIcon name="search" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-empire-text-dim" />
              <input className={field + ' pl-9'} value={unitSearch} onChange={e => setUnitSearch(e.target.value)} placeholder="Search units…" />
            </div>
            <div className="flex items-center justify-between px-0.5 text-[10px] uppercase tracking-widest text-empire-text-dim">
              <span>{enabledUnits.length} of {units.length} enabled</span>
              <span>{CORE_UNIT_SLUGS.length} core · {selectedUnits.size} optional</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filteredUnits.map(u => {
                const core = isCoreUnit(u)
                const on = core || selectedUnits.has(u.id)
                return (
                  <button key={u.id} type="button" onClick={() => toggleUnit(u)} disabled={core}
                    className={`group flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${on ? 'border-empire-gold/50 bg-empire-gold/10' : 'border-empire-border bg-empire-surface/40 hover:border-empire-gold/30'} ${core ? 'cursor-default' : 'cursor-pointer'}`}>
                    <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${on ? 'bg-empire-gold/20 text-empire-gold' : 'bg-empire-elevated/60 text-empire-text-muted'}`}>
                      <EmpireIcon name={(u.slug as IconName)} size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-empire-text">{u.name}</span>
                        {core
                          ? <span className="flex items-center gap-0.5 rounded-full border border-empire-gold/40 px-1.5 py-px text-[8px] uppercase tracking-widest text-empire-gold"><EmpireIcon name="lock" size={8} /> Core</span>
                          : on && <EmpireIcon name="check" size={13} className="text-empire-gold" />}
                      </span>
                      {u.description && <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-empire-text-dim">{u.description}</span>}
                    </span>
                  </button>
                )
              })}
              {filteredUnits.length === 0 && <p className="col-span-full rounded-lg border border-dashed border-empire-border/70 px-3 py-4 text-center text-[11px] text-empire-text-dim">No units match &ldquo;{unitSearch}&rdquo;.</p>}
            </div>
          </div>
        )}

        {/* ---- Step 4: Team ---- */}
        {step === 3 && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-[11px] text-empire-text-muted">
              Seed the starting team (optional). Each hire lands in the chosen Unit, scoped to this company. You can
              add more later from any Unit.
            </p>
            <div className="space-y-2">
              {hires.map((h, i) => (
                <div key={i} className="rounded-xl border border-empire-border bg-empire-surface/40 p-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <input className={field} value={h.firstName} onChange={e => updateHire(i, { firstName: e.target.value })} placeholder="First name" />
                    <input className={field} value={h.lastName} onChange={e => updateHire(i, { lastName: e.target.value })} placeholder="Last name" />
                    <input className={field} type="email" value={h.email} onChange={e => updateHire(i, { email: e.target.value })} placeholder="Email" />
                    <PasswordInput inputClassName={field} minLength={10} value={h.password} onChange={e => updateHire(i, { password: e.target.value })} placeholder="Temporary password (10+)" />
                    <input className={field} value={h.role} onChange={e => updateHire(i, { role: e.target.value })} placeholder="Title / role" />
                    <select className={field} value={h.departmentId} onChange={e => updateHire(i, { departmentId: e.target.value })}>
                      <option value="">Select Unit…</option>
                      {enabledUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <input className={field} type="number" min="0" value={h.salaryAmount} onChange={e => updateHire(i, { salaryAmount: e.target.value })} placeholder="Salary (optional)" />
                  </div>
                  <div className="mt-1.5 flex justify-end">
                    <button type="button" onClick={() => removeHire(i)} className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-empire-text-dim transition-colors hover:text-empire-red-bright">
                      <EmpireIcon name="trash" size={12} /> Remove
                    </button>
                  </div>
                </div>
              ))}
              {hires.length === 0 && <p className="rounded-lg border border-dashed border-empire-border/70 px-3 py-4 text-center text-[11px] text-empire-text-dim">No hires yet — the tenant can start empty.</p>}
            </div>
            <button type="button" onClick={addHire} disabled={!enabledUnits.length}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-empire-gold/40 px-3 py-2 text-xs text-empire-gold transition-colors hover:bg-empire-gold/10 disabled:opacity-50">
              <EmpireIcon name="plus" size={14} /> Add hire
            </button>
          </div>
        )}

        {/* ---- Step 5: Review ---- */}
        {step === 4 && (
          <div className="max-w-full space-y-3 overflow-hidden animate-fade-in">
            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-empire-border bg-empire-surface/40 p-3">
              <span className="medallion grid place-items-center shrink-0" style={{ width: 44, height: 44, background: `radial-gradient(circle at 30% 26%, ${accent} 0%, ${accent}cc 45%, #4a3a0c 100%)` }}>
                <EmpireIcon name={effectiveIcon} size={20} className="relative z-10 text-empire-void" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-empire-text">{name.trim() || '—'}</p>
                <p className="truncate text-[10px] uppercase tracking-widest text-empire-text-muted">{shortLabel} · {type} · {industry}</p>
              </div>
            </div>
            <dl className="grid min-w-0 grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
              <ReviewItem k="Founded" v={founded} />
              <ReviewItem k="HQ" v={hq || 'Remote'} />
              <ReviewItem k="Emblem" v={`${effectiveIcon}${icon === null ? ' (auto)' : ''}`} />
              <ReviewItem k="Units" v={`${enabledUnits.length} (${selectedUnits.size} optional)`} />
              <ReviewItem k="Starting team" v={`${validHires.length} hire${validHires.length === 1 ? '' : 's'}`} />
              <ReviewItem k="Tagline" v={tagline || '—'} />
            </dl>
            <div className="rounded-xl border border-empire-border bg-empire-surface/40 p-2.5">
              <p className={label}>Organizational units</p>
              <div className="flex max-w-full flex-wrap gap-1.5 overflow-hidden">
                {enabledUnits.map(u => (
                  <span key={u.id} className={`flex min-w-0 max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${isCoreUnit(u) ? 'border-empire-gold/40 text-empire-gold' : 'border-empire-border text-empire-text-muted'}`}>
                    {isCoreUnit(u) && <EmpireIcon name="lock" size={9} className="shrink-0" />}
                    <span className="truncate">{u.name}</span>
                  </span>
                ))}
              </div>
            </div>
            {validHires.length > 0 && (
              <div className="max-w-full overflow-hidden rounded-xl border border-empire-border bg-empire-surface/40 p-2.5">
                <p className={label}>Seeded hires</p>
                <ul className="space-y-1">
                  {validHires.map((h, i) => (
                    <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-[11px] text-empire-text">
                      <span className="min-w-0 truncate">{h.firstName} {h.lastName} · <span className="text-empire-text-muted">{h.role}</span></span>
                      <span className="max-w-32 truncate text-[10px] uppercase tracking-widest text-empire-text-dim">{units.find(u => u.id === h.departmentId)?.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[11px] text-empire-text-muted">
              This provisions the tenant with its full role/rank model, then hires the team above under it. Isolated
              from every other company.
            </p>
          </div>
        )}

        {err && (
          <div className="flex items-center gap-2 rounded-lg border border-empire-red/40 bg-empire-red/10 px-3 py-2 text-xs text-empire-red-bright">
            <EmpireIcon name="alert" size={14} /> {err}
          </div>
        )}
        {progress && !err && (
          <p className="rounded-lg border border-empire-gold/30 bg-empire-gold/5 px-3 py-2 font-data text-[11px] text-empire-text-muted">{progress}</p>
        )}
        </div>

        {/* nav */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button onClick={step === 0 ? onClose : () => setStep(s => s - 1)} disabled={busy}
            className="rounded-lg px-3.5 py-2 text-xs text-empire-text-muted transition-colors hover:text-empire-text disabled:opacity-50">
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < WIZARD_STEPS.length - 1 ? (
            <LiquidMetalButton variant="gold" size="sm" icon={<EmpireIcon name="arrow-up" size={14} className="rotate-90" />} onClick={() => setStep(s => s + 1)} disabled={!canNext}>
              Continue
            </LiquidMetalButton>
          ) : (
            <LiquidMetalButton variant="gold" size="sm" icon={<EmpireIcon name="check" size={14} />} onClick={provision} disabled={busy || !name.trim()}>
              {busy ? 'Provisioning…' : 'Provision company'}
            </LiquidMetalButton>
          )}
        </div>
      </div>
    </Modal>
  )
}

function ReviewItem({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-empire-border bg-empire-surface/40 px-2.5 py-1.5">
      <dt className="text-[9px] uppercase tracking-widest text-empire-text-muted">{k}</dt>
      <dd className="truncate text-empire-text">{v}</dd>
    </div>
  )
}
