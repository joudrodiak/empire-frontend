'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetcher, post, patch, del } from '@/lib/api'
import { KpiCard, Panel, AreaChart, BarChart, DataTable, ProgressBar, TabBar, Grid, EmptyState, type Column } from '@/lib/ui'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { Modal } from '@/components/molecules/Modal'
import { useStickyTab } from '@/lib/use-sticky-tab'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'
import { AffixInput } from '@/components/molecules/AffixInput'

type Page<T> = { data: T[]; page: number; pageSize: number; total: number; totalPages: number }

// Operations / Rodiak — the engine room. Vendor spend & renewal risk, process
// maturity, SLA attainment and run-cost trend all derive from /api/operations/*.

const ACCENT = '#C9A233'
const TABS = [
  { id: 'overview', label: 'Overview', icon: 'overview' as const },
  { id: 'vendors', label: 'Vendors', icon: 'handshake' as const },
  { id: 'slas', label: 'SLAs', icon: 'shield' as const },
  { id: 'processes', label: 'Processes', icon: 'cog' as const },
]
const CAT_COLOR: Record<string, string> = { saas: '#C9A233', infra: '#C9A233', contractor: '#C9A233', logistics: '#C9A233', facilities: '#C9A233', services: '#C9A233' }
const CRIT_COLOR: Record<string, string> = { critical: '#F4EFE3', high: '#C9A233', medium: '#C9A233', low: '#7A7468' }
const VSTATUS_COLOR: Record<string, string> = { active: '#C9A233', review: '#C9A233', churned: '#7A7468' }
const SLA_COLOR: Record<string, string> = { met: '#C9A233', at_risk: '#C9A233', breached: '#F4EFE3' }
const PSTATUS_COLOR: Record<string, string> = { documented: '#C9A233', draft: '#C9A233', needs_review: '#C9A233', deprecated: '#7A7468' }
const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n))
const eur = (n: number) => `€${fmt(n)}`

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap" style={{ color, borderColor: `${color}55`, background: `${color}12` }}>{text}</span>
}

export function OperationsPanel() {
  const [tab, setTab] = useStickyTab('operations', 'overview')
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-empire-border bg-empire-elevated/40 text-empire-gold/80">
          <EmpireIcon name={deptIcon('operations')} size={18} />
        </span>
        <div>
          <h3 className="font-empire text-empire-gold text-sm tracking-widest uppercase">The Engine Room</h3>
          <p className="text-empire-text-muted text-xs mt-0.5">Vendor spend, renewal risk, process maturity & SLA attainment — derived from the live vendor book, process register and SLA board.</p>
        </div>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} accent={ACCENT} />
      {tab === 'overview' && <Overview />}
      {tab === 'vendors' && <Vendors />}
      {tab === 'slas' && <Slas />}
      {tab === 'processes' && <Processes />}
    </div>
  )
}

function useOps<T>(path: string): { data: T | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    setLoading(true)
    fetcher(`/api/operations/${path}`).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [path])
  useEffect(() => { reload() }, [reload])
  return { data, loading, reload }
}
function Loading() { return <div className="py-16 text-center text-empire-text-dim text-sm animate-pulse">Computing from ops registers…</div> }
const inputCls = 'bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/60'

/* ---------------- Overview ---------------- */
type Summary = {
  vendorSpend: number; activeVendors: number; criticalVendors: number; renewals90: number; renewalSpend: number
  processes: number; docCoverage: number; avgAutomation: number; slas: number; slaMeeting: number; slaHealth: number
  avgAttainment: number; totalBreaches: number; monthlyRunCost: number; trendCost: number[]; trendLabels: string[]
}
function Overview() {
  const { data: s, loading } = useOps<Summary>('summary')
  if (loading) return <Loading />
  if (!s) return <EmptyState icon="cog" title="No ops data" />
  return (
    <div className="space-y-6">
      <Grid cols={6}>
        <KpiCard icon="coins" label="Vendor Spend (yr)" value={eur(s.vendorSpend)} sub={`${s.activeVendors} active`} accent={ACCENT} />
        <KpiCard icon="gauge" label="Monthly Run Cost" value={eur(s.monthlyRunCost)} accent="#C9A233" />
        <KpiCard icon="clock" label="Renewals (90d)" value={String(s.renewals90)} sub={`${eur(s.renewalSpend)} at stake`} accent={s.renewals90 > 0 ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="shield" label="SLA Health" value={`${s.slaHealth}%`} sub={`${s.slaMeeting}/${s.slas} met`} accent={s.slaHealth >= 80 ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="document" label="Process Coverage" value={`${s.docCoverage}%`} sub={`${s.processes} processes`} accent={s.docCoverage >= 70 ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="cog" label="Avg Automation" value={`${s.avgAutomation}%`} accent="#C9A233" />
      </Grid>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel icon="chart-line" title="Run-cost trend (vendor + ops)" className="lg:col-span-2">
          <AreaChart series={s.trendCost} color={ACCENT} height={140} />
          <div className="flex justify-between mt-2 text-[11px] text-empire-text-dim">{s.trendLabels.map(l => <span key={l}>{l}</span>)}</div>
        </Panel>
        <Panel icon="alert" title="SLA breaches (period)">
          <div className="text-[11px] uppercase tracking-widest text-empire-text-dim">Breaches</div>
          <div className="font-empire text-5xl leading-none mt-1 tabular-nums" style={{ color: s.totalBreaches > 8 ? '#F4EFE3' : '#C9A233' }}>{s.totalBreaches}</div>
          <div className="text-empire-text-muted text-xs mt-2">avg attainment {s.avgAttainment}% · {s.criticalVendors} critical vendors</div>
        </Panel>
      </div>
    </div>
  )
}

/* ---------------- Vendors ---------------- */
type Vendor = { id: string; name: string; category: string; status: string; criticality: string; annualCost: number; autoRenew: boolean; ownerName: string | null; daysToRenewal: number | null }
function Vendors() {
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const { data, loading, reload } = useOps<Page<Vendor>>(`vendors?pageSize=15&page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}${category ? `&category=${category}` : ''}`)
  const { data: spend } = useOps<{ byCategory: { category: string; vendors: number; annualCost: number }[]; byCriticality: { criticality: string; vendors: number; annualCost: number }[] }>('spend')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [viewing, setViewing] = useState<Vendor | null>(null)
  async function remove(id: string) { await del(`/api/operations/vendors/${id}`).catch(console.error); reload() }
  if (loading) return <Loading />
  const rows = data?.data || []
  const cols: Column<Vendor>[] = [
    { key: 'name', label: 'Vendor', render: v => <div><div className="font-medium text-empire-text">{v.name}</div><div className="text-empire-text-dim text-[11px]">{v.ownerName || '—'}{v.autoRenew ? ' · auto-renew' : ''}</div></div> },
    { key: 'category', label: 'Category', render: v => <Pill text={v.category} color={CAT_COLOR[v.category] || '#7A7468'} /> },
    { key: 'criticality', label: 'Critical', render: v => <Pill text={v.criticality} color={CRIT_COLOR[v.criticality] || '#7A7468'} /> },
    { key: 'status', label: 'Status', render: v => <Pill text={v.status} color={VSTATUS_COLOR[v.status] || '#7A7468'} /> },
    { key: 'annualCost', label: 'Annual', align: 'right', render: v => <span className="text-empire-text">{eur(v.annualCost)}</span> },
    { key: 'daysToRenewal', label: 'Renews', align: 'right', render: v => <span style={{ color: (v.daysToRenewal ?? 999) < 30 ? '#F4EFE3' : (v.daysToRenewal ?? 999) < 90 ? '#C9A233' : '#7A7468' }}>{v.daysToRenewal != null ? `${v.daysToRenewal}d` : '—'}</span> },
    { key: 'id', label: '', align: 'right', render: v => <RowActions onView={() => setViewing(v)} onEdit={() => setEditing(v)} onDelete={() => remove(v.id)} deleteLabel={`vendor “${v.name}”`} /> },
  ]
  return (
    <div className="space-y-4">
      {spend && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel icon="chart-bar" title="Spend by category">
            <BarChart data={spend.byCategory.map(c => c.annualCost)} labels={spend.byCategory.map(c => c.category)} color={ACCENT} height={140} />
          </Panel>
          <Panel icon="alert" title="Spend by criticality">
            <div className="space-y-2 pt-1">
              {spend.byCriticality.map(c => (
                <div key={c.criticality} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: CRIT_COLOR[c.criticality] }} /><span className="text-empire-text-muted capitalize">{c.criticality}</span></div>
                  <span className="text-empire-text">{c.vendors} · {eur(c.annualCost)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input className={`${inputCls} w-56`} placeholder="Search vendors…" value={q} onChange={e => { setQ(e.target.value); setPage(0) }} />
        <select className={inputCls} value={category} onChange={e => { setCategory(e.target.value); setPage(0) }}>
          <option value="">All categories</option><option value="saas">saas</option><option value="infra">infra</option><option value="contractor">contractor</option><option value="logistics">logistics</option><option value="facilities">facilities</option><option value="services">services</option>
        </select>
        <button onClick={() => setCreating(true)} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white" style={{ background: ACCENT }}><EmpireIcon name="plus" size={13} />New Vendor</button>
      </div>
      <Panel icon="handshake" title={`Vendors (${data?.total ?? rows.length})`}>
        <DataTable columns={cols} rows={rows} empty="No vendors." />
        {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
      </Panel>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || 'Vendor'} icon={<EmpireIcon name="handshake" size={18} />}>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Pill text={viewing.category} color={CAT_COLOR[viewing.category] || '#7A7468'} />
              <Pill text={viewing.criticality} color={CRIT_COLOR[viewing.criticality] || '#7A7468'} />
              <Pill text={viewing.status} color={VSTATUS_COLOR[viewing.status] || '#7A7468'} />
            </div>
            <VField label="Owner" value={viewing.ownerName || '—'} />
            <VField label="Annual cost" value={eur(viewing.annualCost)} />
            <VField label="Auto-renew" value={viewing.autoRenew ? 'Yes' : 'No'} />
            <VField label="Renews in" value={viewing.daysToRenewal != null ? `${viewing.daysToRenewal} days` : '—'} />
            <div className="flex justify-end pt-2">
              <button onClick={() => { setEditing(viewing); setViewing(null) }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white" style={{ background: ACCENT }}><EmpireIcon name="pen" size={13} />Edit</button>
            </div>
          </div>
        )}
      </Modal>

      <VendorModal open={creating} onClose={() => setCreating(false)} initial={null} onSaved={() => { setCreating(false); setPage(0); reload() }} />
      <VendorModal open={!!editing} onClose={() => setEditing(null)} initial={editing} onSaved={() => { setEditing(null); reload() }} />
    </div>
  )
}

function VField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-empire-border/50 pb-1.5">
      <span className="text-[11px] uppercase tracking-widest text-empire-text-dim">{label}</span>
      <span className="text-empire-text text-right">{value}</span>
    </div>
  )
}

const VENDOR_EMPTY = { name: '', category: 'saas', criticality: 'medium', status: 'active', annualCost: '', ownerName: '' }
function VendorModal({ open, onClose, initial, onSaved }: { open: boolean; onClose: () => void; initial: Vendor | null; onSaved: () => void }) {
  const [form, setForm] = useState(VENDOR_EMPTY)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    setForm(initial ? {
      name: initial.name, category: initial.category, criticality: initial.criticality,
      status: initial.status, annualCost: String(initial.annualCost ?? ''), ownerName: initial.ownerName || '',
    } : VENDOR_EMPTY)
  }, [open, initial])
  async function save() {
    if (!form.name) return
    setBusy(true)
    try {
      if (initial) await patch(`/api/operations/vendors/${initial.id}`, form)
      else await post('/api/operations/vendors', form)
      onSaved()
    } catch (e) { console.error(e) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={initial ? `Edit — ${initial.name}` : 'New vendor'} icon={<EmpireIcon name={initial ? 'pen' : 'plus'} size={18} />}>
      <div className="space-y-3">
        <input className={`${inputCls} w-full`} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <div className="flex flex-wrap gap-2">
          <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option value="saas">saas</option><option value="infra">infra</option><option value="contractor">contractor</option><option value="logistics">logistics</option><option value="facilities">facilities</option><option value="services">services</option></select>
          <select className={inputCls} value={form.criticality} onChange={e => setForm({ ...form, criticality: e.target.value })}><option value="critical">critical</option><option value="high">high</option><option value="medium">medium</option><option value="low">low</option></select>
          <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="active">active</option><option value="review">review</option><option value="churned">churned</option></select>
        </div>
        <div className="flex flex-wrap gap-2">
          <AffixInput money className={`${inputCls} w-32`} placeholder="annual cost" value={form.annualCost} onChange={e => setForm({ ...form, annualCost: e.target.value })} />
          <input className={`${inputCls} w-44`} placeholder="owner" value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text disabled:opacity-50">Cancel</button>
          <button disabled={busy || !form.name} onClick={save} className="px-4 py-2 rounded text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create'}</button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- SLAs ---------------- */
type Sla = { id: string; name: string; service: string; targetPct: number; actualPct: number; period: string; breaches: number; delta: number; status: string }
function Slas() {
  const { data, loading } = useOps<Sla[]>('slas')
  if (loading) return <Loading />
  const rows = data || []
  const met = rows.filter(r => r.status === 'met').length
  const cols: Column<Sla>[] = [
    { key: 'name', label: 'SLA', render: r => <div><div className="font-medium text-empire-text">{r.name}</div><div className="text-empire-text-dim text-[11px]">{r.service} · {r.period}</div></div> },
    { key: 'targetPct', label: 'Target', align: 'right', render: r => <span className="text-empire-text-muted">{r.targetPct}%</span> },
    { key: 'actualPct', label: 'Actual', align: 'right', render: r => <span style={{ color: SLA_COLOR[r.status] }}>{r.actualPct}%</span> },
    { key: 'delta', label: 'Δ', align: 'right', render: r => <span style={{ color: r.delta >= 0 ? '#C9A233' : '#F4EFE3' }}>{r.delta > 0 ? '+' : ''}{r.delta}</span> },
    { key: 'breaches', label: 'Breaches', align: 'right', render: r => <span style={{ color: r.breaches > 0 ? '#C9A233' : '#7A7468' }}>{r.breaches}</span> },
    { key: 'status', label: 'Status', align: 'right', render: r => <Pill text={r.status.replace('_', ' ')} color={SLA_COLOR[r.status]} /> },
  ]
  return (
    <div className="space-y-4">
      <Grid cols={3}>
        <KpiCard icon="shield" label="SLAs Tracked" value={String(rows.length)} accent={ACCENT} />
        <KpiCard icon="check" label="Meeting Target" value={`${met}/${rows.length}`} accent={met === rows.length ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="alert" label="Total Breaches" value={String(rows.reduce((s, r) => s + r.breaches, 0))} accent="#F4EFE3" />
      </Grid>
      <Panel icon="shield" title="SLA board (target vs actual)">
        <DataTable columns={cols} rows={rows} empty="No SLAs." />
      </Panel>
    </div>
  )
}

/* ---------------- Processes ---------------- */
type Proc = { id: string; name: string; area: string; status: string; ownerName: string | null; cycleTimeHours: number; automationPct: number; lastReviewedAt: string | null; stale: boolean }
type ProcData = { byStatus: { status: string; count: number }[]; list: Proc[] }
function Processes() {
  const { data, loading } = useOps<ProcData>('processes')
  if (loading) return <Loading />
  if (!data) return <EmptyState icon="document" title="No processes" />
  const cols: Column<Proc>[] = [
    { key: 'name', label: 'Process', render: p => <div><div className="font-medium text-empire-text">{p.name}</div><div className="flex items-center gap-1 text-empire-text-dim text-[11px]">{p.area} · {p.ownerName || '—'}{p.stale && <span className="inline-flex items-center gap-0.5 text-rag-amber-bright"> · <EmpireIcon name="alert" size={11} />stale</span>}</div></div> },
    { key: 'status', label: 'Status', render: p => <Pill text={p.status.replace('_', ' ')} color={PSTATUS_COLOR[p.status] || '#7A7468'} /> },
    { key: 'cycleTimeHours', label: 'Cycle', align: 'right', render: p => <span className="text-empire-text-muted">{p.cycleTimeHours}h</span> },
    { key: 'automationPct', label: 'Automation', render: p => <div className="w-28"><ProgressBar value={p.automationPct} max={100} color={p.automationPct >= 60 ? '#C9A233' : p.automationPct >= 30 ? '#C9A233' : '#F4EFE3'} /></div> },
  ]
  return (
    <div className="space-y-4">
      <Panel icon="gauge" title="Process maturity">
        <div className="flex flex-wrap gap-3">
          {data.byStatus.map(s => (
            <div key={s.status} className="border border-empire-border rounded px-3 py-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: PSTATUS_COLOR[s.status] || '#7A7468' }} />
              <span className="text-empire-text-muted text-xs capitalize">{s.status.replace('_', ' ')}</span>
              <span className="text-empire-text font-empire">{s.count}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel icon="cog" title={`Process register (${data.list.length})`}>
        <DataTable columns={cols} rows={data.list} empty="No processes." />
      </Panel>
    </div>
  )
}
