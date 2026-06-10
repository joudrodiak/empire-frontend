'use client'

import { useState, useEffect, useCallback } from 'react'
import { KpiCard, Panel, AreaChart, BarChart, DonutChart, ProgressBar, DataTable, TabBar, Grid, EmptyState, type Column } from '@/lib/ui'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { Modal } from '@/components/molecules/Modal'
import { fetcher, post, patch, del } from '@/lib/api'
import { useStickyTab } from '@/lib/use-sticky-tab'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'

// Creative — the studio operating system. Throughput, turnaround, on-time rate,
// approval rate, pipeline by stage, briefs by type and backlog all derive from
// /api/creative/*. Nothing is hard-coded.

type Page<T> = { data: T[]; page: number; pageSize: number; total: number; totalPages: number }

const ACCENT = '#C9A233'
const TABS = [
  { id: 'overview', label: 'Overview', icon: 'overview' as const },
  { id: 'pipeline', label: 'Pipeline', icon: 'sparkle' as const },
  { id: 'reviews', label: 'Reviews', icon: 'check' as const },
  { id: 'briefs', label: 'Briefs', icon: 'pen-nib' as const },
]

const TYPE_COLOR: Record<string, string> = { campaign: '#C9A233', brand: '#C9A233', product: '#C9A233', social: '#C9A233', web: '#C9A233', video: '#F4EFE3' }
const STAGE_COLOR: Record<string, string> = { concept: '#7A7468', draft: '#C9A233', review: '#C9A233', revision: '#C9A233', final: '#C9A233' }
const PRIORITY_COLOR: Record<string, string> = { urgent: '#F4EFE3', high: '#C9A233', normal: '#C9A233', low: '#7A7468' }
const BSTATUS_COLOR: Record<string, string> = { intake: '#7A7468', in_progress: '#C9A233', in_review: '#C9A233', approved: '#C9A233', delivered: '#C9A233', archived: '#7A7468' }
const DECISION_COLOR: Record<string, string> = { approved: '#C9A233', changes_requested: '#C9A233', rejected: '#F4EFE3', pending: '#7A7468' }

function Pill({ text, color }: { text: string; color: string }) {
  return <span style={{ color, background: color + '18', border: '1px solid ' + color + '40' }} className="px-2 py-0.5 rounded text-xs font-medium">{text}</span>
}

const inputCls = 'bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/60'

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-empire-border/40 py-2 last:border-0">
      <span className="text-[10px] uppercase tracking-wider text-empire-text-dim pt-0.5">{label}</span>
      <span className="text-sm text-empire-text text-right">{children ?? '—'}</span>
    </div>
  )
}

function useCr<T = any>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    setLoading(true)
    fetcher(`/api/creative/${path}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [path])
  useEffect(() => { reload() }, [reload])
  return { data, loading, reload }
}

function Loading() { return <div className="py-16 text-center text-empire-text-dim text-sm animate-pulse">Computing from the studio floor…</div> }

export function CreativePanel() {
  const [tab, setTab] = useStickyTab('creative', 'overview')
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-empire-border bg-empire-elevated/40 text-empire-gold/80">
          <EmpireIcon name={deptIcon('creative')} size={18} />
        </span>
        <div>
          <h3 className="font-empire text-empire-gold text-sm tracking-widest uppercase">The Studio</h3>
          <p className="text-empire-text-muted text-xs mt-0.5">Brief intake, production pipeline, approval workflow & throughput — derived from the live brief book, asset pipeline and review board.</p>
        </div>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} accent={ACCENT} />
      {tab === 'overview' && <Overview />}
      {tab === 'pipeline' && <Pipeline />}
      {tab === 'reviews' && <Reviews />}
      {tab === 'briefs' && <Briefs />}
    </div>
  )
}

/* ---------------- Overview ---------------- */
type Summary = {
  briefs: number; delivered: number; throughput: number; avgTurnaround: number; onTimeRate: number
  approvalRate: number; assets: number; revisionLoad: number; backlog: number; urgentOpen: number
  reviewRounds: number; decidedRounds: number; approvedRounds: number
  trend: number[]; trendLabels: string[]; trendProduced: number[]
}
function Overview() {
  const { data: s, loading } = useCr<Summary>('summary')
  if (loading) return <Loading />
  if (!s) return <EmptyState icon="creative" title="No creative data" />
  return (
    <div className="space-y-6">
      <Grid cols={6}>
        <KpiCard icon="gauge" label="Throughput" value={`${s.throughput}%`} sub={`${s.delivered}/${s.briefs} delivered`} accent={ACCENT} />
        <KpiCard icon="clock" label="Avg Turnaround" value={`${s.avgTurnaround}d`} sub="delivered briefs" accent="#C9A233" />
        <KpiCard icon="flag" label="On-Time Rate" value={`${s.onTimeRate}%`} accent={s.onTimeRate >= 75 ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="check" label="Approval Rate" value={`${s.approvalRate}%`} sub={`${s.approvedRounds}/${s.decidedRounds} rounds`} accent={s.approvalRate >= 60 ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="alert" label="Backlog" value={String(s.backlog)} sub={`${s.urgentOpen} urgent`} accent={s.urgentOpen > 0 ? '#F4EFE3' : '#C9A233'} />
        <KpiCard icon="flame" label="Revision Load" value={`${s.revisionLoad}×`} sub={`${s.assets} assets`} accent="#C9A233" />
      </Grid>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel icon="chart-line" title="Production trend (briefs delivered / month)">
          <AreaChart series={s.trend} color={ACCENT} height={140} />
          <div className="flex justify-between mt-2 text-[11px] text-empire-text-dim">{s.trendLabels.map(l => <span key={l}>{l}</span>)}</div>
        </Panel>
        <Panel icon="chart-bar" title="Assets produced / month">
          <BarChart data={s.trendProduced} labels={s.trendLabels} color="#C9A233" height={140} />
        </Panel>
        <Panel icon="check" title="Review board">
          <div className="text-[11px] uppercase tracking-widest text-empire-text-dim">Rounds</div>
          <div className="font-empire text-5xl leading-none mt-1 tabular-nums" style={{ color: ACCENT }}>{s.reviewRounds}</div>
          <div className="text-empire-text-muted text-xs mt-2">{s.decidedRounds} decided · {s.approvedRounds} approved · {s.approvalRate}% approval</div>
        </Panel>
      </div>
    </div>
  )
}

/* ---------------- Pipeline ---------------- */
// Manual entry into the asset pipeline — the same data the MCP log_studio_asset
// tool writes. Optionally links the asset to a ticket by key (e.g. STU-3).
function AddAssetForm({ onAdded }: { onAdded: () => void }) {
  const { data: briefs } = useCr<Page<{ id: string; title: string }>>('briefs?pageSize=100')
  const [form, setForm] = useState({ briefId: '', name: '', kind: 'image', stage: 'concept', reviewer: '', ticketKey: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit() {
    if (!form.briefId || !form.name.trim()) return
    setBusy(true); setError('')
    try {
      await post('/api/creative/assets', { ...form, name: form.name.trim(), reviewer: form.reviewer || null, ticketKey: form.ticketKey.trim() || null })
      setForm({ ...form, name: '', ticketKey: '' })
      onAdded()
    } catch {
      setError(form.ticketKey ? `Could not add the asset — check that ticket "${form.ticketKey.trim().toUpperCase()}" exists.` : 'Could not add the asset — try again.')
    }
    setBusy(false)
  }
  const briefRows = briefs?.data || []
  return (
    <Panel icon="plus" title="Add asset">
      <div className="flex flex-wrap gap-2 items-end">
        <select className={inputCls} value={form.briefId} onChange={e => setForm({ ...form, briefId: e.target.value })}>
          <option value="">Brief…</option>
          {briefRows.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>
        <input className={`${inputCls} w-48`} placeholder="Asset name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <select className={inputCls} value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>
          {['image', 'video', 'copy', 'design', 'motion', 'audio'].map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <select className={inputCls} value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>
          {['concept', 'draft', 'review', 'revision', 'final'].map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <input className={`${inputCls} w-36`} placeholder="Reviewer" value={form.reviewer} onChange={e => setForm({ ...form, reviewer: e.target.value })} />
        <input className={`${inputCls} w-32`} placeholder="Ticket (STU-3)" value={form.ticketKey} onChange={e => setForm({ ...form, ticketKey: e.target.value })} />
        <button
          disabled={busy || !form.briefId || !form.name.trim()}
          onClick={submit}
          title={!form.briefId ? 'Pick a brief first' : !form.name.trim() ? 'Name the asset' : undefined}
          className="px-3 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40"
          style={{ background: ACCENT }}
        >{busy ? 'Adding…' : 'Add asset'}</button>
      </div>
      {briefRows.length === 0 && <p className="mt-2 text-xs text-empire-text-muted">No briefs yet — create one in the Briefs tab before adding assets.</p>}
      {error && <p className="mt-2 text-xs text-empire-text" role="alert">{error}</p>}
    </Panel>
  )
}

type Pipe = {
  byStage: { stage: string; count: number; avgVersions: number }[]
  byKind: { kind: string; count: number }[]
  byType: { type: string; count: number }[]
}
function Pipeline() {
  const { data, loading, reload } = useCr<Pipe>('pipeline')
  if (loading) return <Loading />
  if (!data) return <EmptyState icon="sparkle" title="No pipeline data" />
  return (
    <div className="space-y-4">
      <AddAssetForm onAdded={reload} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel icon="chart-bar" title="Assets by stage">
          <BarChart data={data.byStage.map(s => s.count)} labels={data.byStage.map(s => s.stage)} color={ACCENT} height={150} />
        </Panel>
        <Panel icon="pen-nib" title="Briefs by type">
          {data.byType.length ? (
            <DonutChart size={170} segments={data.byType.map(t => ({ label: t.type, value: t.count, color: TYPE_COLOR[t.type] || '#7A7468' }))} />
          ) : <EmptyState icon="document" title="No briefs" />}
        </Panel>
      </div>
      <Panel icon="overview" title="Stage detail">
        <div className="flex flex-wrap gap-3">
          {data.byStage.map(s => (
            <div key={s.stage} className="border border-empire-border rounded px-3 py-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: STAGE_COLOR[s.stage] || '#7A7468' }} />
              <span className="text-empire-text-muted text-xs capitalize">{s.stage}</span>
              <span className="text-empire-text font-empire">{s.count}</span>
              <span className="text-empire-text-dim text-[11px]">avg {s.avgVersions}×</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel icon="sparkle" title="Assets by kind">
        <div className="space-y-2 pt-1">
          {data.byKind.map(k => (
            <div key={k.kind} className="flex items-center justify-between text-sm">
              <span className="text-empire-text-muted capitalize">{k.kind}</span>
              <div className="flex items-center gap-3 w-1/2">
                <div className="flex-1"><ProgressBar value={k.count} max={Math.max(...data.byKind.map(x => x.count), 1)} color={ACCENT} /></div>
                <span className="text-empire-text tabular-nums w-6 text-right">{k.count}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

/* ---------------- Reviews ---------------- */
type Round = { id: string; assetName: string; round: number; decision: string; reviewer: string | null; ticketKey: string | null; notes: string | null; decidedAt: string | null }
type Reviews = {
  total: number; decided: number; approved: number; changes: number; rejected: number
  approvalRate: number; changeRate: number
  breakdown: { decision: string; count: number }[]; recent: Round[]
}
function Reviews() {
  const { data, loading, reload } = useCr<Reviews>('reviews')
  if (loading) return <Loading />
  if (!data) return <EmptyState icon="check" title="No reviews" />
  const cols: Column<Round>[] = [
    { key: 'assetName', label: 'Asset', render: r => <div><div className="font-medium text-empire-text">{r.assetName}</div><div className="text-empire-text-dim text-[11px]">round {r.round} · {r.reviewer || '—'}</div></div> },
    { key: 'decision', label: 'Decision', render: r => <Pill text={r.decision.replace(/_/g, ' ')} color={DECISION_COLOR[r.decision] || '#7A7468'} /> },
    { key: 'ticketKey', label: 'Ticket', render: r => r.ticketKey ? <span className="font-mono text-xs text-empire-gold">{r.ticketKey}</span> : <span className="text-empire-text-dim">—</span> },
    { key: 'notes', label: 'Notes', render: r => <span className="text-empire-text-muted">{r.notes || '—'}</span> },
    { key: 'decidedAt', label: 'Decided', align: 'right', render: r => <span className="text-empire-text-dim text-xs">{r.decidedAt ? new Date(r.decidedAt).toLocaleDateString() : 'pending'}</span> },
  ]
  return (
    <div className="space-y-4">
      <Grid cols={4}>
        <KpiCard icon="check" label="Approval Rate" value={`${data.approvalRate}%`} sub={`${data.approved}/${data.decided} decided`} accent={data.approvalRate >= 60 ? '#C9A233' : '#C9A233'} />
        <KpiCard icon="pen-nib" label="Change Requests" value={String(data.changes)} sub={`${data.changeRate}% of decided`} accent="#C9A233" />
        <KpiCard icon="close" label="Rejected" value={String(data.rejected)} accent="#F4EFE3" />
        <KpiCard icon="chart-bar" label="Total Rounds" value={String(data.total)} accent={ACCENT} />
      </Grid>
      <Panel icon="overview" title="Decision breakdown">
        <div className="flex flex-wrap gap-3">
          {data.breakdown.map(d => (
            <div key={d.decision} className="border border-empire-border rounded px-3 py-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: DECISION_COLOR[d.decision] || '#7A7468' }} />
              <span className="text-empire-text-muted text-xs capitalize">{d.decision.replace(/_/g, ' ')}</span>
              <span className="text-empire-text font-empire">{d.count}</span>
            </div>
          ))}
        </div>
      </Panel>
      <LogReviewForm onAdded={reload} />
      <Panel icon="clock" title={`Recent review rounds (${data.recent.length})`}>
        <DataTable columns={cols} rows={data.recent} empty="No review rounds." />
      </Panel>
    </div>
  )
}

// Manual review-round entry — same data the MCP log_studio_review tool writes.
function LogReviewForm({ onAdded }: { onAdded: () => void }) {
  const [form, setForm] = useState({ assetName: '', round: '1', decision: 'pending', reviewer: '', ticketKey: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit() {
    if (!form.assetName.trim()) return
    setBusy(true); setError('')
    try {
      await post('/api/creative/reviews', { ...form, assetName: form.assetName.trim(), round: Number(form.round) || 1, reviewer: form.reviewer || null, ticketKey: form.ticketKey.trim() || null, notes: form.notes || null })
      setForm({ ...form, assetName: '', notes: '', ticketKey: '' })
      onAdded()
    } catch {
      setError(form.ticketKey ? `Could not log the round — check that ticket "${form.ticketKey.trim().toUpperCase()}" exists.` : 'Could not log the review round — try again.')
    }
    setBusy(false)
  }
  return (
    <Panel icon="plus" title="Log a review round">
      <div className="flex flex-wrap gap-2 items-end">
        <input className={`${inputCls} w-48`} placeholder="Asset name" value={form.assetName} onChange={e => setForm({ ...form, assetName: e.target.value })} />
        <input className={`${inputCls} w-20`} type="number" min={1} placeholder="Round" value={form.round} onChange={e => setForm({ ...form, round: e.target.value })} />
        <select className={inputCls} value={form.decision} onChange={e => setForm({ ...form, decision: e.target.value })}>
          {['pending', 'approved', 'changes_requested', 'rejected'].map(d => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
        </select>
        <input className={`${inputCls} w-36`} placeholder="Reviewer" value={form.reviewer} onChange={e => setForm({ ...form, reviewer: e.target.value })} />
        <input className={`${inputCls} w-32`} placeholder="Ticket (STU-3)" value={form.ticketKey} onChange={e => setForm({ ...form, ticketKey: e.target.value })} />
        <input className={`${inputCls} w-56`} placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        <button
          disabled={busy || !form.assetName.trim()}
          onClick={submit}
          title={!form.assetName.trim() ? 'Name the asset first' : undefined}
          className="px-3 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40"
          style={{ background: ACCENT }}
        >{busy ? 'Logging…' : 'Log round'}</button>
      </div>
      {error && <p className="mt-2 text-xs text-empire-text" role="alert">{error}</p>}
    </Panel>
  )
}

/* ---------------- Briefs (paginated CRUD) ---------------- */
type Brief = {
  id: string; title: string; requestingDept: string; type: string; priority: string; status: string
  ownerName: string | null; dueDate: string | null; deliveredAt: string | null
  daysToDue: number | null; turnaroundDays: number | null; onTime: boolean | null
}
function Briefs() {
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const { data, loading, reload } = useCr<Page<Brief>>(`briefs?pageSize=12&page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}${status ? `&status=${status}` : ''}${type ? `&type=${type}` : ''}`)
  const [form, setForm] = useState({ title: '', type: 'campaign', priority: 'normal', status: 'intake', dueDate: '' })
  const [busy, setBusy] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [viewing, setViewing] = useState<Brief | null>(null)
  const [editing, setEditing] = useState<Brief | null>(null)

  async function submit() {
    if (!form.title) return
    setBusy(true)
    await post('/api/creative/briefs', form).catch(console.error)
    setBusy(false); setForm({ title: '', type: 'campaign', priority: 'normal', status: 'intake', dueDate: '' }); setShowNew(false); setPage(0); reload()
  }
  async function remove(id: string) { await del(`/api/creative/briefs/${id}`).catch(console.error); reload() }
  async function advance(b: Brief) {
    const flow = ['intake', 'in_progress', 'in_review', 'approved', 'delivered']
    const i = flow.indexOf(b.status)
    if (i < 0 || i >= flow.length - 1) return
    const next = flow[i + 1]
    await patch(`/api/creative/briefs/${b.id}`, { status: next, ...(next === 'delivered' ? { deliveredAt: new Date().toISOString() } : {}) }).catch(console.error)
    reload()
  }

  if (loading) return <Loading />
  const rows = data?.data || []
  const cols: Column<Brief>[] = [
    { key: 'title', label: 'Brief', render: b => <div><div className="font-medium text-empire-text">{b.title}</div><div className="text-empire-text-dim text-[11px]">{b.requestingDept} · {b.ownerName || '—'}</div></div> },
    { key: 'type', label: 'Type', render: b => <Pill text={b.type} color={TYPE_COLOR[b.type] || '#7A7468'} /> },
    { key: 'priority', label: 'Priority', render: b => <Pill text={b.priority} color={PRIORITY_COLOR[b.priority] || '#7A7468'} /> },
    { key: 'status', label: 'Status', render: b => <Pill text={b.status.replace(/_/g, ' ')} color={BSTATUS_COLOR[b.status] || '#7A7468'} /> },
    { key: 'daysToDue', label: 'Due', align: 'right', render: b => b.deliveredAt ? <span style={{ color: b.onTime ? '#C9A233' : '#F4EFE3' }}>{b.onTime ? 'on time' : 'late'}</span> : <span style={{ color: (b.daysToDue ?? 999) < 0 ? '#F4EFE3' : (b.daysToDue ?? 999) < 7 ? '#C9A233' : '#7A7468' }}>{b.daysToDue != null ? `${b.daysToDue}d` : '—'}</span> },
    { key: 'id', label: '', align: 'right', render: b => (
      <div className="flex items-center gap-2 justify-end">
        {b.status !== 'delivered' && b.status !== 'archived' && <button onClick={() => advance(b)} className="inline-flex items-center gap-1 text-empire-text-dim hover:text-empire-gold text-xs transition-colors"><EmpireIcon name="chevron-right" size={12} />advance</button>}
        <RowActions
          onView={() => setViewing(b)}
          onEdit={() => setEditing(b)}
          onDelete={() => remove(b.id)}
          deleteLabel={`brief “${b.title}”`}
        />
      </div>
    ) },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <input className={`${inputCls} w-56`} placeholder="Search briefs…" value={q} onChange={e => { setQ(e.target.value); setPage(0) }} />
        <select className={inputCls} value={status} onChange={e => { setStatus(e.target.value); setPage(0) }}>
          <option value="">All statuses</option><option value="intake">intake</option><option value="in_progress">in progress</option><option value="in_review">in review</option><option value="approved">approved</option><option value="delivered">delivered</option><option value="archived">archived</option>
        </select>
        <select className={inputCls} value={type} onChange={e => { setType(e.target.value); setPage(0) }}>
          <option value="">All types</option><option value="campaign">campaign</option><option value="brand">brand</option><option value="product">product</option><option value="social">social</option><option value="web">web</option><option value="video">video</option>
        </select>
        <button onClick={() => setShowNew(v => !v)} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white" style={{ background: ACCENT }}><EmpireIcon name={showNew ? 'close' : 'plus'} size={13} />{showNew ? 'Close' : 'New Brief'}</button>
      </div>
      {showNew && (
        <Panel icon="plus" title="New brief">
          <div className="flex flex-wrap gap-2 items-end">
            <input className={`${inputCls} w-56`} placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="campaign">campaign</option><option value="brand">brand</option><option value="product">product</option><option value="social">social</option><option value="web">web</option><option value="video">video</option></select>
            <select className={inputCls} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">low</option><option value="normal">normal</option><option value="high">high</option><option value="urgent">urgent</option></select>
            <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="intake">intake</option><option value="in_progress">in progress</option><option value="in_review">in review</option><option value="approved">approved</option><option value="delivered">delivered</option></select>
            <input type="date" className={inputCls} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            <button disabled={busy || !form.title} onClick={submit} className="px-3 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Create'}</button>
          </div>
        </Panel>
      )}
      <Panel icon="pen-nib" title={`Briefs (${data?.total ?? rows.length})`}>
        <DataTable columns={cols} rows={rows} empty="No briefs." />
        {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
      </Panel>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Brief" icon={<EmpireIcon name="pen-nib" size={18} />}>
        {viewing && (
          <div className="space-y-3">
            <div className="font-empire text-empire-text text-lg">{viewing.title}</div>
            <DetailRow label="Requesting unit">{viewing.requestingDept}</DetailRow>
            <DetailRow label="Owner">{viewing.ownerName || '—'}</DetailRow>
            <DetailRow label="Type"><Pill text={viewing.type} color={TYPE_COLOR[viewing.type] || '#7A7468'} /></DetailRow>
            <DetailRow label="Priority"><Pill text={viewing.priority} color={PRIORITY_COLOR[viewing.priority] || '#7A7468'} /></DetailRow>
            <DetailRow label="Status"><Pill text={viewing.status.replace(/_/g, ' ')} color={BSTATUS_COLOR[viewing.status] || '#7A7468'} /></DetailRow>
            <DetailRow label="Due">{viewing.dueDate ? new Date(viewing.dueDate).toLocaleDateString() : '—'}</DetailRow>
            <DetailRow label="Delivered">{viewing.deliveredAt ? new Date(viewing.deliveredAt).toLocaleDateString() : '—'}</DetailRow>
            {viewing.turnaroundDays != null && <DetailRow label="Turnaround">{viewing.turnaroundDays}d{viewing.onTime != null ? (viewing.onTime ? ' · on time' : ' · late') : ''}</DetailRow>}
          </div>
        )}
      </Modal>

      {editing && (
        <BriefEditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload() }}
        />
      )}
    </div>
  )
}

function BriefEditModal({ row, onClose, onSaved }: { row: Brief; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: row.title, type: row.type, priority: row.priority, status: row.status,
    dueDate: row.dueDate ? row.dueDate.slice(0, 10) : '',
  })
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!f.title) return
    setBusy(true)
    await patch(`/api/creative/briefs/${row.id}`, {
      title: f.title, type: f.type, priority: f.priority, status: f.status,
      dueDate: f.dueDate || null,
      ...(f.status === 'delivered' && !row.deliveredAt ? { deliveredAt: new Date().toISOString() } : {}),
    }).catch(console.error)
    setBusy(false); onSaved()
  }
  return (
    <Modal open onClose={onClose} title="Edit brief" icon={<EmpireIcon name="pen" size={18} />}>
      <div className="space-y-3">
        <input className={`${inputCls} w-full`} placeholder="Title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <select className={inputCls} value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="campaign">campaign</option><option value="brand">brand</option><option value="product">product</option><option value="social">social</option><option value="web">web</option><option value="video">video</option></select>
          <select className={inputCls} value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}><option value="low">low</option><option value="normal">normal</option><option value="high">high</option><option value="urgent">urgent</option></select>
          <select className={inputCls} value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="intake">intake</option><option value="in_progress">in progress</option><option value="in_review">in review</option><option value="approved">approved</option><option value="delivered">delivered</option><option value="archived">archived</option></select>
          <input className={inputCls} type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy || !f.title} className="px-4 py-2 rounded text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </Modal>
  )
}
