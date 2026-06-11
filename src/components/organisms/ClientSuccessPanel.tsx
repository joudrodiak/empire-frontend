'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetcher, post, patch, del } from '@/lib/api'
import { KpiCard, Panel, DonutChart, ProgressBar, DataTable, TabBar, Grid, EmptyState, type Column } from '@/lib/ui'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { EntityFormModal, type FieldDef } from '@/components/molecules/EntityFormModal'
import { Modal } from '@/components/molecules/Modal'
import { useStickyTab } from '@/lib/use-sticky-tab'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'
import { AffixInput } from '@/components/molecules/AffixInput'

type Page<T> = { data: T[]; page: number; pageSize: number; total: number; totalPages: number }

// Client Success — retention surface backed by the account book and support
// tickets (/api/client-success/*). NRR/GRR, health distribution, renewal risk
// and CSAT are all derived server-side. Nothing is hard-coded.

const ACCENT = '#C9A233'
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'health', label: 'Health' },
  { id: 'renewals', label: 'Renewals' },
  { id: 'support', label: 'Support' },
  { id: 'capability', label: 'Capability' },
]
const TIER_COLOR: Record<string, string> = { enterprise: '#C9A233', growth: '#C9A233', starter: '#7A7468' }
const STATUS_COLOR: Record<string, string> = { active: '#C9A233', at_risk: '#C9A233', churned: '#F4EFE3' }
const RISK_COLOR: Record<string, string> = { low: '#C9A233', medium: '#C9A233', high: '#F4EFE3' }
const PRIO_COLOR: Record<string, string> = { urgent: '#F4EFE3', high: '#C9A233', normal: '#C9A233', low: '#7A7468' }
const BAND_COLOR: Record<string, string> = { Healthy: '#C9A233', Stable: '#C9A233', 'At Risk': '#C9A233', Critical: '#F4EFE3' }
const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n))
const eur = (n: number) => `€${fmt(n)}`
const healthColor = (h: number) => h >= 80 ? '#C9A233' : h >= 60 ? '#C9A233' : h >= 40 ? '#C9A233' : '#F4EFE3'

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap" style={{ color, borderColor: `${color}55`, background: `${color}12` }}>{text}</span>
}
// The Capability API prefixes its signal strings with status glyphs. Detect
// them via Unicode escapes (no literal emoji in source), strip the glyph for
// display, and render the matching EmpireIcon + tone instead:
//   U+2717 cross · U+26A0 warning · U+2713 check · U+FE0F variation selector
const CROSS = '\u2717', WARN = '\u26A0', TICK = '\u2713'
const GLYPH_PREFIX = /^[\u2717\u26A0\u2713\uFE0F]+\s*/
function stripGlyph(s: string): string {
  return s.replace(GLYPH_PREFIX, '').trim()
}
function reasonTone(r: string): { icon: 'close' | 'alert' | 'check'; color: string; text: string } {
  if (r.startsWith(CROSS)) return { icon: 'close', color: '#F4EFE3', text: stripGlyph(r) }
  if (r.startsWith(WARN)) return { icon: 'alert', color: '#C9A233', text: stripGlyph(r) }
  if (r.startsWith(TICK)) return { icon: 'check', color: '#C9A233', text: stripGlyph(r) }
  return { icon: 'check', color: '#7A7468', text: r }
}
function Stars({ n, color }: { n: number; color: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" style={{ color }} aria-label={`${n} of 5`}>
      {Array.from({ length: n }).map((_, i) => <EmpireIcon key={i} name="star" size={12} />)}
    </span>
  )
}
function HealthDot({ h }: { h: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-empire-bg overflow-hidden"><div className="h-full rounded-full" style={{ width: `${h}%`, background: healthColor(h) }} /></div>
      <span className="text-xs" style={{ color: healthColor(h) }}>{h}</span>
    </div>
  )
}

export function ClientSuccessPanel() {
  const [tab, setTab] = useStickyTab('client-success', 'overview')
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid place-items-center w-9 h-9 rounded-lg border border-empire-border bg-empire-elevated/40 text-empire-gold shrink-0">
          <EmpireIcon name={deptIcon('client-success')} size={18} />
        </span>
        <div>
          <h3 className="font-empire text-empire-gold text-sm tracking-widest uppercase">Retention Intelligence</h3>
          <p className="text-empire-text-muted text-xs mt-0.5">NRR/GRR, account health, renewal risk &amp; CSAT — derived from the live account book and support desk.</p>
        </div>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} accent={ACCENT} />
      {tab === 'overview' && <Overview />}
      {tab === 'accounts' && <Accounts />}
      {tab === 'health' && <Health />}
      {tab === 'renewals' && <Renewals />}
      {tab === 'support' && <Support />}
      {tab === 'capability' && <Capability />}
    </div>
  )
}

function useCS<T>(path: string): { data: T | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    setLoading(true)
    fetcher(`/api/client-success/${path}`).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [path])
  useEffect(() => { reload() }, [reload])
  return { data, loading, reload }
}
function Loading() { return <div className="py-16 text-center text-empire-text-dim text-sm animate-pulse">Computing from account book…</div> }
const inputCls = 'bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/60'
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-empire-border/60 py-2 last:border-0">
      <span className="text-[11px] uppercase tracking-[0.14em] text-empire-text-dim">{label}</span>
      <span className="text-right text-sm text-empire-text">{children}</span>
    </div>
  )
}

/* ---------------- Overview ---------------- */
type Summary = {
  arr: number; activeAccounts: number; atRisk: number; churned: number; nrr: number; grr: number
  avgHealth: number; avgCsat: number; openTickets: number; logoChurn: number; arrChurned: number
  renewalArr90: number; renewalsNext90: number; renewalAtRisk: number; avgArr: number
}
function Overview() {
  const { data: s, loading } = useCS<Summary>('summary')
  if (loading) return <Loading />
  if (!s) return <EmptyState icon="lifebuoy" title="No client data" />
  return (
    <div className="space-y-6">
      <Grid cols={6}>
        <KpiCard icon="coins" label="Total ARR" value={eur(s.arr)} sub={`${s.activeAccounts} accounts`} accent={ACCENT} />
        <KpiCard icon="arrow-up" label="Net Revenue Retention" value={`${s.nrr}%`} sub="incl. expansion" accent={s.nrr >= 100 ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="shield" label="Gross Retention" value={`${s.grr}%`} accent={s.grr >= 90 ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="gauge" label="Avg Health" value={String(s.avgHealth)} accent={healthColor(s.avgHealth)} />
        <KpiCard icon="star" label="Avg CSAT" value={`${s.avgCsat}/5`} sub={`${s.openTickets} open tickets`} accent={s.avgCsat >= 4 ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="alert" label="At-Risk Accounts" value={String(s.atRisk)} sub={`${s.churned} churned`} accent={s.atRisk > 0 ? '#C9A233' : '#C9A233'} />
      </Grid>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel icon="calendar" title="Renewals — next 90 days" className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <div><div className="text-[10px] uppercase tracking-[0.16em] text-empire-text-muted">Up for renewal</div><div className="text-3xl font-empire text-empire-text leading-none mt-1.5 tabular-nums">{s.renewalsNext90}</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.16em] text-empire-text-muted">ARR in play</div><div className="text-3xl font-empire leading-none mt-1.5 tabular-nums" style={{ color: ACCENT }}>{eur(s.renewalArr90)}</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.16em] text-empire-text-muted">ARR at risk</div><div className="text-3xl font-empire leading-none mt-1.5 tabular-nums" style={{ color: '#F4EFE3' }}>{eur(s.renewalAtRisk)}</div></div>
          </div>
        </Panel>
        <Panel icon="arrow-down" title="Revenue churn (12mo)">
          <div className="text-4xl font-empire leading-none tabular-nums" style={{ color: s.logoChurn > 8 ? '#F4EFE3' : '#C9A233' }}>{s.logoChurn}%</div>
          <div className="text-empire-text-muted text-xs mt-2">{eur(s.arrChurned)} ARR lost · avg account {eur(s.avgArr)}</div>
        </Panel>
      </div>
    </div>
  )
}

/* ---------------- Accounts ---------------- */
type Acct = { id: string; name: string; tier: string; status: string; arr: number; priorArr: number; netExpansion: number; seats: number; healthScore: number; csmName: string | null; renewalDate: string | null; openTickets: number }
const ACCT_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Account', full: true },
  { key: 'tier', label: 'Tier', type: 'select', options: [{ value: 'enterprise', label: 'enterprise' }, { value: 'growth', label: 'growth' }, { value: 'starter', label: 'starter' }] },
  { key: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'active' }, { value: 'at_risk', label: 'at_risk' }, { value: 'churned', label: 'churned' }] },
  { key: 'arr', label: 'ARR', type: 'number' },
  { key: 'priorArr', label: 'Prior ARR', type: 'number' },
  { key: 'seats', label: 'Seats', type: 'number' },
  { key: 'healthScore', label: 'Health', type: 'number' },
  { key: 'nps', label: 'NPS', type: 'number' },
  { key: 'csmName', label: 'CSM' },
  { key: 'renewalDate', label: 'Renewal date', type: 'date' },
]
function Accounts() {
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [tier, setTier] = useState('')
  const { data, loading, reload } = useCS<Page<Acct>>(`accounts?pageSize=15&page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}${tier ? `&tier=${tier}` : ''}`)
  const [form, setForm] = useState({ name: '', tier: 'growth', arr: '', priorArr: '', seats: '', healthScore: '70', csmName: '' })
  const [busy, setBusy] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [active, setActive] = useState<{ row: Acct; mode: 'view' | 'edit' } | null>(null)
  async function submit() {
    if (!form.name) return
    setBusy(true)
    await post('/api/client-success/accounts', form).catch(console.error)
    setBusy(false); setForm({ name: '', tier: 'growth', arr: '', priorArr: '', seats: '', healthScore: '70', csmName: '' }); setShowNew(false); setPage(0); reload()
  }
  async function remove(id: string) { await del(`/api/client-success/accounts/${id}`).catch(console.error); reload() }
  async function saveEdit(p: Record<string, any>) { if (!active) return; await patch(`/api/client-success/accounts/${active.row.id}`, p).catch(console.error); setActive(null); reload() }
  if (loading) return <Loading />
  const rows = data?.data || []
  const cols: Column<Acct>[] = [
    { key: 'name', label: 'Account', render: a => <div><div className="font-medium text-empire-text">{a.name}</div>{a.csmName && <div className="text-empire-text-dim text-[11px]">CSM: {a.csmName}</div>}</div> },
    { key: 'tier', label: 'Tier', render: a => <Pill text={a.tier} color={TIER_COLOR[a.tier] || '#7A7468'} /> },
    { key: 'status', label: 'Status', render: a => <Pill text={a.status.replace('_', ' ')} color={STATUS_COLOR[a.status] || '#7A7468'} /> },
    { key: 'arr', label: 'ARR', align: 'right', render: a => <span className="text-empire-text">{eur(a.arr)}</span> },
    { key: 'netExpansion', label: 'Δ12mo', align: 'right', render: a => <span style={{ color: a.netExpansion > 0 ? '#C9A233' : a.netExpansion < 0 ? '#F4EFE3' : '#7A7468' }}>{a.netExpansion > 0 ? '+' : ''}{eur(a.netExpansion)}</span> },
    { key: 'healthScore', label: 'Health', render: a => <HealthDot h={a.healthScore} /> },
    { key: 'id', label: '', align: 'right', render: a => <div className="flex justify-end"><RowActions onView={() => setActive({ row: a, mode: 'view' })} onEdit={() => setActive({ row: a, mode: 'edit' })} onDelete={() => remove(a.id)} deleteLabel={a.name} /></div> },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input className={`${inputCls} w-56`} placeholder="Search accounts…" value={q} onChange={e => { setQ(e.target.value); setPage(0) }} />
        <select className={inputCls} value={tier} onChange={e => { setTier(e.target.value); setPage(0) }}>
          <option value="">All tiers</option><option value="enterprise">enterprise</option><option value="growth">growth</option><option value="starter">starter</option>
        </select>
        <button onClick={() => setShowNew(v => !v)} className="ml-auto px-3 py-1.5 rounded text-sm font-medium text-white" style={{ background: ACCENT }}>{showNew ? 'Close' : '+ New Account'}</button>
      </div>
      {showNew && (
        <Panel title="New account">
          <div className="flex flex-wrap gap-2 items-end">
            <input className={`${inputCls} w-48`} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select className={inputCls} value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })}><option value="enterprise">enterprise</option><option value="growth">growth</option><option value="starter">starter</option></select>
            <AffixInput money className={`${inputCls} w-24`} placeholder="ARR" value={form.arr} onChange={e => setForm({ ...form, arr: e.target.value })} />
            <AffixInput money className={`${inputCls} w-24`} placeholder="prior ARR" value={form.priorArr} onChange={e => setForm({ ...form, priorArr: e.target.value })} />
            <input className={`${inputCls} w-20`} placeholder="seats" value={form.seats} onChange={e => setForm({ ...form, seats: e.target.value })} />
            <input className={`${inputCls} w-20`} placeholder="health" value={form.healthScore} onChange={e => setForm({ ...form, healthScore: e.target.value })} />
            <input className={`${inputCls} w-32`} placeholder="CSM" value={form.csmName} onChange={e => setForm({ ...form, csmName: e.target.value })} />
            <button disabled={busy || !form.name} onClick={submit} className="px-3 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Create'}</button>
          </div>
        </Panel>
      )}
      <Panel icon="people" title={`Accounts (${data?.total ?? rows.length})`}>
        <DataTable columns={cols} rows={rows} empty="No accounts." />
        {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
      </Panel>
      <EntityFormModal
        open={!!active}
        mode={active?.mode ?? 'view'}
        title={active ? `${active.mode === 'edit' ? 'Edit' : 'View'} account — ${active.row.name}` : ''}
        icon="people"
        accent={ACCENT}
        entity={active?.row ?? null}
        fields={ACCT_FIELDS}
        onClose={() => setActive(null)}
        onSave={saveEdit}
      />
    </div>
  )
}

/* ---------------- Health ---------------- */
type HealthData = { distribution: { band: string; count: number; arr: number }[]; watchlist: { id: string; name: string; tier: string; healthScore: number; arr: number; csmName: string | null; renewalDate: string | null }[] }
function Health() {
  const { data, loading } = useCS<HealthData>('health')
  if (loading) return <Loading />
  if (!data) return <EmptyState icon="gauge" title="No health data" />
  const segments = data.distribution.filter(d => d.count > 0).map(d => ({ label: d.band, value: d.count, color: BAND_COLOR[d.band] }))
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Panel icon="gauge" title="Health distribution">
        <div className="flex justify-center py-2"><DonutChart segments={segments} size={180} /></div>
        <div className="space-y-1.5 mt-3">
          {data.distribution.map(d => (
            <div key={d.band} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: BAND_COLOR[d.band] }} /><span className="text-empire-text-muted">{d.band}</span></div>
              <span className="text-empire-text">{d.count} · {eur(d.arr)}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel icon="alert" title={`Watchlist — health < 60 (${data.watchlist.length})`} className="lg:col-span-2">
        <div className="space-y-2">
          {data.watchlist.map(w => (
            <div key={w.id} className="flex items-center justify-between border border-empire-border rounded p-2.5">
              <div><div className="font-medium text-empire-text text-sm">{w.name}</div><div className="text-empire-text-dim text-[11px]">{w.tier} · {w.csmName || 'unassigned'}{w.renewalDate ? ` · renews ${new Date(w.renewalDate).toLocaleDateString()}` : ''}</div></div>
              <div className="flex items-center gap-4"><span className="text-empire-text-muted text-sm">{eur(w.arr)}</span><HealthDot h={w.healthScore} /></div>
            </div>
          ))}
          {!data.watchlist.length && <EmptyState icon="check" title="No at-risk accounts" hint="Everyone is above 60." />}
        </div>
      </Panel>
    </div>
  )
}

/* ---------------- Renewals ---------------- */
type Renewal = { id: string; name: string; tier: string; arr: number; healthScore: number; csmName: string | null; renewalDate: string | null; daysToRenewal: number | null; risk: string }
function Renewals() {
  const { data, loading } = useCS<Renewal[]>('renewals')
  if (loading) return <Loading />
  const rows = data || []
  const cols: Column<Renewal>[] = [
    { key: 'name', label: 'Account', render: r => <div><div className="font-medium text-empire-text">{r.name}</div><div className="text-empire-text-dim text-[11px]">{r.csmName || '—'}</div></div> },
    { key: 'tier', label: 'Tier', render: r => <Pill text={r.tier} color={TIER_COLOR[r.tier] || '#7A7468'} /> },
    { key: 'arr', label: 'ARR', align: 'right', render: r => <span className="text-empire-text">{eur(r.arr)}</span> },
    { key: 'daysToRenewal', label: 'Renews in', align: 'right', render: r => <span style={{ color: (r.daysToRenewal ?? 999) < 30 ? '#F4EFE3' : (r.daysToRenewal ?? 999) < 90 ? '#C9A233' : '#7A7468' }}>{r.daysToRenewal != null ? `${r.daysToRenewal}d` : '—'}</span> },
    { key: 'healthScore', label: 'Health', render: r => <HealthDot h={r.healthScore} /> },
    { key: 'risk', label: 'Risk', align: 'right', render: r => <Pill text={r.risk} color={RISK_COLOR[r.risk]} /> },
  ]
  const atRiskArr = rows.filter(r => r.risk === 'high').reduce((s, r) => s + r.arr, 0)
  return (
    <div className="space-y-4">
      <Grid cols={3}>
        <KpiCard icon="calendar" label="Upcoming Renewals" value={String(rows.length)} accent={ACCENT} />
        <KpiCard icon="coins" label="ARR in Pipeline" value={eur(rows.reduce((s, r) => s + r.arr, 0))} accent={ACCENT} />
        <KpiCard icon="alert" label="High-Risk ARR" value={eur(atRiskArr)} accent={atRiskArr > 0 ? '#F4EFE3' : '#C9A233'} />
      </Grid>
      <Panel icon="calendar" title="Renewal calendar (soonest first)">
        <DataTable columns={cols} rows={rows} empty="No upcoming renewals." />
      </Panel>
    </div>
  )
}

/* ---------------- Support ---------------- */
type Ticket = { id: string; subject: string; priority: string; status: string; csat: number | null; ticketKey: string | null; account: string; tier: string; openedAt: string; ageHours: number }
const TICKET_FIELDS: FieldDef[] = [
  { key: 'subject', label: 'Subject', full: true },
  { key: 'account', label: 'Account', readOnly: true },
  { key: 'priority', label: 'Priority', type: 'select', options: [{ value: 'urgent', label: 'urgent' }, { value: 'high', label: 'high' }, { value: 'normal', label: 'normal' }, { value: 'low', label: 'low' }] },
  { key: 'status', label: 'Status', type: 'select', options: [{ value: 'open', label: 'open' }, { value: 'pending', label: 'pending' }, { value: 'resolved', label: 'resolved' }] },
  { key: 'csat', label: 'CSAT (1-5)', type: 'number' },
]
function Support() {
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')
  // Unit tickets for the cross-department link dropdown — picked, never typed.
  const [unitTickets, setUnitTickets] = useState<{ value: string; label: string }[]>([])
  useEffect(() => {
    fetcher('/api/tickets?pageSize=100')
      .then((r: any) => setUnitTickets((Array.isArray(r?.data) ? r.data : []).map((t: any) => ({ value: t.key, label: `${t.key} — ${t.title}` }))))
      .catch(() => setUnitTickets([]))
  }, [])
  const { data, loading, reload } = useCS<Page<Ticket>>(`tickets?pageSize=15&page=${page + 1}${status ? `&status=${status}` : ''}`)
  const [active, setActive] = useState<{ row: Ticket; mode: 'view' | 'edit' } | null>(null)
  async function setTicketStatus(id: string, s: string) { await patch(`/api/client-success/tickets/${id}`, { status: s }).catch(console.error); reload() }
  async function removeTicket(id: string) { await del(`/api/client-success/tickets/${id}`).catch(console.error); reload() }
  async function saveEdit(p: Record<string, any>) { if (!active) return; await patch(`/api/client-success/tickets/${active.row.id}`, p).catch(console.error); setActive(null); reload() }
  if (loading) return <Loading />
  const rows = data?.data || []
  const cols: Column<Ticket>[] = [
    { key: 'priority', label: 'Prio', render: t => <Pill text={t.priority} color={PRIO_COLOR[t.priority] || '#7A7468'} /> },
    { key: 'subject', label: 'Subject', render: t => <div><div className="font-medium text-empire-text text-sm">{t.subject}</div><div className="text-empire-text-dim text-[11px]">{t.account}</div></div> },
    { key: 'ageHours', label: 'Age', align: 'right', render: t => <span className="text-empire-text-muted text-xs">{t.ageHours < 24 ? `${t.ageHours}h` : `${Math.round(t.ageHours / 24)}d`}</span> },
    { key: 'ticketKey', label: 'Ticket', render: t => t.ticketKey ? <span className="font-mono text-xs text-empire-gold">{t.ticketKey}</span> : <span className="text-empire-text-dim">—</span> },
    { key: 'csat', label: 'CSAT', align: 'right', render: t => t.csat != null ? <Stars n={t.csat} color={t.csat >= 4 ? '#C9A233' : t.csat >= 3 ? '#C9A233' : '#F4EFE3'} /> : <span className="text-empire-text-dim">—</span> },
    { key: 'status', label: 'Status', align: 'right', render: t => t.status === 'resolved'
        ? <Pill text="resolved" color="#C9A233" />
        : <select value={t.status} onChange={e => setTicketStatus(t.id, e.target.value)} className="bg-empire-bg-soft border border-empire-border rounded px-1.5 py-1 text-xs text-empire-text"><option value="open">open</option><option value="pending">pending</option><option value="resolved">resolved</option></select> },
    { key: 'id', label: '', align: 'right', render: t => <div className="flex justify-end"><RowActions onView={() => setActive({ row: t, mode: 'view' })} onEdit={() => setActive({ row: t, mode: 'edit' })} onDelete={() => removeTicket(t.id)} deleteLabel={t.subject} /></div> },
  ]
  const counts = { open: rows.length }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {['', 'open', 'pending', 'resolved'].map(s => (
          <button key={s || 'all'} onClick={() => { setStatus(s); setPage(0) }} className={`px-3 py-1.5 rounded text-xs font-medium border ${status === s ? 'text-white' : 'text-empire-text-muted border-empire-border'}`} style={status === s ? { background: ACCENT, borderColor: ACCENT } : {}}>{s || 'all'}</button>
        ))}
      </div>
      <Panel icon="lifebuoy" title={`Support tickets (${data?.total ?? counts.open})`}>
        <DataTable columns={cols} rows={rows} empty="No tickets." />
        {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
      </Panel>
      <EntityFormModal
        open={!!active}
        mode={active?.mode ?? 'view'}
        title={active ? `${active.mode === 'edit' ? 'Edit' : 'View'} ticket — ${active.row.subject}` : ''}
        icon="lifebuoy"
        accent={ACCENT}
        entity={active?.row ?? null}
        fields={[...TICKET_FIELDS, { key: 'ticketKey', label: 'Linked unit ticket', type: 'select', options: [{ value: '', label: 'No linked ticket' }, ...unitTickets] }]}
        onClose={() => setActive(null)}
        onSave={saveEdit}
      />
    </div>
  )
}

/* ---------------- Capability (CROSS-DEPARTMENT onboarding readiness) ---------------- */
// Surfaces /api/capability/* — a live aggregation across HR (people/skills),
// Engineering (delivery capacity), Operations (SLA health) and Client-Success
// (account load) to answer "can we onboard this client?". This is where the
// previously-siloed departments become visibly interconnected for a CSM.
type CapSummary = {
  people: { activeHeadcount: number; departments: number; distinctSkills: number; byDepartment: { department: string; headcount: number }[] }
  engineering: { activeServices: number; openIncidents: number; freeDeliverySlots: number; capacityRatio: number }
  operations: { slas: number; slaMeeting: number; slaHealth: number; totalBreaches: number }
  clientSuccess: { activeAccounts: number; accountCapacity: number; accountHeadroom: number; loadRatio: number }
  skills: { skill: string; count: number }[]
}
type CapVerdict = {
  canOnboard: boolean
  confidence: number
  engagementSize: string
  breakdown: {
    people: { coveredSkills: string[]; missingSkills: string[]; availableHeadcount: number; skillCoverage: number; pass: boolean }
    engineering: { freeDeliverySlots: number; requiredSlots: number; openIncidents: number; capacityRatio: number; pass: boolean }
    operations: { slas: number; slaMeeting: number; slaHealth: number; totalBreaches: number; pass: boolean }
    clientSuccess: { activeAccounts: number; accountCapacity: number; accountHeadroom: number; pass: boolean }
  }
  reasons: string[]
  gaps: string[]
}

function Capability() {
  const [summary, setSummary] = useState<CapSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['TypeScript', 'React'])
  const [engagementSize, setEngagementSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [targetDays, setTargetDays] = useState('30')
  const [verdict, setVerdict] = useState<CapVerdict | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetcher('/api/capability/summary').then(setSummary).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function runCheck() {
    setChecking(true)
    const requiredSkills = selectedSkills.map(s => s.trim()).filter(Boolean)
    const targetGoLiveDays = targetDays ? Number(targetDays) : undefined
    const v = await post('/api/capability/onboarding-check', { requiredSkills, engagementSize, targetGoLiveDays }).catch(console.error)
    if (v) setVerdict(v as CapVerdict)
    setChecking(false)
  }

  if (loading) return <Loading />
  if (!summary) return <EmptyState icon="compass" title="No capability data" />

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2">
        <EmpireIcon name="compass" size={15} className="text-empire-gold/80 mt-0.5 shrink-0" />
        <div>
          <h4 className="font-empire text-empire-gold text-xs tracking-widest uppercase">Onboarding Readiness — cross-department</h4>
          <p className="text-empire-text-muted text-xs mt-0.5">Live capacity across People · Engineering · Operations · Client-Success — “can we take on this client?”</p>
        </div>
      </div>

      {/* Org-wide cross-dept snapshot */}
      <Grid cols={4}>
        <KpiCard icon="people" label="Active Headcount" value={String(summary.people.activeHeadcount)} sub={`${summary.people.departments} departments`} accent={ACCENT} />
        <KpiCard icon="engineering" label="Eng Delivery Capacity" value={`${summary.engineering.capacityRatio}%`} sub={`${summary.engineering.freeDeliverySlots} free slot(s)`} accent={summary.engineering.capacityRatio >= 50 ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="gauge" label="SLA Health" value={`${summary.operations.slaHealth}%`} sub={`${summary.operations.slaMeeting}/${summary.operations.slas} met`} accent={summary.operations.slaHealth >= 50 ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="lifebuoy" label="Account Headroom" value={String(summary.clientSuccess.accountHeadroom)} sub={`${summary.clientSuccess.activeAccounts}/${summary.clientSuccess.accountCapacity} used`} accent={summary.clientSuccess.accountHeadroom > 0 ? '#C9A233' : '#F4EFE3'} />
      </Grid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Skills coverage across the org */}
        <Panel icon="medal" title={`Skills coverage (${summary.people.distinctSkills} distinct)`}>
          <div className="flex flex-wrap gap-1.5">
            {summary.skills.slice(0, 24).map(s => (
              <Pill key={s.skill} text={`${s.skill} · ${s.count}`} color={ACCENT} />
            ))}
            {!summary.skills.length && <span className="text-empire-text-dim text-xs">No skills recorded.</span>}
          </div>
        </Panel>

        {/* Onboarding-check form + verdict */}
        <Panel icon="check" title="Capability check" className="lg:col-span-2">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <span className="text-empire-text-dim text-[11px]">Required skills</span>
              <SkillMultiSelect
                options={summary.skills.map(s => s.skill)}
                selected={selectedSkills}
                onChange={setSelectedSkills}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-empire-text-dim text-[11px]">Engagement size</span>
              <select className={inputCls} value={engagementSize} onChange={e => setEngagementSize(e.target.value as 'small' | 'medium' | 'large')}>
                <option value="small">small</option><option value="medium">medium</option><option value="large">large</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-empire-text-dim text-[11px]">Go-live (days)</span>
              <input className={`${inputCls} w-24`} placeholder="30" value={targetDays} onChange={e => setTargetDays(e.target.value)} />
            </div>
            <button disabled={checking} onClick={runCheck} className="px-3 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{checking ? 'Checking…' : 'Run check'}</button>
          </div>

          {verdict && (
            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold border" style={{
                  color: verdict.canOnboard ? '#C9A233' : '#F4EFE3',
                  borderColor: verdict.canOnboard ? '#C9A23355' : '#F4EFE355',
                  background: verdict.canOnboard ? '#C9A23312' : '#F4EFE312',
                }}><EmpireIcon name={verdict.canOnboard ? 'check' : 'close'} size={15} />{verdict.canOnboard ? 'CAN ONBOARD' : 'CANNOT ONBOARD'}</span>
                <div className="text-empire-text-muted text-xs">Confidence <span className="text-empire-text font-medium">{verdict.confidence}%</span> · {verdict.engagementSize}</div>
              </div>

              <ProgressBar value={verdict.confidence} max={100} color={verdict.canOnboard ? '#C9A233' : '#C9A233'} />

              <div>
                <div className="text-empire-text-dim text-[11px] uppercase tracking-wide mb-1">Signals</div>
                <ul className="space-y-1">
                  {verdict.reasons.map((r, i) => {
                    const t = reasonTone(r)
                    return (
                      <li key={i} className="flex items-start gap-1.5 text-sm" style={{ color: t.color }}>
                        <EmpireIcon name={t.icon} size={13} className="mt-0.5 shrink-0" />
                        <span>{t.text}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-empire-border rounded p-3">
                  <div className="text-empire-text-dim text-[11px] uppercase tracking-wide mb-1.5">People — skills</div>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {verdict.breakdown.people.coveredSkills.map(s => <Pill key={s} text={s} color="#C9A233" />)}
                    {verdict.breakdown.people.missingSkills.map(s => <Pill key={s} text={s} color="#F4EFE3" />)}
                  </div>
                  <div className="text-empire-text-dim text-[11px]">{verdict.breakdown.people.availableHeadcount} available · {verdict.breakdown.people.skillCoverage}% coverage</div>
                </div>
                <div className="border border-empire-border rounded p-3">
                  <div className="text-empire-text-dim text-[11px] uppercase tracking-wide mb-1.5">Engineering</div>
                  <div className="text-sm text-empire-text">{verdict.breakdown.engineering.freeDeliverySlots} free / {verdict.breakdown.engineering.requiredSlots} needed slot(s)</div>
                  <div className="text-empire-text-dim text-[11px]">{verdict.breakdown.engineering.openIncidents} open incidents · {verdict.breakdown.engineering.capacityRatio}% capacity</div>
                </div>
                <div className="border border-empire-border rounded p-3">
                  <div className="text-empire-text-dim text-[11px] uppercase tracking-wide mb-1.5">Operations</div>
                  <div className="text-sm text-empire-text">{verdict.breakdown.operations.slaMeeting}/{verdict.breakdown.operations.slas} SLAs met</div>
                  <div className="text-empire-text-dim text-[11px]">{verdict.breakdown.operations.slaHealth}% health · {verdict.breakdown.operations.totalBreaches} breaches</div>
                </div>
                <div className="border border-empire-border rounded p-3">
                  <div className="text-empire-text-dim text-[11px] uppercase tracking-wide mb-1.5">Client-Success</div>
                  <div className="text-sm text-empire-text">{verdict.breakdown.clientSuccess.accountHeadroom} slot(s) free</div>
                  <div className="text-empire-text-dim text-[11px]">{verdict.breakdown.clientSuccess.activeAccounts}/{verdict.breakdown.clientSuccess.accountCapacity} accounts used</div>
                </div>
              </div>

              {verdict.gaps.length > 0 && (
                <div>
                  <div className="text-empire-text-dim text-[11px] uppercase tracking-wide mb-1">Gaps to close</div>
                  <ul className="space-y-1">
                    {verdict.gaps.map((g, i) => <li key={i} className="text-sm text-empire-text-muted">• {g}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

/* Multi-select dropdown for required skills — options sourced from the live
 * org-wide skill list, plus the ability to add a custom skill not yet on file.
 * Replaces the old comma-separated free-text box (Q11). */
function SkillMultiSelect({ options, selected, onChange }: {
  options: string[]; selected: string[]; onChange: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  // De-dupe options (case-insensitive) and keep selected-not-in-options visible too.
  const allOptions = Array.from(new Set([...options, ...selected]))
  const filtered = allOptions.filter(o => o.toLowerCase().includes(query.toLowerCase()))
  const canAddCustom = query.trim() && !allOptions.some(o => o.toLowerCase() === query.trim().toLowerCase())

  function toggle(skill: string) {
    onChange(selected.includes(skill) ? selected.filter(s => s !== skill) : [...selected, skill])
  }
  function addCustom() {
    const s = query.trim()
    if (s && !selected.includes(s)) onChange([...selected, s])
    setQuery('')
  }

  return (
    <div className="relative w-72">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${inputCls} w-full flex items-center justify-between gap-2 text-left`}
      >
        <span className="truncate">
          {selected.length === 0
            ? <span className="text-empire-text-dim">Select skills…</span>
            : `${selected.length} selected`}
        </span>
        <EmpireIcon name="chevron-down" size={13} className={`text-empire-text-dim shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(s => (
            <button key={s} type="button" onClick={() => toggle(s)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border border-empire-gold/40 text-empire-gold hover:bg-empire-gold/10">
              {s}<EmpireIcon name="close" size={10} />
            </button>
          ))}
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-empire-border bg-empire-elevated shadow-xl p-2">
            <input
              autoFocus
              className={`${inputCls} w-full mb-2`}
              placeholder="Search or add a skill…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canAddCustom) { e.preventDefault(); addCustom() } }}
            />
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {filtered.map(o => {
                const on = selected.includes(o)
                return (
                  <button key={o} type="button" onClick={() => toggle(o)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-empire-bg-soft">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-empire-gold/20 border-empire-gold/50' : 'border-empire-border'}`}>
                      {on && <EmpireIcon name="check" size={11} className="text-empire-gold" />}
                    </span>
                    <span className="text-empire-text truncate">{o}</span>
                  </button>
                )
              })}
              {canAddCustom && (
                <button type="button" onClick={addCustom}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-empire-bg-soft text-empire-gold">
                  <EmpireIcon name="plus" size={12} /> Add “{query.trim()}”
                </button>
              )}
              {!filtered.length && !canAddCustom && (
                <div className="px-2 py-2 text-empire-text-dim text-xs">No skills match.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
