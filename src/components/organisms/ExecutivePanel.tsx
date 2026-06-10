'use client'

import { useState, useEffect, useCallback } from 'react'
import { KpiCard, Panel, AreaChart, BarChart, DonutChart, ProgressBar, DataTable, TabBar, Grid, EmptyState, type Column } from '@/lib/ui'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { Modal } from '@/components/molecules/Modal'
import { fetcher, post, patch, del, formatCurrency } from '@/lib/api'
import { useStickyTab } from '@/lib/use-sticky-tab'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'

// Executive — the crown dept. The C-suite cockpit. Runway, MRR & MRR growth, net
// burn, OKR attainment and KR hit-rate all derive from /api/executive/*.

const ACCENT = '#C9A233' // executive gold
const TABS = [
  { id: 'overview', label: 'Overview', icon: 'overview' as const },
  { id: 'okrs', label: 'OKRs', icon: 'flag' as const },
  { id: 'board', label: 'Board', icon: 'chart-line' as const },
  { id: 'objectives', label: 'Objectives', icon: 'crown' as const },
]

const OKR_STATUS: Record<string, string> = { on_track: '#C9A233', at_risk: '#C9A233', off_track: '#F4EFE3', done: '#C9A233' }
const CAT_COLOR: Record<string, string> = { growth: '#C9A233', product: '#C9A233', financial: '#C9A233', people: '#C9A233', operational: '#C9A233' }
const BCAT_COLOR: Record<string, string> = { revenue: '#C9A233', efficiency: '#C9A233', growth: '#C9A233', risk: '#F4EFE3' }
const TREND_ICON: Record<string, IconName | null> = { up: 'arrow-up', down: 'arrow-down', flat: null }

function Pill({ text, color }: { text: string; color: string }) {
  return <span style={{ color, background: color + '18', border: '1px solid ' + color + '40' }} className="px-2 py-0.5 rounded text-xs font-medium">{text}</span>
}

const inputCls = 'bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/60'

function useEx<T = any>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    setLoading(true)
    fetcher(`/api/executive/${path}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [path])
  useEffect(() => { reload() }, [reload])
  return { data, loading, reload }
}

function Loading() { return <div className="py-16 text-center text-empire-text-dim text-sm animate-pulse">Computing from the cockpit…</div> }

export function ExecutivePanel() {
  const [tab, setTab] = useStickyTab('executive', 'overview')
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-empire-border bg-empire-elevated/40 text-empire-gold/80">
          <EmpireIcon name={deptIcon('executive')} size={18} />
        </span>
        <div>
          <h3 className="font-empire text-empire-gold text-sm tracking-widest uppercase">The Cockpit</h3>
          <p className="text-empire-text-muted text-xs mt-0.5">Runway, MRR growth, OKR attainment & the board deck — derived from the live financial snapshots, company OKRs and board metrics.</p>
        </div>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} accent={ACCENT} />
      {tab === 'overview' && <Overview />}
      {tab === 'okrs' && <Okrs />}
      {tab === 'board' && <Board />}
      {tab === 'objectives' && <Objectives />}
    </div>
  )
}

/* ---------------- Overview ---------------- */
type Summary = {
  runwayMonths: number; mrr: number; mrrGrowthPct: number; netBurn: number; cash: number
  okrAttainment: number; atRiskCount: number; avgConfidence: number
  krHitRate: number; krHit: number; krTotal: number
  objectives: number; boardMetrics: number; onTarget: number
  cashTrend: number[]; mrrTrend: number[]; trendLabels: string[]
}
function Overview() {
  const { data: s, loading } = useEx<Summary>('summary')
  if (loading) return <Loading />
  if (!s) return <EmptyState icon="crown" title="No executive data" />
  return (
    <div className="space-y-6">
      <Grid cols={5}>
        <KpiCard icon="clock" label="Runway" info="How many months the company can operate at the current net burn before cash runs out." value={`${s.runwayMonths} mo`} sub={formatCurrency(s.cash) + ' cash'} accent={s.runwayMonths >= 12 ? '#C9A233' : s.runwayMonths >= 6 ? '#C9A233' : '#F4EFE3'} />
        <KpiCard icon="coins" label="MRR" info="Monthly recurring revenue — the predictable subscription/retainer income booked each month." value={formatCurrency(s.mrr)} sub={`${s.boardMetrics} board KPIs`} accent={ACCENT} />
        <KpiCard icon="chart-line" label="MRR Growth" info="Percentage change in MRR from the first to the most recent recorded period." value={`${s.mrrGrowthPct >= 0 ? '+' : ''}${s.mrrGrowthPct}%`} sub="first → last" accent={s.mrrGrowthPct >= 0 ? '#C9A233' : '#F4EFE3'} />
        <KpiCard icon="flame" label="Net Burn / mo" info="Cash spent minus cash earned per month. Lower is better; negative means profitable." value={formatCurrency(s.netBurn)} accent="#C9A233" />
        <KpiCard icon="flag" label="OKR Attainment" info="Average progress across all active objectives and key results this quarter." value={`${s.okrAttainment}%`} sub={`${s.atRiskCount} at risk · ${s.avgConfidence}% conf`} accent={s.okrAttainment >= 70 ? '#C9A233' : '#C9A233'} />
      </Grid>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel icon="coins" title="Cash trend">
          <AreaChart series={s.cashTrend} color="#F4EFE3" height={150} />
          <div className="flex justify-between mt-2 text-[11px] text-empire-text-dim">{s.trendLabels.map(l => <span key={l}>{l}</span>)}</div>
        </Panel>
        <Panel icon="chart-line" title="MRR trend">
          <AreaChart series={s.mrrTrend} color={ACCENT} height={150} />
          <div className="flex justify-between mt-2 text-[11px] text-empire-text-dim">{s.trendLabels.map(l => <span key={l}>{l}</span>)}</div>
        </Panel>
      </div>
      <Grid cols={3}>
        <KpiCard icon="check" label="KR Hit-Rate" info="Share of key results that reached their target." value={`${s.krHitRate}%`} sub={`${s.krHit}/${s.krTotal} hit`} accent={s.krHitRate >= 60 ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="crown" label="Objectives" value={String(s.objectives)} sub={`${s.atRiskCount} at risk`} accent={ACCENT} />
        <KpiCard icon="flag" label="Board On-Target" info="Board-level KPIs currently at or above their target value." value={`${s.onTarget}/${s.boardMetrics}`} accent={s.onTarget >= s.boardMetrics / 2 ? '#C9A233' : '#C9A233'} />
      </Grid>
    </div>
  )
}

/* ---------------- OKRs ---------------- */
type KR = { id: string; title: string; metric: string; current: number; target: number; unit: string | null; status: string; hit: boolean; attainment: number }
type Objective = {
  id: string; objective: string; owner: string | null; quarter: string; category: string
  progressPct: number; status: string; confidence: number; computedProgress: number
  krTotal: number; krHit: number; keyResults: KR[]
}
type OkrData = { list: Objective[]; byCategory: { category: string; objectives: number; avgProgress: number; atRisk: number }[] }
function Okrs() {
  const { data, loading } = useEx<OkrData>('okrs')
  if (loading) return <Loading />
  if (!data || data.list.length === 0) return <EmptyState icon="flag" title="No objectives" hint="Seed company OKRs to populate the cockpit." />
  return (
    <div className="space-y-4">
      <Panel icon="chart-bar" title="Attainment by category">
        <DonutChart segments={data.byCategory.map(c => ({ label: c.category, value: c.objectives, color: CAT_COLOR[c.category] || '#7A7468' }))} size={150} />
      </Panel>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.list.map(o => (
          <Panel key={o.id} title={
            <div className="flex items-center gap-2">
              <Pill text={o.category} color={CAT_COLOR[o.category] || '#7A7468'} />
              <span className="text-empire-text">{o.objective}</span>
            </div>
          } actions={<Pill text={o.status.replace('_', ' ')} color={OKR_STATUS[o.status] || '#7A7468'} />}>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-empire-text-dim">
                <span>{o.owner || '—'} · {o.quarter}</span>
                <span>{o.krHit}/{o.krTotal} KRs hit · {o.confidence}% confidence</span>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-empire-text-muted">Progress</span><span className="text-empire-text tabular-nums">{o.progressPct}%</span></div>
                <ProgressBar value={o.progressPct} max={100} color={OKR_STATUS[o.status] || ACCENT} />
              </div>
              <div className="space-y-2 pt-1">
                {o.keyResults.map(k => (
                  <div key={k.id} className="border border-empire-border/60 rounded px-2.5 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-empire-text-muted">{k.title}</span>
                      <span style={{ color: k.hit ? '#C9A233' : '#C9A233' }} className="tabular-nums">{k.current}{k.unit || ''} / {k.target}{k.unit || ''}</span>
                    </div>
                    <div className="mt-1.5"><ProgressBar value={k.attainment} max={100} color={k.hit ? '#C9A233' : OKR_STATUS[k.status] || '#C9A233'} /></div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Board ---------------- */
type BoardMetric = { id: string; name: string; category: string; value: number; unit: string | null; target: number | null; period: string; deltaPct: number; trend: string; onTarget: boolean | null }
function Board() {
  const { data, loading } = useEx<BoardMetric[]>('board')
  if (loading) return <Loading />
  const rows = data || []
  if (rows.length === 0) return <EmptyState icon="chart-line" title="No board metrics" />
  const onTarget = rows.filter(r => r.onTarget).length
  const fmtVal = (r: BoardMetric) => r.unit === '€' ? formatCurrency(r.value) : `${r.value}${r.unit ? (r.unit === '%' || r.unit === 'x' ? r.unit : ' ' + r.unit) : ''}`
  const cols: Column<BoardMetric>[] = [
    { key: 'name', label: 'Metric', render: r => <div><div className="font-medium text-empire-text">{r.name}</div><div className="text-empire-text-dim text-[11px]">{r.period}</div></div> },
    { key: 'category', label: 'Category', render: r => <Pill text={r.category} color={BCAT_COLOR[r.category] || '#7A7468'} /> },
    { key: 'value', label: 'Value', align: 'right', render: r => <span className="text-empire-text tabular-nums">{fmtVal(r)}</span> },
    { key: 'target', label: 'Target', align: 'right', render: r => <span className="text-empire-text-muted tabular-nums">{r.target != null ? (r.unit === '€' ? formatCurrency(r.target) : `${r.target}${r.unit && r.unit !== '€' ? (r.unit === '%' || r.unit === 'x' ? r.unit : ' ' + r.unit) : ''}`) : '—'}</span> },
    { key: 'deltaPct', label: 'Δ', align: 'right', render: r => <span style={{ color: r.trend === 'down' ? '#F4EFE3' : '#C9A233' }} className="inline-flex items-center justify-end gap-1 tabular-nums">{TREND_ICON[r.trend] && <EmpireIcon name={TREND_ICON[r.trend]!} size={12} />}{r.deltaPct > 0 ? '+' : ''}{r.deltaPct}%</span> },
    { key: 'onTarget', label: 'On Target', align: 'right', render: r => r.onTarget == null ? <span className="text-empire-text-dim">—</span> : <Pill text={r.onTarget ? 'on target' : 'off target'} color={r.onTarget ? '#C9A233' : '#F4EFE3'} /> },
  ]
  return (
    <div className="space-y-4">
      <Grid cols={3}>
        <KpiCard icon="chart-line" label="Board KPIs" value={String(rows.length)} accent={ACCENT} />
        <KpiCard icon="check" label="On Target" value={`${onTarget}/${rows.length}`} accent={onTarget >= rows.length / 2 ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="arrow-up" label="Improving" value={String(rows.filter(r => (r.trend === 'up' && r.category !== 'risk') || (r.trend === 'down' && r.category === 'risk')).length)} accent="#C9A233" />
      </Grid>
      <Panel icon="chart-bar" title="Board deck (value vs target)">
        <DataTable columns={cols} rows={rows} empty="No board metrics." />
      </Panel>
    </div>
  )
}

/* ---------------- Objectives (paginated CRUD) ---------------- */
type Page<T> = { data: T[]; page: number; pageSize: number; total: number; totalPages: number }
type ObjRow = { id: string; objective: string; owner: string | null; quarter: string; category: string; progressPct: number; status: string; confidence: number; keyResults: number }
function Objectives() {
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const { data, loading, reload } = useEx<Page<ObjRow>>(`objectives?pageSize=12&page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}${status ? `&status=${status}` : ''}`)
  const [form, setForm] = useState({ objective: '', owner: '', quarter: 'Q2 2026', category: 'growth', status: 'on_track' })
  const [busy, setBusy] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [viewing, setViewing] = useState<ObjRow | null>(null)
  const [editing, setEditing] = useState<ObjRow | null>(null)
  async function submit() {
    if (!form.objective) return
    setBusy(true)
    await post('/api/executive/objectives', form).catch(() => {})
    setBusy(false); setForm({ objective: '', owner: '', quarter: 'Q2 2026', category: 'growth', status: 'on_track' }); setShowNew(false); setPage(0); reload()
  }
  async function remove(id: string) { await del(`/api/executive/objectives/${id}`).catch(() => {}); reload() }
  if (loading) return <Loading />
  const rows = data?.data || []
  const cols: Column<ObjRow>[] = [
    { key: 'objective', label: 'Objective', render: o => <div><div className="font-medium text-empire-text">{o.objective}</div><div className="text-empire-text-dim text-[11px]">{o.owner || '—'} · {o.quarter} · {o.keyResults} KRs</div></div> },
    { key: 'category', label: 'Category', render: o => <Pill text={o.category} color={CAT_COLOR[o.category] || '#7A7468'} /> },
    { key: 'progressPct', label: 'Progress', render: o => <div className="w-28"><ProgressBar value={o.progressPct} max={100} color={OKR_STATUS[o.status] || ACCENT} /></div> },
    { key: 'confidence', label: 'Conf', align: 'right', render: o => <span className="text-empire-text-muted tabular-nums">{o.confidence}%</span> },
    { key: 'status', label: 'Status', render: o => <Pill text={o.status.replace('_', ' ')} color={OKR_STATUS[o.status] || '#7A7468'} /> },
    { key: 'id', label: '', align: 'right', render: o => (
      <RowActions
        onView={() => setViewing(o)}
        onEdit={() => setEditing(o)}
        onDelete={() => remove(o.id)}
        deleteLabel={`objective “${o.objective}”`}
      />
    ) },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input className={`${inputCls} w-56`} placeholder="Search objectives…" value={q} onChange={e => { setQ(e.target.value); setPage(0) }} />
        <select className={inputCls} value={status} onChange={e => { setStatus(e.target.value); setPage(0) }}>
          <option value="">All statuses</option><option value="on_track">on track</option><option value="at_risk">at risk</option><option value="off_track">off track</option><option value="done">done</option>
        </select>
        <button onClick={() => setShowNew(v => !v)} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white" style={{ background: ACCENT }}><EmpireIcon name={showNew ? 'close' : 'plus'} size={13} />{showNew ? 'Close' : 'Add'}</button>
      </div>
      {showNew && (
        <Panel icon="plus" title="New objective">
          <div className="flex flex-wrap gap-2 items-end">
            <input className={`${inputCls} w-64`} placeholder="Objective" value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} />
            <input className={`${inputCls} w-40`} placeholder="Owner" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} />
            <input className={`${inputCls} w-28`} placeholder="Quarter" value={form.quarter} onChange={e => setForm({ ...form, quarter: e.target.value })} />
            <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option value="growth">growth</option><option value="product">product</option><option value="financial">financial</option><option value="people">people</option><option value="operational">operational</option></select>
            <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="on_track">on track</option><option value="at_risk">at risk</option><option value="off_track">off track</option><option value="done">done</option></select>
            <button disabled={busy || !form.objective} onClick={submit} className="px-3 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Create'}</button>
          </div>
        </Panel>
      )}
      <Panel icon="crown" title={`Objectives (${data?.total ?? rows.length})`}>
        <DataTable columns={cols} rows={rows} empty="No objectives." />
        {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
      </Panel>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Objective" icon={<EmpireIcon name="crown" size={18} />}>
        {viewing && (
          <div className="space-y-3">
            <div className="font-empire text-empire-text text-lg">{viewing.objective}</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Owner">{viewing.owner || '—'}</Detail>
              <Detail label="Quarter">{viewing.quarter}</Detail>
              <Detail label="Category"><Pill text={viewing.category} color={CAT_COLOR[viewing.category] || '#7A7468'} /></Detail>
              <Detail label="Status"><Pill text={viewing.status.replace('_', ' ')} color={OKR_STATUS[viewing.status] || '#7A7468'} /></Detail>
              <Detail label="Progress">{viewing.progressPct}%</Detail>
              <Detail label="Confidence">{viewing.confidence}%</Detail>
              <Detail label="Key Results">{viewing.keyResults}</Detail>
            </div>
          </div>
        )}
      </Modal>

      {editing && (
        <ObjectiveEditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload() }}
        />
      )}
    </div>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-empire-text-dim mb-0.5">{label}</div>
      <div className="text-empire-text">{children}</div>
    </div>
  )
}

function ObjectiveEditModal({ row, onClose, onSaved }: { row: ObjRow; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    objective: row.objective, owner: row.owner ?? '', quarter: row.quarter, category: row.category,
    status: row.status, progressPct: String(row.progressPct), confidence: String(row.confidence),
  })
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!f.objective) return
    setBusy(true)
    await patch(`/api/executive/objectives/${row.id}`, {
      objective: f.objective, owner: f.owner, quarter: f.quarter, category: f.category,
      status: f.status, progressPct: Number(f.progressPct) || 0, confidence: Number(f.confidence) || 0,
    }).catch(() => {})
    setBusy(false); onSaved()
  }
  return (
    <Modal open onClose={onClose} title="Edit objective" icon={<EmpireIcon name="pen" size={18} />}>
      <div className="space-y-3">
        <input className={`${inputCls} w-full`} placeholder="Objective" value={f.objective} onChange={e => setF({ ...f, objective: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Owner" value={f.owner} onChange={e => setF({ ...f, owner: e.target.value })} />
          <input className={inputCls} placeholder="Quarter" value={f.quarter} onChange={e => setF({ ...f, quarter: e.target.value })} />
          <select className={inputCls} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}><option value="growth">growth</option><option value="product">product</option><option value="financial">financial</option><option value="people">people</option><option value="operational">operational</option></select>
          <select className={inputCls} value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="on_track">on track</option><option value="at_risk">at risk</option><option value="off_track">off track</option><option value="done">done</option></select>
          <input className={inputCls} type="number" placeholder="Progress %" value={f.progressPct} onChange={e => setF({ ...f, progressPct: e.target.value })} />
          <input className={inputCls} type="number" placeholder="Confidence %" value={f.confidence} onChange={e => setF({ ...f, confidence: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy || !f.objective} className="px-4 py-2 rounded text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </Modal>
  )
}
