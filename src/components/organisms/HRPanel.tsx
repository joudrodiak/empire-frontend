'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetcher, post, patch, del } from '@/lib/api'
import { KpiCard, Panel, AreaChart, BarChart, DataTable, TabBar, Grid, EmptyState, type Column } from '@/lib/ui'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { Modal } from '@/components/molecules/Modal'
import { useStickyTab } from '@/lib/use-sticky-tab'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'
import { ContractsPanel } from '@/components/organisms/ContractsPanel'

type Page<T> = { data: T[]; page: number; pageSize: number; total: number; totalPages: number }

// HR / People — workforce surface backed by reqs, candidates, reviews, attrition
// events and headcount snapshots (/api/hr/*). Headcount trend, time-to-fill,
// hiring funnel, rating distribution and attrition all derive server-side.

const ACCENT = '#f59e0b'
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'hiring', label: 'Hiring' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'attrition', label: 'Attrition' },
  { id: 'reqs', label: 'Requisitions' },
  { id: 'contracts', label: 'Contracts' },
]
const STATUS_COLOR: Record<string, string> = { open: '#4f8ff7', interviewing: '#8b5cf6', offer: '#06b6d4', filled: '#10b981', on_hold: '#6b7280' }
const STAGE_COLOR: Record<string, string> = { applied: '#6b7280', screen: '#4f8ff7', onsite: '#06b6d4', offer: '#8b5cf6', hired: '#10b981', rejected: '#c94f4f' }
const TYPE_COLOR: Record<string, string> = { voluntary: '#f59e0b', involuntary: '#c94f4f', retirement: '#6b7280' }
const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n))
const eur = (n: number) => `€${fmt(n)}`

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap" style={{ color, borderColor: `${color}55`, background: `${color}12` }}>{text}</span>
}
function Stars({ n }: { n: number | null }) {
  if (n == null) return <span className="text-empire-text-dim">—</span>
  const c = n >= 4 ? '#10b981' : n >= 3 ? '#f59e0b' : '#c94f4f'
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <EmpireIcon key={i} name="star" size={12} style={{ color: i < n ? c : 'var(--empire-text-dim, #4A4540)' }} />
      ))}
    </span>
  )
}

export function HRPanel() {
  const [tab, setTab] = useStickyTab('hr', 'overview')
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid place-items-center w-9 h-9 rounded-lg border border-empire-border bg-empire-elevated/40 text-empire-gold shrink-0">
          <EmpireIcon name={deptIcon('hr')} size={18} />
        </span>
        <div>
          <h3 className="font-empire text-empire-gold text-sm tracking-widest uppercase">People Operations</h3>
          <p className="text-empire-text-muted text-xs mt-0.5">Headcount, hiring funnel, performance &amp; attrition — derived from the live req board, review cycle and exit log.</p>
        </div>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} accent={ACCENT} />
      {tab === 'overview' && <Overview />}
      {tab === 'hiring' && <Hiring />}
      {tab === 'reviews' && <Reviews />}
      {tab === 'attrition' && <Attrition />}
      {tab === 'reqs' && <Reqs />}
      {/* Global contract registry — every unit's contracts, searchable by employee,
          with a create shortcut. Centralizes People-Ops contract administration. */}
      {tab === 'contracts' && <ContractsPanel global accent={ACCENT} />}
    </div>
  )
}

function useHr<T>(path: string): { data: T | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    setLoading(true)
    fetcher(`/api/hr/${path}`).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [path])
  useEffect(() => { reload() }, [reload])
  return { data, loading, reload }
}
function Loading() { return <div className="py-16 text-center text-empire-text-dim text-sm animate-pulse">Computing from people data…</div> }
const inputCls = 'bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/60'

/* ---------------- Overview ---------------- */
type Summary = {
  headcount: number; openReqs: number; inPipeline: number; timeToFill: number; offerAccept: number
  attritionRate: number; regrettableRate: number; attritionEvents12mo: number; avgRating: number; promoRate: number; ytdHires: number
  trendHeadcount: number[]; trendLabels: string[]
}
function Overview() {
  const { data: s, loading } = useHr<Summary>('summary')
  if (loading) return <Loading />
  if (!s) return <EmptyState icon="people" title="No people data" />
  return (
    <div className="space-y-6">
      <Grid cols={6}>
        <KpiCard icon="people" label="Headcount" value={String(s.headcount)} sub={`${s.ytdHires} hires YTD`} accent={ACCENT} />
        <KpiCard icon="briefcase" label="Open Reqs" value={String(s.openReqs)} sub={`${s.inPipeline} in pipeline`} accent="#4f8ff7" />
        <KpiCard icon="clock" label="Time to Fill" value={`${s.timeToFill}d`} accent={s.timeToFill <= 45 ? '#10b981' : '#f59e0b'} />
        <KpiCard icon="check" label="Offer Accept" value={`${s.offerAccept}%`} accent={s.offerAccept >= 70 ? '#10b981' : '#f59e0b'} />
        <KpiCard icon="arrow-down" label="Attrition (12mo)" value={`${s.attritionRate}%`} sub={`${s.regrettableRate}% regrettable`} accent={s.attritionRate <= 12 ? '#10b981' : '#c94f4f'} />
        <KpiCard icon="medal" label="Avg Review" value={`${s.avgRating}/5`} sub={`${s.promoRate}% promoted`} accent={s.avgRating >= 3.5 ? '#10b981' : '#f59e0b'} />
      </Grid>
      <Panel icon="chart-line" title="Headcount trend">
        <AreaChart series={s.trendHeadcount} color={ACCENT} height={140} />
        <div className="flex justify-between mt-2 text-[11px] text-empire-text-dim">
          {s.trendLabels.map(l => <span key={l}>{l}</span>)}
        </div>
      </Panel>
    </div>
  )
}

/* ---------------- Hiring ---------------- */
type HiringData = { funnel: { stage: string; count: number }[]; byTeam: { team: string; open: number; total: number }[]; bySource: { source: string; count: number }[] }
function Hiring() {
  const { data, loading } = useHr<HiringData>('hiring')
  if (loading) return <Loading />
  if (!data) return <EmptyState icon="flag" title="No hiring data" />
  return (
    <div className="space-y-4">
      <Panel icon="gauge" title="Candidate funnel">
        <BarChart data={data.funnel.map(f => f.count)} labels={data.funnel.map(f => f.stage)} color={ACCENT} height={150} />
      </Panel>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel icon="briefcase" title="Open reqs by team">
          <div className="space-y-2">
            {data.byTeam.map(t => (
              <div key={t.team} className="flex items-center justify-between text-sm">
                <span className="text-empire-text-muted">{t.team}</span>
                <span className="text-empire-text">{t.open} open <span className="text-empire-text-dim">/ {t.total}</span></span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel icon="compass" title="Candidate source mix">
          <BarChart data={data.bySource.map(s => s.count)} labels={data.bySource.map(s => s.source)} color="#8b5cf6" height={140} />
        </Panel>
      </div>
    </div>
  )
}

/* ---------------- Reviews ---------------- */
type ReviewsData = { distribution: { rating: number; count: number }[]; byTeam: { team: string; reviews: number; avgRating: number; promoted: number }[]; total: number; promoted: number }
function Reviews() {
  const { data, loading } = useHr<ReviewsData>('reviews')
  if (loading) return <Loading />
  if (!data) return <EmptyState icon="document" title="No reviews" />
  const cols: Column<{ team: string; reviews: number; avgRating: number; promoted: number }>[] = [
    { key: 'team', label: 'Team', render: t => <span className="text-empire-text">{t.team}</span> },
    { key: 'reviews', label: 'Reviews', align: 'right', render: t => <span className="text-empire-text-muted">{t.reviews}</span> },
    { key: 'avgRating', label: 'Avg', align: 'right', render: t => <span style={{ color: t.avgRating >= 3.5 ? '#10b981' : '#f59e0b' }}>{t.avgRating}</span> },
    { key: 'promoted', label: 'Promoted', align: 'right', render: t => <span className="text-empire-text">{t.promoted}</span> },
  ]
  return (
    <div className="space-y-4">
      <Grid cols={3}>
        <KpiCard icon="document" label="Reviews (H1-2026)" value={String(data.total)} accent={ACCENT} />
        <KpiCard icon="arrow-up" label="Promotions" value={String(data.promoted)} accent="#10b981" />
        <KpiCard icon="medal" label="Promo Rate" value={`${data.total ? Math.round((data.promoted / data.total) * 100) : 0}%`} accent="#8b5cf6" />
      </Grid>
      <Panel icon="star" title="Rating distribution">
        <BarChart data={data.distribution.map(d => d.count)} labels={data.distribution.map(d => `${d.rating}/5`)} color={ACCENT} height={140} />
      </Panel>
      <Panel icon="people" title="By team">
        <DataTable columns={cols} rows={data.byTeam} empty="No reviews." />
      </Panel>
    </div>
  )
}

/* ---------------- Attrition ---------------- */
type AttrEvent = { id: string; employeeName: string; team: string; type: string; reason: string | null; regrettable: boolean; tenureMonths: number; exitDate: string }
type AttritionData = { byType: { type: string; count: number }[]; byTeam: { team: string; count: number }[]; avgTenure: number; total: number; trend: number[]; trendLabels: string[]; recent: AttrEvent[] }
function Attrition() {
  const { data, loading } = useHr<AttritionData>('attrition')
  if (loading) return <Loading />
  if (!data) return <EmptyState icon="arrow-down" title="No attrition data" />
  const cols: Column<AttrEvent>[] = [
    { key: 'employeeName', label: 'Employee', render: e => <div><div className="font-medium text-empire-text">{e.employeeName}</div><div className="text-empire-text-dim text-[11px]">{e.team}</div></div> },
    { key: 'type', label: 'Type', render: e => <Pill text={e.type} color={TYPE_COLOR[e.type] || '#6b7280'} /> },
    { key: 'reason', label: 'Reason', render: e => <span className="text-empire-text-muted text-xs">{e.reason || '—'}</span> },
    { key: 'tenureMonths', label: 'Tenure', align: 'right', render: e => <span className="text-empire-text-muted">{e.tenureMonths}mo</span> },
    { key: 'regrettable', label: 'Regret', align: 'right', render: e => e.regrettable ? <Pill text="regrettable" color="#c94f4f" /> : <span className="text-empire-text-dim text-xs">no</span> },
  ]
  return (
    <div className="space-y-4">
      <Grid cols={3}>
        <KpiCard icon="arrow-down" label="Exits (total)" value={String(data.total)} accent={ACCENT} />
        <KpiCard icon="clock" label="Avg Tenure" value={`${data.avgTenure}mo`} accent="#4f8ff7" />
        <KpiCard icon="alert" label="Voluntary" value={String(data.byType.find(t => t.type === 'voluntary')?.count ?? 0)} accent="#f59e0b" />
      </Grid>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel icon="chart-bar" title="By type">
          <BarChart data={data.byType.map(t => t.count)} labels={data.byType.map(t => t.type)} color="#c94f4f" height={140} />
        </Panel>
        <Panel icon="chart-line" title="Monthly exits trend">
          <AreaChart series={data.trend} color="#c94f4f" height={120} />
          <div className="flex justify-between mt-2 text-[11px] text-empire-text-dim">{data.trendLabels.map(l => <span key={l}>{l}</span>)}</div>
        </Panel>
      </div>
      <Panel icon="document" title="Recent exits">
        <DataTable columns={cols} rows={data.recent} empty="No exits." />
      </Panel>
    </div>
  )
}

/* ---------------- Requisitions ---------------- */
type Req = { id: string; title: string; team: string; level: string; location: string; status: string; type: string; salaryMin: number; salaryMax: number; hiringManager: string | null; ageDays: number; candidates: number }
const REQ_EMPTY = { title: '', team: 'Engineering', level: 'mid', location: 'Remote', status: 'open', type: 'new', salaryMin: '', salaryMax: '', hiringManager: '' }
function Reqs() {
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const { data, loading, reload } = useHr<Page<Req>>(`reqs?pageSize=15&page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}${status ? `&status=${status}` : ''}`)
  const [editing, setEditing] = useState<Req | null>(null) // null = closed
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<Req | null>(null)
  async function remove(id: string) { await del(`/api/hr/reqs/${id}`).catch(console.error); reload() }
  if (loading) return <Loading />
  const rows = data?.data || []
  const cols: Column<Req>[] = [
    { key: 'title', label: 'Role', render: r => <div><div className="font-medium text-empire-text">{r.title}</div><div className="text-empire-text-dim text-[11px]">{r.team} · {r.level} · {r.location}</div></div> },
    { key: 'status', label: 'Status', render: r => <Pill text={r.status.replace('_', ' ')} color={STATUS_COLOR[r.status] || '#6b7280'} /> },
    { key: 'type', label: 'Type', render: r => <span className="text-empire-text-muted text-xs">{r.type}</span> },
    { key: 'salaryMin', label: 'Band', align: 'right', render: r => <span className="text-empire-text-muted text-xs">{eur(r.salaryMin)}–{eur(r.salaryMax)}</span> },
    { key: 'candidates', label: 'Cands', align: 'right', render: r => <span className="text-empire-text">{r.candidates}</span> },
    { key: 'ageDays', label: 'Age', align: 'right', render: r => <span style={{ color: r.ageDays > 60 ? '#c94f4f' : r.ageDays > 30 ? '#f59e0b' : '#7A7468' }}>{r.ageDays}d</span> },
    { key: 'id', label: '', align: 'right', render: r => <RowActions onView={() => setViewing(r)} onEdit={() => setEditing(r)} onDelete={() => remove(r.id)} deleteLabel={`the “${r.title}” requisition`} /> },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input className={`${inputCls} w-56`} placeholder="Search roles…" value={q} onChange={e => { setQ(e.target.value); setPage(0) }} />
        <select className={inputCls} value={status} onChange={e => { setStatus(e.target.value); setPage(0) }}>
          <option value="">All statuses</option><option value="open">open</option><option value="interviewing">interviewing</option><option value="offer">offer</option><option value="filled">filled</option><option value="on_hold">on_hold</option>
        </select>
        <button onClick={() => setCreating(true)} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white" style={{ background: ACCENT }}><EmpireIcon name="plus" size={13} />New Req</button>
      </div>
      <Panel title={`Requisitions (${data?.total ?? rows.length})`}>
        <DataTable columns={cols} rows={rows} empty="No requisitions." />
        {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
      </Panel>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title || 'Requisition'} icon={<EmpireIcon name="briefcase" size={18} />}>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Pill text={viewing.status.replace('_', ' ')} color={STATUS_COLOR[viewing.status] || '#6b7280'} />
              <Pill text={viewing.type} color="#6b7280" />
              <Pill text={viewing.level} color="#8b5cf6" />
            </div>
            <Field label="Team" value={viewing.team} />
            <Field label="Location" value={viewing.location} />
            <Field label="Salary band" value={`${eur(viewing.salaryMin)} – ${eur(viewing.salaryMax)}`} />
            <Field label="Hiring manager" value={viewing.hiringManager || '—'} />
            <Field label="Candidates" value={String(viewing.candidates)} />
            <Field label="Age" value={`${viewing.ageDays} days open`} />
            <div className="flex justify-end pt-2">
              <button onClick={() => { setEditing(viewing); setViewing(null) }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white" style={{ background: ACCENT }}><EmpireIcon name="pen" size={13} />Edit</button>
            </div>
          </div>
        )}
      </Modal>

      <ReqModal open={creating} onClose={() => setCreating(false)} initial={null} onSaved={() => { setCreating(false); setPage(0); reload() }} />
      <ReqModal open={!!editing} onClose={() => setEditing(null)} initial={editing} onSaved={() => { setEditing(null); reload() }} />
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-empire-border/50 pb-1.5">
      <span className="text-[11px] uppercase tracking-widest text-empire-text-dim">{label}</span>
      <span className="text-empire-text text-right">{value}</span>
    </div>
  )
}

function ReqModal({ open, onClose, initial, onSaved }: { open: boolean; onClose: () => void; initial: Req | null; onSaved: () => void }) {
  const [form, setForm] = useState(REQ_EMPTY)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    setForm(initial ? {
      title: initial.title, team: initial.team, level: initial.level, location: initial.location,
      status: initial.status, type: initial.type, salaryMin: String(initial.salaryMin ?? ''),
      salaryMax: String(initial.salaryMax ?? ''), hiringManager: initial.hiringManager || '',
    } : REQ_EMPTY)
  }, [open, initial])
  async function save() {
    if (!form.title) return
    setBusy(true)
    try {
      if (initial) await patch(`/api/hr/reqs/${initial.id}`, form)
      else await post('/api/hr/reqs', form)
      onSaved()
    } catch (e) { console.error(e) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={initial ? `Edit — ${initial.title}` : 'New requisition'} icon={<EmpireIcon name={initial ? 'pen' : 'plus'} size={18} />}>
      <div className="space-y-3">
        <input className={`${inputCls} w-full`} placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <div className="flex flex-wrap gap-2">
          <input className={`${inputCls} w-40`} placeholder="Team" value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} />
          <select className={inputCls} value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}><option value="junior">junior</option><option value="mid">mid</option><option value="senior">senior</option><option value="staff">staff</option><option value="lead">lead</option></select>
          <input className={`${inputCls} w-32`} placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-2">
          <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="open">open</option><option value="interviewing">interviewing</option><option value="offer">offer</option><option value="filled">filled</option><option value="on_hold">on_hold</option></select>
          <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="new">new</option><option value="backfill">backfill</option></select>
          <input className={`${inputCls} w-24`} placeholder="sal min" value={form.salaryMin} onChange={e => setForm({ ...form, salaryMin: e.target.value })} />
          <input className={`${inputCls} w-24`} placeholder="sal max" value={form.salaryMax} onChange={e => setForm({ ...form, salaryMax: e.target.value })} />
        </div>
        <input className={`${inputCls} w-full`} placeholder="Hiring manager" value={form.hiringManager} onChange={e => setForm({ ...form, hiringManager: e.target.value })} />
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text disabled:opacity-50">Cancel</button>
          <button disabled={busy || !form.title} onClick={save} className="px-4 py-2 rounded text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create'}</button>
        </div>
      </div>
    </Modal>
  )
}
