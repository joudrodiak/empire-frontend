'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetcher, post, patch, del } from '@/lib/api'
import { KpiCard, Panel, AreaChart, BarChart, DonutChart, DataTable, TabBar, Grid, EmptyState, type Column } from '@/lib/ui'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { Modal } from '@/components/molecules/Modal'
import { useStickyTab } from '@/lib/use-sticky-tab'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'
import { AffixInput } from '@/components/molecules/AffixInput'
import { DatePicker } from '@/components/molecules/DatePicker'

type Page<T> = { data: T[]; page: number; pageSize: number; total: number; totalPages: number }

// HR / People — workforce surface backed by reqs, candidates, reviews, attrition
// events and headcount snapshots (/api/hr/*). Headcount trend, time-to-fill,
// hiring funnel, rating distribution and attrition all derive server-side.

const ACCENT = '#C9A233'
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'peopleops', label: 'People Ops' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'points', label: 'Points' },
  { id: 'hiring', label: 'Hiring' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'attrition', label: 'Attrition' },
  { id: 'reqs', label: 'Requisitions' },
]
// Employee lifecycle (People Operations) — type & status palettes.
const LIFE_TYPE_COLOR: Record<string, string> = { onboarding: '#C9A233', offboarding: '#F4EFE3', promotion: '#C9A233', transfer: '#C9A233', performance: '#C9A233' }
const LIFE_STATUS_COLOR: Record<string, string> = { planned: '#7A7468', in_progress: '#C9A233', completed: '#C9A233', cancelled: '#F4EFE3' }
const LIFE_TYPES = ['onboarding', 'offboarding', 'promotion', 'transfer', 'performance'] as const
const LIFE_STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'] as const
// Donut palette for the XP-by-source breakdown (gold-led, distinct hues).
const SOURCE_COLORS = ['#C9A233', '#C9A233', '#C9A233', '#C9A233', '#C9A233', '#7A7468']
const STATUS_COLOR: Record<string, string> = { open: '#C9A233', interviewing: '#C9A233', offer: '#C9A233', filled: '#C9A233', on_hold: '#7A7468' }
const STAGE_COLOR: Record<string, string> = { applied: '#7A7468', screen: '#C9A233', onsite: '#C9A233', offer: '#C9A233', hired: '#C9A233', rejected: '#F4EFE3' }
const TYPE_COLOR: Record<string, string> = { voluntary: '#C9A233', involuntary: '#F4EFE3', retirement: '#7A7468' }
const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n))
const eur = (n: number) => `€${fmt(n)}`

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap" style={{ color, borderColor: `${color}55`, background: `${color}12` }}>{text}</span>
}
function Stars({ n }: { n: number | null }) {
  if (n == null) return <span className="text-empire-text-dim">—</span>
  const c = n >= 4 ? '#C9A233' : n >= 3 ? '#C9A233' : '#F4EFE3'
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <EmpireIcon key={i} name="star" size={12} style={{ color: i < n ? c : 'var(--empire-text-dim, #7A7468)' }} />
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
      {tab === 'peopleops' && <PeopleOps />}
      {tab === 'payroll' && <Payroll />}
      {tab === 'points' && <Points />}
      {tab === 'hiring' && <Hiring />}
      {tab === 'reviews' && <Reviews />}
      {tab === 'attrition' && <Attrition />}
      {tab === 'reqs' && <Reqs />}
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
        <KpiCard icon="briefcase" label="Open Reqs" value={String(s.openReqs)} sub={`${s.inPipeline} in pipeline`} accent="#C9A233" />
        <KpiCard icon="clock" label="Time to Fill" value={`${s.timeToFill}d`} accent={s.timeToFill <= 45 ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="check" label="Offer Accept" value={`${s.offerAccept}%`} accent={s.offerAccept >= 70 ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="arrow-down" label="Attrition (12mo)" value={`${s.attritionRate}%`} sub={`${s.regrettableRate}% regrettable`} accent={s.attritionRate <= 12 ? '#C9A233' : '#F4EFE3'} />
        <KpiCard icon="medal" label="Avg Review" value={`${s.avgRating}/5`} sub={`${s.promoRate}% promoted`} accent={s.avgRating >= 3.5 ? '#C9A233' : '#C9A233'} />
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
          <BarChart data={data.bySource.map(s => s.count)} labels={data.bySource.map(s => s.source)} color="#C9A233" height={140} />
        </Panel>
      </div>
      <CandidateBoard />
    </div>
  )
}

type Candidate = { id: string; name: string; stage: string; source: string; rating: number | null; role: string; team: string; appliedAt: string; ageDays: number }
const CAND_EMPTY = { reqId: '', name: '', stage: 'applied', source: 'inbound', rating: '' }
function CandidateBoard() {
  const [page, setPage] = useState(0)
  const [stage, setStage] = useState('')
  const { data, loading, reload } = useHr<Page<Candidate>>(`candidates?pageSize=10&page=${page + 1}${stage ? `&stage=${stage}` : ''}`)
  const [reqs, setReqs] = useState<Req[]>([])
  const [editing, setEditing] = useState<Candidate | null>(null)
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    fetcher('/api/hr/reqs?pageSize=100').then(r => setReqs(r?.data || [])).catch(console.error)
  }, [])
  async function remove(id: string) { await del(`/api/hr/candidates/${id}`).catch(console.error); reload() }
  const rows = data?.data || []
  const cols: Column<Candidate>[] = [
    { key: 'name', label: 'Candidate', render: c => <div><div className="font-medium text-empire-text">{c.name}</div><div className="text-empire-text-dim text-[11px]">{c.role} · {c.team}</div></div> },
    { key: 'stage', label: 'Stage', render: c => <Pill text={c.stage} color={STAGE_COLOR[c.stage] || '#7A7468'} /> },
    { key: 'source', label: 'Source', render: c => <span className="text-empire-text-muted text-xs">{c.source}</span> },
    { key: 'rating', label: 'Rating', align: 'right', render: c => <Stars n={c.rating} /> },
    { key: 'ageDays', label: 'Age', align: 'right', render: c => <span className="text-empire-text-muted text-xs">{c.ageDays}d</span> },
    { key: 'id', label: '', align: 'right', render: c => <RowActions onEdit={() => setEditing(c)} onDelete={() => remove(c.id)} deleteLabel={`candidate “${c.name}”`} /> },
  ]
  return (
    <Panel
      icon="people"
      title={`Candidate pipeline (${data?.total ?? rows.length})`}
      actions={<button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white" style={{ background: ACCENT }}><EmpireIcon name="plus" size={13} />Add candidate</button>}
    >
      <div className="mb-3 flex items-center gap-2">
        <select className={inputCls} value={stage} onChange={e => { setStage(e.target.value); setPage(0) }}>
          <option value="">All stages</option>
          {Object.keys(STAGE_COLOR).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {loading ? <Loading /> : <DataTable columns={cols} rows={rows} empty="No candidates yet." />}
      {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
      <CandidateModal open={creating} reqs={reqs} initial={null} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload() }} />
      <CandidateModal open={!!editing} reqs={reqs} initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />
    </Panel>
  )
}

function CandidateModal({ open, reqs, initial, onClose, onSaved }: { open: boolean; reqs: Req[]; initial: Candidate | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(CAND_EMPTY)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    if (initial) {
      const req = reqs.find(r => r.title === initial.role && r.team === initial.team)
      setForm({ reqId: req?.id || '', name: initial.name, stage: initial.stage, source: initial.source, rating: initial.rating != null ? String(initial.rating) : '' })
    } else setForm({ ...CAND_EMPTY, reqId: reqs[0]?.id || '' })
  }, [open, initial, reqs])
  async function save() {
    if (!form.name || (!initial && !form.reqId)) return
    setBusy(true)
    try {
      const payload = { reqId: form.reqId, name: form.name, stage: form.stage, source: form.source, rating: form.rating ? Number(form.rating) : null }
      if (initial) await patch(`/api/hr/candidates/${initial.id}`, payload)
      else await post('/api/hr/candidates', payload)
      onSaved()
    } catch (e) { console.error(e) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={initial ? `Edit candidate · ${initial.name}` : 'Add candidate'} icon={<EmpireIcon name={initial ? 'pen' : 'plus'} size={18} />}>
      <div className="space-y-3">
        {!initial && (
          <select className={`${inputCls} w-full`} value={form.reqId} onChange={e => setForm({ ...form, reqId: e.target.value })}>
            <option value="">Select requisition…</option>
            {reqs.map(r => <option key={r.id} value={r.id}>{r.title} · {r.team}</option>)}
          </select>
        )}
        <input className={`${inputCls} w-full`} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Candidate name" />
        <div className="flex flex-wrap gap-2">
          <select className={inputCls} value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>{Object.keys(STAGE_COLOR).map(s => <option key={s} value={s}>{s}</option>)}</select>
          <input className={`${inputCls} flex-1`} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="Source" />
          <select className={inputCls} value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })}>
            <option value="">Rating…</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}/5</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text disabled:opacity-50">Cancel</button>
          <button onClick={save} disabled={busy || !form.name || (!initial && !form.reqId)} className="rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create'}</button>
        </div>
      </div>
    </Modal>
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
    { key: 'avgRating', label: 'Avg', align: 'right', render: t => <span style={{ color: t.avgRating >= 3.5 ? '#C9A233' : '#C9A233' }}>{t.avgRating}</span> },
    { key: 'promoted', label: 'Promoted', align: 'right', render: t => <span className="text-empire-text">{t.promoted}</span> },
  ]
  return (
    <div className="space-y-4">
      <Grid cols={3}>
        <KpiCard icon="document" label="Reviews (H1-2026)" value={String(data.total)} accent={ACCENT} />
        <KpiCard icon="arrow-up" label="Promotions" value={String(data.promoted)} accent="#C9A233" />
        <KpiCard icon="medal" label="Promo Rate" value={`${data.total ? Math.round((data.promoted / data.total) * 100) : 0}%`} accent="#C9A233" />
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
    { key: 'type', label: 'Type', render: e => <Pill text={e.type} color={TYPE_COLOR[e.type] || '#7A7468'} /> },
    { key: 'reason', label: 'Reason', render: e => <span className="text-empire-text-muted text-xs">{e.reason || '—'}</span> },
    { key: 'tenureMonths', label: 'Tenure', align: 'right', render: e => <span className="text-empire-text-muted">{e.tenureMonths}mo</span> },
    { key: 'regrettable', label: 'Regret', align: 'right', render: e => e.regrettable ? <Pill text="regrettable" color="#F4EFE3" /> : <span className="text-empire-text-dim text-xs">no</span> },
  ]
  return (
    <div className="space-y-4">
      <Grid cols={3}>
        <KpiCard icon="arrow-down" label="Exits (total)" value={String(data.total)} accent={ACCENT} />
        <KpiCard icon="clock" label="Avg Tenure" value={`${data.avgTenure}mo`} accent="#C9A233" />
        <KpiCard icon="alert" label="Voluntary" value={String(data.byType.find(t => t.type === 'voluntary')?.count ?? 0)} accent="#C9A233" />
      </Grid>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel icon="chart-bar" title="By type">
          <BarChart data={data.byType.map(t => t.count)} labels={data.byType.map(t => t.type)} color="#F4EFE3" height={140} />
        </Panel>
        <Panel icon="chart-line" title="Monthly exits trend">
          <AreaChart series={data.trend} color="#F4EFE3" height={120} />
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
    { key: 'status', label: 'Status', render: r => <Pill text={r.status.replace('_', ' ')} color={STATUS_COLOR[r.status] || '#7A7468'} /> },
    { key: 'type', label: 'Type', render: r => <span className="text-empire-text-muted text-xs">{r.type}</span> },
    { key: 'salaryMin', label: 'Band', align: 'right', render: r => <span className="text-empire-text-muted text-xs">{eur(r.salaryMin)}–{eur(r.salaryMax)}</span> },
    { key: 'candidates', label: 'Cands', align: 'right', render: r => <span className="text-empire-text">{r.candidates}</span> },
    { key: 'ageDays', label: 'Age', align: 'right', render: r => <span style={{ color: r.ageDays > 60 ? '#F4EFE3' : r.ageDays > 30 ? '#C9A233' : '#7A7468' }}>{r.ageDays}d</span> },
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
              <Pill text={viewing.status.replace('_', ' ')} color={STATUS_COLOR[viewing.status] || '#7A7468'} />
              <Pill text={viewing.type} color="#7A7468" />
              <Pill text={viewing.level} color="#C9A233" />
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
          <AffixInput money className={`${inputCls} w-24`} placeholder="sal min" value={form.salaryMin} onChange={e => setForm({ ...form, salaryMin: e.target.value })} />
          <AffixInput money className={`${inputCls} w-24`} placeholder="sal max" value={form.salaryMax} onChange={e => setForm({ ...form, salaryMax: e.target.value })} />
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

/* ====================================================================== */
/* People Operations — employee lifecycle board (onboarding | offboarding |
   promotion | transfer | performance). Full CRUD + pagination + RowActions.
   Completing a promotion/transfer/offboarding/onboarding applies real effects
   server-side (and awards XP for onboarding), so the board is actionable, never
   a dead-end. Backed by /api/people. */
/* ====================================================================== */

type EmpLite = { id: string; name: string; role: string; department?: { id: string; name: string; slug: string } | null }
type RoleLite = { id: string; key: string; name: string; level: number }
type DeptLite = { id: string; name: string; slug: string }
type Lifecycle = {
  id: string; employeeId: string; type: string; status: string
  fromRole: string | null; toRole: string | null; toRoleId: string | null; toDeptId: string | null
  rating: number | null; cycle: string | null; title: string | null; notes: string | null
  effectiveAt: string | null; completedAt: string | null; xpAwarded: boolean; createdAt: string
  employee?: { id: string; name: string; role: string } | null
}
const LIFE_EMPTY = {
  employeeId: '', type: 'onboarding', status: 'planned', title: '', notes: '',
  toRole: '', toRoleId: '', toDeptId: '', rating: '', cycle: '', effectiveAt: '',
}
const dateLabel = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

function PeopleOps() {
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const path = `/api/people?pageSize=15&page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}${type ? `&type=${type}` : ''}${status ? `&status=${status}` : ''}`
  const [data, setData] = useState<Page<Lifecycle> | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    setLoading(true)
    fetcher(path).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [path])
  useEffect(() => { reload() }, [reload])

  const [editing, setEditing] = useState<Lifecycle | null>(null)
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<Lifecycle | null>(null)
  async function remove(id: string) { await del(`/api/people/${id}`).catch(console.error); reload() }

  const rows = data?.data || []
  const cols: Column<Lifecycle>[] = [
    { key: 'employee', label: 'Person', render: e => <div><div className="font-medium text-empire-text">{e.employee?.name || '—'}</div><div className="text-empire-text-dim text-[11px]">{e.employee?.role || ''}</div></div> },
    { key: 'type', label: 'Type', render: e => <Pill text={e.type} color={LIFE_TYPE_COLOR[e.type] || '#7A7468'} /> },
    { key: 'title', label: 'Detail', render: e => <span className="text-empire-text-muted text-xs">{e.title || (e.toRole ? `→ ${e.toRole}` : e.cycle || '—')}</span> },
    { key: 'status', label: 'Status', render: e => <Pill text={e.status.replace('_', ' ')} color={LIFE_STATUS_COLOR[e.status] || '#7A7468'} /> },
    { key: 'effectiveAt', label: 'Effective', align: 'right', render: e => <span className="text-empire-text-muted text-xs">{dateLabel(e.effectiveAt)}</span> },
    { key: 'id', label: '', align: 'right', render: e => <RowActions onView={() => setViewing(e)} onEdit={() => setEditing(e)} onDelete={() => remove(e.id)} deleteLabel={`this ${e.type} event`} /> },
  ]
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${inputCls} w-56`} placeholder="Search people / notes…" value={q} onChange={e => { setQ(e.target.value); setPage(0) }} />
        <select className={inputCls} value={type} onChange={e => { setType(e.target.value); setPage(0) }}>
          <option value="">All types</option>{LIFE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={inputCls} value={status} onChange={e => { setStatus(e.target.value); setPage(0) }}>
          <option value="">All statuses</option>{LIFE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <button onClick={() => setCreating(true)} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white" style={{ background: ACCENT }}><EmpireIcon name="plus" size={13} />New Event</button>
      </div>
      {loading ? <Loading /> : (
        <Panel title={`Lifecycle events (${data?.total ?? rows.length})`}>
          <DataTable columns={cols} rows={rows} empty="No lifecycle events yet. Create an onboarding, promotion or transfer to get started." />
          {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
        </Panel>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${viewing.type} — ${viewing.employee?.name || ''}` : 'Event'} icon={<EmpireIcon name="people" size={18} />}>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Pill text={viewing.type} color={LIFE_TYPE_COLOR[viewing.type] || '#7A7468'} />
              <Pill text={viewing.status.replace('_', ' ')} color={LIFE_STATUS_COLOR[viewing.status] || '#7A7468'} />
              {viewing.xpAwarded && <Pill text="XP awarded" color="#C9A233" />}
            </div>
            <Field label="Person" value={viewing.employee?.name || '—'} />
            {viewing.title && <Field label="Title" value={viewing.title} />}
            {(viewing.fromRole || viewing.toRole) && <Field label="Role change" value={`${viewing.fromRole || '—'} → ${viewing.toRole || '—'}`} />}
            {viewing.cycle && <Field label="Cycle" value={viewing.cycle} />}
            {viewing.rating != null && <Field label="Rating" value={`${viewing.rating}/5`} />}
            <Field label="Effective" value={dateLabel(viewing.effectiveAt)} />
            <Field label="Completed" value={dateLabel(viewing.completedAt)} />
            {viewing.notes && <div className="text-empire-text-muted text-xs whitespace-pre-wrap border-t border-empire-border/50 pt-2">{viewing.notes}</div>}
            <div className="flex justify-end pt-2">
              <button onClick={() => { setEditing(viewing); setViewing(null) }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white" style={{ background: ACCENT }}><EmpireIcon name="pen" size={13} />Edit</button>
            </div>
          </div>
        )}
      </Modal>

      <LifecycleModal open={creating} onClose={() => setCreating(false)} initial={null} onSaved={() => { setCreating(false); setPage(0); reload() }} />
      <LifecycleModal open={!!editing} onClose={() => setEditing(null)} initial={editing} onSaved={() => { setEditing(null); reload() }} />
    </div>
  )
}

function LifecycleModal({ open, onClose, initial, onSaved }: { open: boolean; onClose: () => void; initial: Lifecycle | null; onSaved: () => void }) {
  const [form, setForm] = useState(LIFE_EMPTY)
  const [busy, setBusy] = useState(false)
  const [emps, setEmps] = useState<EmpLite[]>([])
  const [roles, setRoles] = useState<RoleLite[]>([])
  const [depts, setDepts] = useState<DeptLite[]>([])
  useEffect(() => {
    if (!open) return
    fetcher('/api/employees').then(setEmps).catch(console.error)
    fetcher('/api/iam/roles').then(r => setRoles(Array.isArray(r) ? r : (r?.roles ?? []))).catch(console.error)
    fetcher('/api/departments').then(d => setDepts(Array.isArray(d) ? d : (d?.data ?? []))).catch(console.error)
    setForm(initial ? {
      employeeId: initial.employeeId, type: initial.type, status: initial.status,
      title: initial.title || '', notes: initial.notes || '', toRole: initial.toRole || '',
      toRoleId: initial.toRoleId || '', toDeptId: initial.toDeptId || '',
      rating: initial.rating != null ? String(initial.rating) : '', cycle: initial.cycle || '',
      effectiveAt: initial.effectiveAt ? initial.effectiveAt.slice(0, 10) : '',
    } : LIFE_EMPTY)
  }, [open, initial])

  async function save() {
    if (!form.employeeId || !form.type) return
    setBusy(true)
    try {
      const payload: any = {
        employeeId: form.employeeId, type: form.type, status: form.status,
        title: form.title || undefined, notes: form.notes || undefined,
        effectiveAt: form.effectiveAt || undefined,
      }
      if (form.type === 'promotion') { payload.toRole = form.toRole || undefined; payload.toRoleId = form.toRoleId || undefined }
      if (form.type === 'transfer') payload.toDeptId = form.toDeptId || undefined
      if (form.type === 'performance') { payload.rating = form.rating || undefined; payload.cycle = form.cycle || undefined }
      if (initial) await patch(`/api/people/${initial.id}`, payload)
      else await post('/api/people', payload)
      onSaved()
    } catch (e) { console.error(e) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={initial ? `Edit — ${initial.type}` : 'New lifecycle event'} icon={<EmpireIcon name={initial ? 'pen' : 'plus'} size={18} />}>
      <div className="space-y-3">
        <select className={`${inputCls} w-full`} value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
          <option value="">Select person…</option>
          {emps.map(p => <option key={p.id} value={p.id}>{p.name} — {p.role}</option>)}
        </select>
        <div className="flex flex-wrap gap-2">
          <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{LIFE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
          <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{LIFE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
          <DatePicker className={inputCls} value={form.effectiveAt} onChange={e => setForm({ ...form, effectiveAt: e.target.value })} />
        </div>
        <input className={`${inputCls} w-full`} placeholder="Title (e.g. Q3 onboarding, Promotion to Senior)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        {form.type === 'promotion' && (
          <div className="flex flex-wrap gap-2">
            <select className={`${inputCls} flex-1`} value={form.toRoleId} onChange={e => { const r = roles.find(x => x.id === e.target.value); setForm({ ...form, toRoleId: e.target.value, toRole: r ? r.name : form.toRole }) }}>
              <option value="">New role (structured)…</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name} · L{r.level}</option>)}
            </select>
            <input className={`${inputCls} flex-1`} placeholder="New title (free-text)" value={form.toRole} onChange={e => setForm({ ...form, toRole: e.target.value })} />
          </div>
        )}
        {form.type === 'transfer' && (
          <select className={`${inputCls} w-full`} value={form.toDeptId} onChange={e => setForm({ ...form, toDeptId: e.target.value })}>
            <option value="">Destination unit…</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        {form.type === 'performance' && (
          <div className="flex flex-wrap gap-2">
            <select className={inputCls} value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })}><option value="">Rating…</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}/5</option>)}</select>
            <input className={`${inputCls} flex-1`} placeholder="Cycle (e.g. H1-2026)" value={form.cycle} onChange={e => setForm({ ...form, cycle: e.target.value })} />
          </div>
        )}
        <textarea className={`${inputCls} w-full min-h-[72px]`} placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        {form.status === 'completed' && form.type === 'onboarding' && <p className="text-[11px] text-empire-gold/80">Completing an onboarding awards XP to this person.</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text disabled:opacity-50">Cancel</button>
          <button disabled={busy || !form.employeeId} onClick={save} className="px-4 py-2 rounded text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create'}</button>
        </div>
      </div>
    </Modal>
  )
}

/* ====================================================================== */
/* Points — enterprise gamification dashboard. Leaderboard, level distribution,
   XP-by-source breakdown and rank rollup, all derived from /api/people/summary.
   No placeholder charts: every series is the live awarded-XP ledger. */
/* ====================================================================== */

type Achievement = { key: string; label: string; icon: string }
type LeaderRow = {
  rank: number; id: string; name: string; role: string; avatarUrl: string | null
  department: { id: string; name: string; slug: string; color: string } | null
  xp: number; level: number; rankName: string; rankIcon: string; achievements: Achievement[]
}
type PointsSummary = {
  totals: { people: number; totalXp: number; totalAwardedXp: number; avgLevel: number; lifecycleEvents: number }
  leaderboard: LeaderRow[]
  levelDistribution: { level: number; count: number }[]
  xpBySource: { label: string; value: number }[]
  rankRollup: { name: string; icon: string; count: number }[]
}

function Points() {
  const [s, setS] = useState<PointsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetcher('/api/people/summary').then(setS).catch(console.error).finally(() => setLoading(false)) }, [])
  if (loading) return <Loading />
  if (!s) return <EmptyState icon="medal" title="No points data" />

  const top = s.leaderboard.slice(0, 12)
  const segments = s.xpBySource.filter(x => x.value > 0).map((x, i) => ({ label: x.label, value: x.value, color: SOURCE_COLORS[i % SOURCE_COLORS.length] }))
  const cols: Column<LeaderRow>[] = [
    { key: 'rank', label: '#', render: r => <span className="font-data text-empire-text-dim">{r.rank}</span> },
    { key: 'name', label: 'Person', render: r => <div><div className="font-medium text-empire-text">{r.name}</div><div className="text-empire-text-dim text-[11px]">{r.department?.name || r.role}</div></div> },
    { key: 'level', label: 'Level', align: 'right', render: r => <span className="font-data text-empire-text">L{r.level}</span> },
    { key: 'rankName', label: 'Rank', render: r => <Pill text={r.rankName} color="#C9A233" /> },
    { key: 'achievements', label: 'Badges', align: 'right', render: r => <span className="text-empire-text-muted text-xs">{r.achievements.length}</span> },
    { key: 'xp', label: 'XP', align: 'right', render: r => <span className="font-data text-empire-gold">{r.xp.toLocaleString()}</span> },
  ]
  return (
    <div className="space-y-6">
      <Grid cols={4}>
        <KpiCard icon="people" label="People scored" value={String(s.totals.people)} accent={ACCENT} />
        <KpiCard icon="medal" label="Total XP" value={s.totals.totalXp.toLocaleString()} sub={`${s.totals.totalAwardedXp.toLocaleString()} awarded`} accent="#C9A233" />
        <KpiCard icon="arrow-up" label="Avg level" value={String(s.totals.avgLevel)} accent="#C9A233" />
        <KpiCard icon="flag" label="Lifecycle events" value={String(s.totals.lifecycleEvents)} accent="#C9A233" />
      </Grid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel icon="chart-bar" title="Level distribution">
          {s.levelDistribution.length
            ? <BarChart data={s.levelDistribution.map(d => d.count)} labels={s.levelDistribution.map(d => `L${d.level}`)} color={ACCENT} height={150} />
            : <EmptyState icon="chart-bar" title="No levels yet" />}
        </Panel>
        <Panel icon="chart-bar" title="XP by source">
          {segments.length ? (
            <div className="flex items-center gap-6 flex-wrap">
              <DonutChart segments={segments} size={180} thickness={20} centerLabel="XP" valueFormat={t => t >= 1000 ? `${(t / 1000).toFixed(1)}k` : String(Math.round(t))} />
              <div className="space-y-1.5 text-sm flex-1 min-w-[160px]">
                {segments.map(seg => (
                  <div key={seg.label} className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-empire-text-muted"><span className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color }} />{seg.label}</span>
                    <span className="font-data text-empire-text">{seg.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyState icon="chart-bar" title="No XP awarded yet" />}
        </Panel>
      </div>

      <Panel icon="medal" title="Leaderboard">
        <DataTable columns={cols} rows={top} empty="No one scored yet." />
      </Panel>

      <Panel icon="shield" title="Rank rollup">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {s.rankRollup.map(r => (
            <div key={r.name} className="rounded-lg border border-empire-border bg-empire-elevated/40 px-3 py-3 text-center">
              <div className="text-[11px] uppercase tracking-widest text-empire-text-dim">{r.name}</div>
              <div className="font-empire text-empire-gold text-2xl mt-1">{r.count}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

/* ====================================================================== */
/* Payroll — dual-authorized payout runs (/api/hr/payroll). Every run walks
   preparation → pending_authorization → authorized → executed → reconciled.
   BOTH HR and Finance must sign before a run is authorized (only those two
   units can sign — the server checks the caller's unit), and execution is
   hard-gated on the payout date agreed with Finance. Totals derive from the
   live roster (salary × FTE), never typed in. */
/* ====================================================================== */

type PayrollRun = {
  id: string; period: string; agreedDate: string; status: string
  totalAmount: number; currency: string; headcount: number; notes: string | null
  hrApprovedAt: string | null; financeApprovedAt: string | null
  executedAt: string | null; reconciledAt: string | null
  hrApprovedBy: { id: string; name: string } | null
  financeApprovedBy: { id: string; name: string } | null
}
const RUN_STATUS_COLOR: Record<string, string> = {
  preparation: '#7A7468', pending_authorization: '#C9A233', authorized: '#C9A233',
  executed: '#C9A233', reconciled: '#F4EFE3', cancelled: '#7A7468',
}
// The processing contract shown to operators — mirrors the server's gates.
const PAYROLL_STAGES = [
  { icon: 'document', title: '1 · Preparation', text: 'The run is drafted for a period; gross totals and headcount are computed from the live roster (salary × FTE). Verify joiners, leavers and salary changes, then submit for authorization.' },
  { icon: 'shield', title: '2 · Dual authorization', text: 'ONLY HR and Finance can authorize, and BOTH must sign — each signs the side of their own unit. One signature alone never releases money; the run flips to “authorized” only when both are on record.' },
  { icon: 'check', title: '3 · Execution on the agreed date', text: 'Payout runs only after full authorization AND once the payout date agreed with Finance has arrived — the date is a hard gate. Changing the date resets both signatures.' },
  { icon: 'chart-line', title: '4 · Reconciliation & reporting', text: 'After execution, bank statements are matched against the run and the reconciliation report is closed, completing the audit trail tied to the agreed date.' },
] as const

function SignaturePill({ label, at, by }: { label: string; at: string | null; by: { name: string } | null }) {
  return at ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap text-empire-gold border-empire-gold/40 bg-empire-gold/10" title={`${label} signed${by ? ` by ${by.name}` : ''} on ${dateLabel(at)}`}>
      <EmpireIcon name="check" size={10} />{label}{by ? ` · ${by.name.split(' ')[0]}` : ''}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border whitespace-nowrap text-empire-text-dim border-empire-border bg-transparent" title={`${label} signature pending`}>
      <EmpireIcon name="clock" size={10} />{label} pending
    </span>
  )
}

function Payroll() {
  const { data: runs, loading, reload } = useHr<PayrollRun[]>('payroll')
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState('')
  const rows = runs || []

  // KPIs: the next agreed payout (soonest non-terminal run), signatures still
  // outstanding across open runs, and the YTD executed volume.
  const open = rows.filter(r => !['executed', 'reconciled', 'cancelled'].includes(r.status))
  const next = [...open].sort((a, b) => +new Date(a.agreedDate) - +new Date(b.agreedDate))[0]
  const pendingSigs = open.filter(r => r.status === 'pending_authorization').reduce((s, r) => s + (r.hrApprovedAt ? 0 : 1) + (r.financeApprovedAt ? 0 : 1), 0)
  const year = String(new Date().getFullYear())
  const executedYtd = rows.filter(r => ['executed', 'reconciled'].includes(r.status) && (r.executedAt || '').startsWith(year))
  const ytdVolume = executedYtd.reduce((s, r) => s + r.totalAmount, 0)

  async function act(id: string, action: string, body?: object) {
    setErr('')
    try { await post(`/api/hr/payroll/${id}/${action}`, body || {}); reload() }
    catch (e) { setErr(e instanceof Error ? e.message : 'action failed') }
  }
  async function remove(id: string) {
    setErr('')
    try { await del(`/api/hr/payroll/${id}`); reload() }
    catch (e) { setErr(e instanceof Error ? e.message : 'delete failed') }
  }

  const cols: Column<PayrollRun>[] = [
    { key: 'period', label: 'Period', render: r => <div><div className="font-medium text-empire-text">{r.period}</div><div className="text-empire-text-dim text-[11px]">{r.headcount} employees</div></div> },
    { key: 'agreedDate', label: 'Agreed date', render: r => <span className="text-empire-text-muted text-xs" title="Payout date agreed with Finance — execution is blocked before it">{dateLabel(r.agreedDate)}</span> },
    { key: 'totalAmount', label: 'Total', align: 'right', render: r => <span className="font-data text-empire-text">{eur(r.totalAmount)}</span> },
    { key: 'hrApprovedAt', label: 'Authorization', render: r => (
      <span className="inline-flex flex-wrap gap-1">
        <SignaturePill label="HR" at={r.hrApprovedAt} by={r.hrApprovedBy} />
        <SignaturePill label="Finance" at={r.financeApprovedAt} by={r.financeApprovedBy} />
      </span>
    ) },
    { key: 'status', label: 'Status', render: r => <Pill text={r.status.replace(/_/g, ' ')} color={RUN_STATUS_COLOR[r.status] || '#7A7468'} /> },
    { key: 'id', label: '', align: 'right', render: r => <RunActions run={r} onAct={act} onDelete={remove} /> },
  ]

  return (
    <div className="space-y-6">
      <Grid cols={4}>
        <KpiCard icon="calendar" label="Next agreed payout" value={next ? dateLabel(next.agreedDate) : '—'} sub={next ? `${next.period} · ${eur(next.totalAmount)}` : 'no open run'} accent={ACCENT} />
        <KpiCard icon="shield" label="Pending signatures" value={String(pendingSigs)} sub="HR + Finance must both sign" accent={pendingSigs ? '#C9A233' : '#7A7468'} />
        <KpiCard icon="check" label="Runs executed YTD" value={String(executedYtd.length)} accent="#C9A233" />
        <KpiCard icon="coins" label="Paid out YTD" value={eur(ytdVolume)} accent="#C9A233" />
      </Grid>

      <Panel icon="book" title="How payroll processing works">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PAYROLL_STAGES.map(s => (
            <div key={s.title} className="rounded-lg border border-empire-border bg-empire-elevated/40 p-3">
              <div className="flex items-center gap-2 text-empire-gold">
                <EmpireIcon name={s.icon} size={14} />
                <span className="text-[11px] uppercase tracking-widest">{s.title}</span>
              </div>
              <p className="text-empire-text-muted text-xs mt-2 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </Panel>

      {err && (
        <div className="flex items-center gap-2 rounded border border-empire-gold/40 bg-empire-gold/10 px-3 py-2 text-xs text-empire-gold" role="alert">
          <EmpireIcon name="alert" size={13} />{err}
        </div>
      )}

      <Panel
        icon="coins"
        title={`Payroll runs (${rows.length})`}
        actions={<button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white" style={{ background: ACCENT }}><EmpireIcon name="plus" size={13} />New run</button>}
      >
        {loading ? <Loading /> : <DataTable columns={cols} rows={rows} empty="No payroll runs yet. Create the first run for this month — totals come straight from the roster." />}
      </Panel>

      <PayrollRunModal open={creating} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload() }} />
    </div>
  )
}

// Per-status actions mirroring the server's lifecycle gates. Sign buttons post
// the side being signed; the server still enforces WHO may sign (hr/finance
// units only — an admin override is recorded in the audit log).
function RunActions({ run, onAct, onDelete }: { run: PayrollRun; onAct: (id: string, action: string, body?: object) => void; onDelete: (id: string) => void }) {
  const btn = 'rounded border border-empire-border px-2 py-1 text-[11px] text-empire-text-muted hover:text-empire-gold hover:border-empire-gold/50 transition-colors whitespace-nowrap'
  const agreedPassed = new Date(run.agreedDate).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0)
  return (
    <span className="inline-flex flex-wrap justify-end gap-1">
      {run.status === 'preparation' && <>
        <button className={btn} onClick={() => onAct(run.id, 'submit')}>Submit for authorization</button>
        <button className={btn} onClick={() => onDelete(run.id)}>Delete draft</button>
      </>}
      {run.status === 'pending_authorization' && <>
        {!run.hrApprovedAt && <button className={btn} onClick={() => onAct(run.id, 'authorize', { side: 'hr' })}>Sign HR</button>}
        {!run.financeApprovedAt && <button className={btn} onClick={() => onAct(run.id, 'authorize', { side: 'finance' })}>Sign Finance</button>}
        <button className={btn} onClick={() => onAct(run.id, 'cancel')}>Cancel</button>
      </>}
      {run.status === 'authorized' && <>
        <button
          className={`${btn} ${agreedPassed ? '' : 'opacity-50 cursor-not-allowed'}`}
          title={agreedPassed ? 'Execute the payout' : `Blocked until the agreed date (${dateLabel(run.agreedDate)})`}
          onClick={() => agreedPassed && onAct(run.id, 'execute')}
        >Execute payout</button>
        <button className={btn} onClick={() => onAct(run.id, 'cancel')}>Cancel</button>
      </>}
      {run.status === 'executed' && <button className={btn} onClick={() => onAct(run.id, 'reconcile')}>Reconcile</button>}
      {(run.status === 'reconciled' || run.status === 'cancelled') && <span className="text-empire-text-dim text-[11px]">closed</span>}
    </span>
  )
}

function PayrollRunModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const defaultPeriod = new Date().toISOString().slice(0, 7)
  const [form, setForm] = useState({ period: defaultPeriod, agreedDate: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { if (open) { setForm({ period: defaultPeriod, agreedDate: '', notes: '' }); setErr('') } }, [open, defaultPeriod])
  async function save() {
    if (!form.period || !form.agreedDate) return
    setBusy(true); setErr('')
    try { await post('/api/hr/payroll', form); onSaved() }
    catch (e) { setErr(e instanceof Error ? e.message : 'failed to create run') }
    finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title="New payroll run" icon={<EmpireIcon name="coins" size={18} />}>
      <div className="space-y-3">
        <p className="text-empire-text-muted text-xs leading-relaxed">Totals and headcount are computed from the active roster (salary × FTE) — nothing is typed in. The run starts in <span className="text-empire-gold">preparation</span> and must be dual-authorized by HR and Finance before the payout can execute on the agreed date.</p>
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col gap-1 text-[11px] uppercase tracking-widest text-empire-text-dim">Period
            <input className={`${inputCls} w-36`} placeholder="2026-06" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] uppercase tracking-widest text-empire-text-dim">Agreed payout date (Finance)
            <DatePicker className={inputCls} value={form.agreedDate} onChange={e => setForm({ ...form, agreedDate: e.target.value })} />
          </label>
        </div>
        <textarea className={`${inputCls} w-full min-h-[64px]`} placeholder="Notes (e.g. includes June bonuses)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        {err && <p className="text-xs text-empire-gold" role="alert">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text disabled:opacity-50">Cancel</button>
          <button onClick={save} disabled={busy || !form.period || !form.agreedDate} className="rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? 'Creating…' : 'Create run'}</button>
        </div>
      </div>
    </Modal>
  )
}
