'use client'

/* C17 — Empire OS Booklets.
 * Two printable documents, switchable at the top:
 *  • System Booklet — what Empire OS is, its infrastructure and full feature set,
 *    built by Cregen and the team.
 *  • Company Profile — a generic, customer-facing overview of a single company
 *    (employees, units, founded, board) the owner can hand out as a profile.
 * Each has a live on-screen preview + "Download PDF" that opens a clean, print-
 * optimised A4 document and triggers Save-as-PDF (the print-window idiom used by
 * FinancePanel/LegalPanel — no extra dependency, works in the static export).
 * Reachable from the user menu (no dead-end: view → download). */

import { useEffect, useMemo, useState } from 'react'
import { fetcher } from '@/lib/api'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'

type Board = { name: string; role: string | null; email: string | null; since: string | null }
type Company = {
  id: string; name: string; slug: string; short: string | null; tagline: string | null
  type: string | null; hq: string | null; founded: string | null; industry: string | null
  boardMembers: Board[] | null
}
type Unit = { id: string; name: string; slug: string; description: string | null; icon: string | null }
type Employee = { id: string; isActive: boolean; department?: { id: string; name: string } | null }

type Mode = 'system' | 'company'

// ── System Booklet content ───────────────────────────────────────────────────
const ARCHITECTURE: { icon: IconName; title: string; body: string }[] = [
  { icon: 'overview', title: 'Web — Next.js 14, static export', body: 'The operator console is a Next.js 14 app exported to static assets and served from Amazon S3 behind a CloudFront CDN — fast, globally cached, nothing to patch at runtime.' },
  { icon: 'sparkle', title: 'API — Express + Prisma on Lambda', body: 'A typed Express + Prisma REST API packaged as an arm64 container image in ECR and run on AWS Lambda. It scales to zero when idle and up on demand — no servers to keep alive.' },
  { icon: 'card', title: 'Data — shared Aurora PostgreSQL', body: 'A single Amazon Aurora PostgreSQL cluster with a separate schema per stage. One source of truth, isolated per environment, fully managed and backed up.' },
  { icon: 'shield', title: 'Infrastructure as code — 5 CDK stacks', body: 'The whole platform is defined in AWS CDK across five stacks — foundation, data, compute, web and operations — so every environment is reproducible from code.' },
  { icon: 'rocket', title: 'Delivery — GitHub Actions, OIDC', body: 'Deploys run through GitHub Actions using short-lived OIDC credentials — no long-lived keys live on a server. Three stages: DEV, CONS and PROD.' },
  { icon: 'link', title: 'Region & isolation', body: 'Runs in eu-west-1 with per-stage isolation. Each stage promotes independently, so changes are proven on DEV and CONS before they reach PROD.' },
]
const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'people', title: 'People & operating units', body: 'Every person, role, level and contract in one structure, organised into the operating units that run each company — with a clear, scannable reporting view.' },
  { icon: 'scales', title: 'Contracts & legal', body: 'Draft from enterprise-ready templates, fill the details, sign, regenerate and export a finished PDF/MD — a contract is only "done" when it can be viewed, exported and acted on.' },
  { icon: 'card', title: 'Finance & payroll', body: 'Budgets, invoices, finance records and payroll runs — reviewed and signed off through approval gates before money moves, with commissions calculated automatically.' },
  { icon: 'handshake', title: 'Deals & partnerships', body: 'Track opportunities from first conversation to close, with pipeline value and per-deal commission rolled into each member’s dashboard.' },
  { icon: 'megaphone', title: 'Marketing & social', body: 'Click-to-connect your real Instagram, Meta, TikTok, X, LinkedIn and YouTube accounts via OAuth, then pull live reach, engagement and follower growth with prescriptive fixes.' },
  { icon: 'sparkle', title: 'AI operators', body: 'Optional AI operators run day-to-day work inside a unit and can be dispatched to Slack or Telegram — always behind your approval gates, never unsupervised.' },
  { icon: 'overview', title: 'Unified points & standings', body: 'One level and XP per person across the whole group; cross-unit contributions count double. Standings are tracked per quarter so progress is always visible.' },
  { icon: 'check', title: 'Approvals & audit', body: 'Sensitive actions queue for explicit approval, and every meaningful action is recorded — so you always know what happened, when and by whom.' },
  { icon: 'link', title: 'MCP & integrations', body: 'An MCP server exposes Empire OS to AI tooling, resolving each caller’s permissions on every request, alongside encrypted social and banking connections you authorise.' },
  { icon: 'book', title: 'Built-in education', body: 'Guided, searchable tutorials cover every part of the system, so a new team member is productive on day one.' },
]
const SECURITY: { icon: IconName; title: string; body: string }[] = [
  { icon: 'lock', title: 'Roles, ranks & permissions', body: 'A zero-dependency IAM model — each person sees only what their role allows, and sensitive actions are gated behind explicit approvals.' },
  { icon: 'shield', title: 'Encrypted secrets', body: 'Access tokens and credentials are sealed with AES-256-GCM and stored encrypted at rest. Secrets live in env, are never returned to the browser, and never printed.' },
  { icon: 'check', title: 'Tested & verified', body: 'A green test suite on both the API and the web app, type-checked end to end, with every environment promoted only after live verification.' },
]

// ── Company Profile content (customer-facing, non-technical) ─────────────────
const CAPABILITIES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'people', title: 'People & teams', body: 'Every person and operating unit in one place — roles, levels, contracts and a clear reporting structure you can see at a glance.' },
  { icon: 'scales', title: 'Contracts & legal', body: 'Draft from enterprise-ready templates, fill in the details, sign, and export a finished document — nothing leaves a half-finished trail.' },
  { icon: 'card', title: 'Finance & payroll', body: 'Budgets, invoices and payroll runs that are reviewed and signed off before money moves, with everything recorded.' },
  { icon: 'handshake', title: 'Deals & partnerships', body: 'Track opportunities from first conversation to closed, with commissions calculated automatically where they apply.' },
  { icon: 'sparkle', title: 'AI operators', body: 'Optional AI operators run day-to-day work inside a unit — always under your approval gates, never unsupervised.' },
  { icon: 'book', title: 'Built-in education', body: 'Guided, step-by-step tutorials cover every part of the system, so a new team member is productive on day one.' },
]
const TRUST: { icon: IconName; title: string; body: string }[] = [
  { icon: 'lock', title: 'Roles & permissions', body: 'Each person sees only what their role allows. Sensitive actions are gated behind explicit approvals.' },
  { icon: 'shield', title: 'Full audit trail', body: 'Every meaningful action is recorded, so you always know what happened, when, and by whom.' },
  { icon: 'link', title: 'Secure integrations', body: 'Connections to social and banking partners are authorised by you and stored encrypted — credentials are never exposed.' },
]

export default function BookletPage() {
  const [mode, setMode] = useState<Mode>('system')
  const [companies, setCompanies] = useState<Company[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetcher('/api/companies').catch(() => []),
      fetcher('/api/departments').catch(() => []),
      fetcher('/api/employees').catch(() => []),
    ]).then(([c, u, e]: [unknown, unknown, unknown]) => {
      if (!alive) return
      setCompanies((Array.isArray(c) ? c : (c as { items?: Company[] })?.items ?? []) as Company[])
      setUnits((Array.isArray(u) ? u : (u as { items?: Unit[] })?.items ?? []) as Unit[])
      setEmployees((Array.isArray(e) ? e : (e as { items?: Employee[] })?.items ?? []) as Employee[])
    }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const active = useMemo(() => {
    if (typeof window === 'undefined') return null
    const slug = localStorage.getItem('empire-os-active-profile')
    return companies.find(c => c.slug === slug) || companies[0] || null
  }, [companies])

  // /api/employees is already scoped to the active company by the header, so this
  // is the active company's headcount.
  const headcount = employees.length
  const activeHeadcount = employees.filter(e => e.isActive).length
  const unitsRepresented = new Set(employees.map(e => e.department?.id).filter(Boolean)).size

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  function download() {
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200')
    if (!w) return
    const html = mode === 'system'
      ? buildSystemHtml({ companies, units, today })
      : buildCompanyHtml({ active, headcount, activeHeadcount, unitsRepresented, totalUnits: units.length, today })
    w.document.write(html)
    w.document.close()
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-empire text-2xl text-empire-text">Booklets</h1>
          <p className="mt-1 text-sm text-empire-text-dim">
            {mode === 'system'
              ? 'What Empire OS is, the infrastructure it runs on, and its full feature set — built by Cregen and the team.'
              : `A generic, shareable company profile for ${active?.name || 'your company'} — overview, structure and what it does.`}
          </p>
        </div>
        <button
          onClick={download}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-empire-gold/40 bg-empire-gold/15 px-4 py-2 text-xs font-medium uppercase tracking-widest text-empire-gold transition-colors hover:bg-empire-gold/25 disabled:opacity-50"
        >
          <EmpireIcon name="document" size={15} /> Download PDF
        </button>
      </div>

      {/* Mode toggle */}
      <div className="mb-8 inline-flex rounded-lg border border-empire-border bg-empire-surface p-1 text-xs">
        {(['system', 'company'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-md px-4 py-1.5 font-medium uppercase tracking-widest transition-colors ${mode === m ? 'bg-empire-gold/20 text-empire-gold' : 'text-empire-text-muted hover:text-empire-text'}`}
          >
            {m === 'system' ? 'System Booklet' : 'Company Profile'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-empire-text-dim text-sm italic">Preparing the booklet…</div>
      ) : mode === 'system' ? (
        <SystemPreview companies={companies} units={units} today={today} />
      ) : (
        <CompanyPreview active={active} headcount={headcount} activeHeadcount={activeHeadcount} unitsRepresented={unitsRepresented} totalUnits={units.length} today={today} />
      )}
    </div>
  )
}

// ── System preview ───────────────────────────────────────────────────────────
function SystemPreview({ companies, units, today }: { companies: Company[]; units: Unit[]; today: string }) {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-empire-gold/25 bg-gradient-to-b from-empire-elevated/50 to-empire-surface p-8 text-center">
        <div className="text-[11px] uppercase tracking-[0.35em] text-empire-gold">Empire OS</div>
        <h2 className="mt-3 font-empire text-3xl text-empire-text">The Operating System for a Company Group</h2>
        <p className="mt-2 text-empire-text-dim">Designed and built by Cregen and the team</p>
        <p className="mt-5 text-xs uppercase tracking-widest text-empire-text-muted">System &amp; Architecture Booklet · {today}</p>
      </section>

      <Section title="What Empire OS is">
        <p className="text-sm leading-relaxed text-empire-text-dim">
          Empire OS is a single operating system for running a group of companies. It brings the people, the
          operating units they work in, contracts, finance, deals, marketing and the day-to-day decisions into
          one calm, well-organised place — with the right people seeing the right things. We — Cregen and the
          team — designed and built it end to end: the architecture, the infrastructure and every feature in
          this booklet.
        </p>
      </Section>

      <Section title="Architecture & infrastructure">
        <p className="mb-3 text-sm leading-relaxed text-empire-text-dim">Serverless-first on AWS, defined entirely as infrastructure-as-code and promoted through three environments before anything reaches production.</p>
        <CardGrid items={ARCHITECTURE} cols={2} />
      </Section>

      {(companies.length > 0 || units.length > 0) && (
        <Section title="The system, in production">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatBox value={String(companies.length || '—')} label={companies.length === 1 ? 'company' : 'companies'} />
            <StatBox value={String(units.length || '—')} label="operating units" />
            <StatBox value="3" label="environments (DEV · CONS · PROD)" />
          </div>
          {units.length > 0 && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {units.map(u => (
                <div key={u.id} className="flex items-start gap-3 rounded-xl border border-empire-border bg-empire-surface p-4">
                  <span className="text-xl" aria-hidden>{u.icon || '•'}</span>
                  <div className="min-w-0">
                    <div className="font-empire text-empire-text">{u.name}</div>
                    {u.description && <div className="mt-0.5 text-xs leading-relaxed text-empire-text-dim">{u.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      <Section title="Features"><CardGrid items={FEATURES} cols={2} /></Section>
      <Section title="Security & engineering quality"><CardGrid items={SECURITY} cols={3} /></Section>

      <section className="rounded-2xl border border-empire-gold/25 bg-empire-elevated/30 p-6 text-center">
        <div className="text-[11px] uppercase tracking-[0.3em] text-empire-gold">Credits</div>
        <p className="mt-2 text-sm text-empire-text-dim">Empire OS was designed and built by <span className="text-empire-text">Cregen and the team</span> — architecture, infrastructure and every feature herein.</p>
      </section>
    </div>
  )
}

// ── Company preview ──────────────────────────────────────────────────────────
function CompanyPreview({ active, headcount, activeHeadcount, unitsRepresented, totalUnits, today }: { active: Company | null; headcount: number; activeHeadcount: number; unitsRepresented: number; totalUnits: number; today: string }) {
  if (!active) return <div className="text-empire-text-dim text-sm italic">No company selected.</div>
  const meta = [active.founded ? `Est. ${active.founded}` : '', active.type || active.industry, active.hq].filter(Boolean).join(' · ')
  const board = (active.boardMembers || []).filter(b => b.name)
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-empire-gold/25 bg-gradient-to-b from-empire-elevated/50 to-empire-surface p-8 text-center">
        <div className="text-[11px] uppercase tracking-[0.35em] text-empire-gold">Company Profile</div>
        <h2 className="mt-3 font-empire text-3xl text-empire-text">{active.name}</h2>
        {active.tagline && <p className="mt-2 text-empire-text-dim">{active.tagline}</p>}
        {meta && <p className="mt-3 text-xs uppercase tracking-widest text-empire-text-muted">{meta}</p>}
      </section>

      <Section title="At a glance">
        <div className="grid gap-3 sm:grid-cols-4">
          <StatBox value={String(headcount)} label="team members" />
          <StatBox value={String(activeHeadcount)} label="active" />
          <StatBox value={String(unitsRepresented || totalUnits)} label="operating units" />
          <StatBox value={active.founded || '—'} label="founded" />
        </div>
      </Section>

      <Section title="About">
        <p className="text-sm leading-relaxed text-empire-text-dim">
          {active.name} {active.tagline ? `— ${active.tagline.replace(/\.$/, '')} — ` : ''}operates as part of the group on Empire OS,
          a single operating system that keeps its people, units, contracts, finance and deals in one organised place.
          {active.hq ? ` Headquartered in ${active.hq}.` : ''}{active.founded ? ` Founded ${active.founded}.` : ''}
        </p>
      </Section>

      {board.length > 0 && (
        <Section title="Leadership">
          <div className="grid gap-3 sm:grid-cols-2">
            {board.map((b, i) => (
              <div key={i} className="rounded-xl border border-empire-border bg-empire-surface p-4">
                <div className="font-empire text-empire-text">{b.name}</div>
                <div className="mt-0.5 text-xs text-empire-text-dim">{[b.role, b.since ? `since ${b.since}` : ''].filter(Boolean).join(' · ')}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="What we run on"><CardGrid items={CAPABILITIES} cols={2} /></Section>
      <Section title="Built to be trusted"><CardGrid items={TRUST} cols={3} /></Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 font-empire text-sm uppercase tracking-widest text-empire-gold">{title}</h3>
      {children}
    </section>
  )
}

function CardGrid({ items, cols }: { items: { icon: IconName; title: string; body: string }[]; cols: 2 | 3 }) {
  return (
    <div className={`grid gap-3 ${cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {items.map(c => (
        <div key={c.title} className="rounded-xl border border-empire-border bg-empire-surface p-4">
          <div className="flex items-center gap-2 text-empire-text">
            <EmpireIcon name={c.icon} size={16} className="text-empire-gold" />
            <span className="font-empire text-sm">{c.title}</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-empire-text-dim">{c.body}</p>
        </div>
      ))}
    </div>
  )
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-empire-border bg-empire-surface p-4 text-center">
      <div className="font-empire text-2xl text-empire-gold">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-empire-text-muted">{label}</div>
    </div>
  )
}

/* ─────────────── print documents (light theme, A4) ─────────────── */
function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

const PRINT_CSS = `
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; background: #fff; line-height: 1.5; }
  .cover { min-height: 64vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; page-break-after: always; border-bottom: 2px solid #c9a227; padding-bottom: 40px; }
  .kicker { font: 700 11px/1 Arial, sans-serif; letter-spacing: .35em; text-transform: uppercase; color: #c9a227; }
  .cover h1 { font-size: 34px; margin: 16px 0 8px; max-width: 18ch; }
  .cover .tag { color: #555; font-size: 15px; }
  .cover .date { margin-top: 26px; font: 600 11px/1 Arial, sans-serif; letter-spacing: .2em; text-transform: uppercase; color: #888; }
  h2 { font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 26px 0 12px; color: #111; }
  p.lead { font-size: 13px; color: #333; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .grid.three { grid-template-columns: 1fr 1fr 1fr; }
  .stats { display: grid; grid-template-columns: repeat(var(--n,3), 1fr); gap: 10px; margin-bottom: 12px; }
  .stat { border: 1px solid #e3e3e3; border-radius: 8px; padding: 14px; text-align: center; }
  .stat .n { font-size: 26px; font-weight: 700; color: #c9a227; }
  .stat .l { font: 10px/1.3 Arial, sans-serif; letter-spacing: .06em; text-transform: uppercase; color: #888; margin-top: 4px; }
  .card { border: 1px solid #e3e3e3; border-radius: 8px; padding: 12px 14px; page-break-inside: avoid; }
  .ct { font-weight: 700; font-size: 13px; color: #111; }
  .cb { font-size: 11.5px; color: #444; margin-top: 4px; font-family: Arial, sans-serif; }
  section { page-break-inside: avoid; }
  .credits { margin-top: 34px; padding: 18px; border: 1px solid #c9a227; border-radius: 10px; text-align: center; page-break-inside: avoid; }
  .credits .ck { font: 700 10px/1 Arial, sans-serif; letter-spacing: .3em; text-transform: uppercase; color: #c9a227; }
  .credits p { font-size: 13px; color: #333; margin: 8px 0 0; }
  .foot { margin-top: 28px; padding-top: 12px; border-top: 1px solid #ddd; text-align: center; font: 10px/1.4 Arial, sans-serif; color: #999; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`
const cards = (items: { title: string; body: string }[]) =>
  items.map(c => `<div class="card"><div class="ct">${esc(c.title)}</div><div class="cb">${esc(c.body)}</div></div>`).join('')

function buildSystemHtml({ companies, units, today }: { companies: Company[]; units: Unit[]; today: string }): string {
  const unitRows = units.map(u => `<div class="card"><div class="ct">${esc(u.icon)} ${esc(u.name)}</div>${u.description ? `<div class="cb">${esc(u.description)}</div>` : ''}</div>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>Empire OS — System Booklet</title><style>${PRINT_CSS}</style></head><body>
    <div class="cover">
      <div class="kicker">Empire OS</div>
      <h1>The Operating System for a Company Group</h1>
      <div class="tag">Designed and built by Cregen and the team</div>
      <div class="date">System &amp; Architecture Booklet · ${esc(today)}</div>
    </div>
    <section><h2>What Empire OS is</h2><p class="lead">Empire OS is a single operating system for running a group of companies. It brings the people, the operating units they work in, contracts, finance, deals, marketing and the day-to-day decisions into one calm, well-organised place — with the right people seeing the right things. We — Cregen and the team — designed and built it end to end: the architecture, the infrastructure and every feature in this booklet.</p></section>
    <section><h2>Architecture &amp; infrastructure</h2><p class="lead">Serverless-first on AWS, defined entirely as infrastructure-as-code and promoted through three environments (DEV · CONS · PROD) in eu-west-1 before anything reaches production.</p><div class="grid">${cards(ARCHITECTURE)}</div></section>
    <section><h2>The system, in production</h2>
      <div class="stats" style="--n:3">
        <div class="stat"><div class="n">${companies.length || '—'}</div><div class="l">${companies.length === 1 ? 'company' : 'companies'}</div></div>
        <div class="stat"><div class="n">${units.length || '—'}</div><div class="l">operating units</div></div>
        <div class="stat"><div class="n">3</div><div class="l">environments</div></div>
      </div>${units.length ? `<div class="grid">${unitRows}</div>` : ''}</section>
    <section><h2>Features</h2><div class="grid">${cards(FEATURES)}</div></section>
    <section><h2>Security &amp; engineering quality</h2><div class="grid three">${cards(SECURITY)}</div></section>
    <div class="credits"><div class="ck">Credits</div><p>Empire OS was designed and built by Cregen and the team — architecture, infrastructure and every feature herein.</p></div>
    <div class="foot">Empire OS · System &amp; Architecture Booklet · Prepared ${esc(today)}</div>
    <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
  </body></html>`
}

function buildCompanyHtml({ active, headcount, activeHeadcount, unitsRepresented, totalUnits, today }: { active: Company | null; headcount: number; activeHeadcount: number; unitsRepresented: number; totalUnits: number; today: string }): string {
  const name = active?.name || 'Company'
  const meta = [active?.founded ? `Est. ${esc(active.founded)}` : '', esc(active?.type || active?.industry), esc(active?.hq)].filter(Boolean).join(' · ')
  const board = (active?.boardMembers || []).filter(b => b.name)
  const boardRows = board.map(b => `<div class="card"><div class="ct">${esc(b.name)}</div><div class="cb">${esc([b.role, b.since ? `since ${b.since}` : ''].filter(Boolean).join(' · '))}</div></div>`).join('')
  const about = `${esc(name)} ${active?.tagline ? `— ${esc(active.tagline.replace(/\.$/, ''))} — ` : ''}operates as part of the group on Empire OS, a single operating system that keeps its people, units, contracts, finance and deals in one organised place.${active?.hq ? ` Headquartered in ${esc(active.hq)}.` : ''}${active?.founded ? ` Founded ${esc(active.founded)}.` : ''}`
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)} — Company Profile</title><style>${PRINT_CSS}</style></head><body>
    <div class="cover">
      <div class="kicker">Company Profile</div>
      <h1>${esc(name)}</h1>
      ${active?.tagline ? `<div class="tag">${esc(active.tagline)}</div>` : ''}
      <div class="date">${meta || 'Company Overview'} · ${esc(today)}</div>
    </div>
    <section><h2>At a glance</h2>
      <div class="stats" style="--n:4">
        <div class="stat"><div class="n">${headcount}</div><div class="l">team members</div></div>
        <div class="stat"><div class="n">${activeHeadcount}</div><div class="l">active</div></div>
        <div class="stat"><div class="n">${unitsRepresented || totalUnits}</div><div class="l">operating units</div></div>
        <div class="stat"><div class="n">${esc(active?.founded || '—')}</div><div class="l">founded</div></div>
      </div>
    </section>
    <section><h2>About</h2><p class="lead">${about}</p></section>
    ${board.length ? `<section><h2>Leadership</h2><div class="grid">${boardRows}</div></section>` : ''}
    <section><h2>What we run on</h2><div class="grid">${cards(CAPABILITIES)}</div></section>
    <section><h2>Built to be trusted</h2><div class="grid three">${cards(TRUST)}</div></section>
    <div class="foot">${esc(name)} · Company Profile · Prepared ${esc(today)} · Powered by Empire OS</div>
    <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
  </body></html>`
}
