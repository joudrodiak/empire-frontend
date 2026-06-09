'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetcher, post, patch, del } from '@/lib/api'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { Modal } from '@/components/molecules/Modal'
import { EmptyState } from '@/components/atoms/EmptyState'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'
import { AreaChart } from '@/components/organisms/charts/AreaChart'
import { format } from 'date-fns'

// A Jira-shaped issue. Mirrors the API `Ticket` model (routes/tickets.ts).
export type Ticket = {
  id: string
  key: string
  title: string
  description: string | null
  type: 'epic' | 'story' | 'task' | 'bug'
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'normal' | 'high' | 'critical'
  storyPoints: number | null
  order: number
  labels: string[]
  sprintId: string | null
  assigneeId: string | null
  reporterId: string | null
  epicId: string | null
  dueDate: string | null
  createdAt: string
  department: { name: string; slug: string; color: string } | null
  assignee: { id: string; name: string; role: string; avatarUrl?: string | null } | null
  reporter: { id: string; name: string; role: string } | null
  sprint: { id: string; name: string } | null
}

export type Sprint = {
  id: string
  name: string
  goal: string | null
  status: string
  startDate: string
  endDate: string
  committedPoints: number | null
  completedPoints: number | null
  ticketCount: number
  velocityPct: number
}

type Column = { status: Ticket['status']; label: string; tickets: Ticket[]; count: number; points: number }
type Person = { id: string; name: string; role: string }

// Delivery-health rollup — mirrors GET /api/tickets/metrics.
export type Metrics = {
  total: number; doneCount: number; wip: number; overdue: number; doneRatio: number
  byStatus: Record<string, number>; byType: Record<string, number>; byPriority: Record<string, number>
  throughput: { last7: number; last14: number; last30: number }; medianCycleHours: number | null
  sprintsTracked: number; avgVelocity: number; avgThroughputPts: number
  perSprint: { id: string; name: string; status: string; startDate: string; endDate: string; committedPoints: number; completedPoints: number; velocityPct: number; ticketCount: number; doneCount: number }[]
  contributors: { id: string; name: string; avatarUrl: string | null; done: number; active: number; points: number }[]
  healthScore: number | null; healthBand: 'none' | 'low' | 'medium' | 'high' | 'elite'
}

const HEALTH_COLOR: Record<Metrics['healthBand'], string> = {
  none: '#6b6b6b', low: '#F4EFE3', medium: '#C9A233', high: '#C9A233', elite: '#C9A233',
}
const HEALTH_LABEL: Record<Metrics['healthBand'], string> = {
  none: 'No data', low: 'At risk', medium: 'Fair', high: 'Healthy', elite: 'Elite',
}

const STATUS_ORDER: Ticket['status'][] = ['backlog', 'todo', 'in_progress', 'review', 'done']
const STATUS_LABEL: Record<Ticket['status'], string> = {
  backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', review: 'In Review', done: 'Done',
}
const TYPES: Ticket['type'][] = ['epic', 'story', 'task', 'bug']
const PRIORITIES: Ticket['priority'][] = ['low', 'normal', 'high', 'critical']

const TYPE_ICON: Record<Ticket['type'], IconName> = { epic: 'sparkle', story: 'book', task: 'check', bug: 'alert' }
const TYPE_COLOR: Record<Ticket['type'], string> = {
  epic: 'text-empire-gold', story: 'text-empire-green-bright', task: 'text-empire-text-muted', bug: 'text-empire-red-bright',
}
const PRIORITY_STYLE: Record<Ticket['priority'], string> = {
  low: 'text-empire-text-dim border-empire-border',
  normal: 'text-empire-text-muted border-empire-border',
  high: 'text-empire-amber-bright border-empire-amber/40',
  critical: 'text-empire-red-bright border-empire-red/40',
}

const PAGE_SIZE = 10

export function TicketsPanel({ departmentSlug, accent = '#c9a233' }: {
  departmentSlug: string; accent?: string
}) {
  const [view, setView] = useState<'board' | 'list' | 'dashboard'>('board')
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [sprintFilter, setSprintFilter] = useState<string>('') // '' = all, 'none' = no sprint, or sprint id
  const [people, setPeople] = useState<Person[]>([])

  const [columns, setColumns] = useState<Column[]>([])
  const [boardTotal, setBoardTotal] = useState(0)
  const [loadingBoard, setLoadingBoard] = useState(true)

  const [rows, setRows] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(0)
  const [fStatus, setFStatus] = useState<'all' | Ticket['status']>('all')
  const [fType, setFType] = useState<'all' | Ticket['type']>('all')
  const [fPriority, setFPriority] = useState<'all' | Ticket['priority']>('all')
  const [q, setQ] = useState('')
  const [loadingList, setLoadingList] = useState(true)

  const [viewing, setViewing] = useState<Ticket | null>(null)
  const [editing, setEditing] = useState<Ticket | null>(null)
  const [creating, setCreating] = useState(false)
  const [showSprints, setShowSprints] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<Ticket['status'] | null>(null)

  const loadSprints = useCallback(async () => {
    try {
      const res = await fetcher(`/api/tickets/sprints?departmentSlug=${departmentSlug}`)
      setSprints(Array.isArray(res) ? res : res.data ?? [])
    } catch (e) { console.error(e) }
  }, [departmentSlug])

  const loadBoard = useCallback(async () => {
    setLoadingBoard(true)
    try {
      const params = new URLSearchParams({ departmentSlug })
      if (sprintFilter && sprintFilter !== 'none') params.set('sprintId', sprintFilter)
      const res = await fetcher(`/api/tickets/board?${params.toString()}`)
      let cols: Column[] = res.columns ?? []
      // "No sprint" view: keep only unassigned tickets, recompute counts client-side.
      if (sprintFilter === 'none') {
        cols = cols.map(c => {
          const tickets = c.tickets.filter(t => !t.sprintId)
          return { ...c, tickets, count: tickets.length, points: tickets.reduce((s, t) => s + (t.storyPoints ?? 0), 0) }
        })
      }
      setColumns(cols)
      setBoardTotal(cols.reduce((s, c) => s + c.count, 0))
    } catch (e) { console.error(e) }
    finally { setLoadingBoard(false) }
  }, [departmentSlug, sprintFilter])

  const loadList = useCallback(async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams({
        departmentSlug, page: String(page + 1), pageSize: String(PAGE_SIZE),
      })
      if (sprintFilter && sprintFilter !== 'none') params.set('sprintId', sprintFilter)
      if (fStatus !== 'all') params.set('status', fStatus)
      if (fType !== 'all') params.set('type', fType)
      if (fPriority !== 'all') params.set('priority', fPriority)
      if (q.trim()) params.set('q', q.trim())
      const res = await fetcher(`/api/tickets?${params.toString()}`)
      setRows(res.data ?? [])
      setTotal(res.total ?? 0)
      setTotalPages(res.totalPages ?? 1)
    } catch (e) { console.error(e) }
    finally { setLoadingList(false) }
  }, [departmentSlug, sprintFilter, page, fStatus, fType, fPriority, q])

  const loadMetrics = useCallback(async () => {
    setLoadingMetrics(true)
    try {
      const params = new URLSearchParams({ departmentSlug })
      if (sprintFilter && sprintFilter !== 'none') params.set('sprintId', sprintFilter)
      const res = await fetcher(`/api/tickets/metrics?${params.toString()}`)
      setMetrics(res)
    } catch (e) { console.error(e) }
    finally { setLoadingMetrics(false) }
  }, [departmentSlug, sprintFilter])

  useEffect(() => { loadSprints() }, [loadSprints])
  useEffect(() => {
    fetcher(`/api/employees?department=${departmentSlug}`)
      .then((r: any) => setPeople((Array.isArray(r) ? r : r.data ?? []).map((p: any) => ({ id: p.id, name: p.name, role: p.role }))))
      .catch(() => setPeople([]))
  }, [departmentSlug])
  useEffect(() => { if (view === 'board') loadBoard() }, [view, loadBoard])
  useEffect(() => { if (view === 'list') loadList() }, [view, loadList])
  useEffect(() => { if (view === 'dashboard') loadMetrics() }, [view, loadMetrics])
  useEffect(() => { setPage(0) }, [fStatus, fType, fPriority, q, sprintFilter])

  function reload() { loadBoard(); loadList(); loadSprints(); loadMetrics() }

  async function move(ticket: Ticket, status: Ticket['status']) {
    if (ticket.status === status) return
    // optimistic: pull from old column, push to new
    setColumns(prev => {
      const next = prev.map(c => ({ ...c, tickets: c.tickets.filter(t => t.id !== ticket.id) }))
      const moved = { ...ticket, status }
      const col = next.find(c => c.status === status)
      if (col) col.tickets = [moved, ...col.tickets]
      return next.map(c => ({ ...c, count: c.tickets.length, points: c.tickets.reduce((s, t) => s + (t.storyPoints ?? 0), 0) }))
    })
    try { await patch(`/api/tickets/${ticket.id}`, { status }); loadSprints() }
    catch (e) { console.error(e); loadBoard() }
  }

  async function remove(t: Ticket) {
    try { await del(`/api/tickets/${t.id}`); reload() }
    catch (e) { console.error(e) }
  }

  const activeSprint = useMemo(() => sprints.find(s => s.id === sprintFilter), [sprints, sprintFilter])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-empire text-empire-gold text-sm tracking-widest uppercase">Tickets</h2>
          <p className="text-empire-text-muted text-xs mt-0.5">
            Jira-shaped delivery board — epics, stories, tasks &amp; bugs, sprint-tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-empire-border rounded overflow-hidden">
            {(['board', 'list', 'dashboard'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className="px-3 py-1.5 text-xs uppercase tracking-wider capitalize transition-colors"
                style={view === v ? { background: accent, color: '#0a0a0a' } : { color: 'var(--empire-text-muted, #7A7468)' }}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => setCreating(true)}
            className="px-4 py-2 bg-empire-gold-dim border border-empire-gold/30 text-empire-gold text-xs uppercase tracking-widest rounded hover:bg-empire-gold/20 transition-colors">
            + New ticket
          </button>
        </div>
      </div>

      {/* Sprint bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-empire-text-dim">Sprint</span>
        <select value={sprintFilter} onChange={e => setSprintFilter(e.target.value)} className="empire-input text-xs py-1.5 min-w-[200px]">
          <option value="">All tickets</option>
          <option value="none">No sprint (backlog pool)</option>
          {sprints.map(s => <option key={s.id} value={s.id}>{s.name} · {s.completedPoints ?? 0}/{s.committedPoints ?? 0} pts</option>)}
        </select>
        {activeSprint && (
          <span className="text-xs text-empire-text-dim inline-flex items-center gap-2">
            <span className="px-2 py-0.5 rounded border border-empire-border capitalize">{activeSprint.status}</span>
            <span className="font-data" style={{ color: accent }}>{activeSprint.velocityPct}%</span>
            <span>velocity</span>
          </span>
        )}
        <button onClick={() => setShowSprints(true)} className="ml-auto text-xs px-3 py-1.5 border border-empire-gold/30 text-empire-gold rounded hover:bg-empire-gold/10 inline-flex items-center gap-1.5">
          <EmpireIcon name="rocket" size={12} /> Manage sprints
        </button>
      </div>

      {/* Board view */}
      {view === 'board' && (
        loadingBoard ? (
          <div className="py-12 text-center text-empire-text-muted text-sm animate-pulse">Loading board…</div>
        ) : boardTotal === 0 ? (
          <EmptyState icon="rocket" title="No tickets yet" hint="Create the first ticket and it will land on the board. Drag cards between columns to move them through the workflow." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {STATUS_ORDER.map(status => {
              const col = columns.find(c => c.status === status) ?? { status, label: STATUS_LABEL[status], tickets: [], count: 0, points: 0 }
              return (
                <div
                  key={status}
                  onDragOver={e => { e.preventDefault(); setDragOver(status) }}
                  onDragLeave={() => setDragOver(o => (o === status ? null : o))}
                  onDrop={() => { const t = findTicket(columns, dragId); if (t) move(t, status); setDragId(null); setDragOver(null) }}
                  className={`rounded-lg border p-2.5 min-h-[120px] transition-colors ${dragOver === status ? 'border-empire-gold/50 bg-empire-gold-dim/40' : 'border-empire-border bg-empire-surface/40'}`}
                >
                  <div className="flex items-center justify-between px-1 pb-2 mb-1 border-b border-empire-border/60">
                    <span className="text-[10px] uppercase tracking-widest text-empire-text-dim">{STATUS_LABEL[status]}</span>
                    <span className="text-[10px] font-data text-empire-text-muted tabular-nums">{col.count}{col.points ? ` · ${col.points}p` : ''}</span>
                  </div>
                  <div className="space-y-2">
                    {col.tickets.map(t => (
                      <TicketCard key={t.id} t={t}
                        onDragStart={() => setDragId(t.id)}
                        onView={() => setViewing(t)} onEdit={() => setEditing(t)} onDelete={() => remove(t)} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Segmented label="Status" value={fStatus} options={['all', ...STATUS_ORDER]} onChange={v => setFStatus(v as any)} accent={accent} />
            <Segmented label="Type" value={fType} options={['all', ...TYPES]} onChange={v => setFType(v as any)} accent={accent} />
            <Segmented label="Priority" value={fPriority} options={['all', ...PRIORITIES]} onChange={v => setFPriority(v as any)} accent={accent} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search key / title…" className="empire-input text-xs py-1.5 ml-auto min-w-[180px]" />
          </div>

          {loadingList ? (
            <div className="py-12 text-center text-empire-text-muted text-sm animate-pulse">Loading tickets…</div>
          ) : rows.length === 0 ? (
            <EmptyState icon="rocket" title="No tickets match" hint="Adjust the filters, or create a new ticket." />
          ) : (
            <div className="space-y-2">
              {rows.map(t => (
                <div key={t.id} onClick={() => setViewing(t)} role="button" tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') setViewing(t) }}
                  className="w-full cursor-pointer text-left bg-empire-surface border border-empire-border rounded-lg p-3.5 hover:border-empire-gold/30 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <EmpireIcon name={TYPE_ICON[t.type]} size={14} className={TYPE_COLOR[t.type]} />
                      <span className="font-data text-xs text-empire-gold-muted">{t.key}</span>
                      <span className="text-empire-text text-sm truncate">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className="text-[10px] uppercase tracking-wider text-empire-text-dim">{STATUS_LABEL[t.status]}</span>
                      <span className={`px-2 py-0.5 text-[10px] rounded border ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                      {t.storyPoints != null && <span className="font-data text-xs text-empire-text-muted">{t.storyPoints}p</span>}
                      {t.assignee && <Avatar person={t.assignee} />}
                      <RowActions onView={() => setViewing(t)} onEdit={() => setEditing(t)} onDelete={() => remove(t)} deleteLabel={`ticket ${t.key}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination page={page} pageCount={totalPages} total={total} onPage={setPage} accent={accent} />
        </div>
      )}

      {/* Dashboard view */}
      {view === 'dashboard' && (
        loadingMetrics ? (
          <div className="py-12 text-center text-empire-text-muted text-sm animate-pulse">Loading metrics…</div>
        ) : !metrics || metrics.total === 0 ? (
          <EmptyState icon="gauge" title="No delivery data yet" hint="Create tickets and run sprints — this dashboard scores delivery health, velocity, flow and throughput from your real data." />
        ) : (
          <Dashboard m={metrics} accent={accent} scopeLabel={activeSprint ? activeSprint.name : 'All projects'} sprintId={activeSprint ? activeSprint.id : null} />
        )
      )}

      {/* Modals */}
      {viewing && <TicketViewer t={viewing} departmentSlug={departmentSlug} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null) }} onDeleted={() => { setViewing(null); reload() }} />}
      {(creating || editing) && (
        <TicketForm
          departmentSlug={departmentSlug}
          ticket={editing ?? undefined}
          people={people}
          sprints={sprints}
          defaultSprintId={sprintFilter && sprintFilter !== 'none' ? sprintFilter : undefined}
          onSaved={() => { setCreating(false); setEditing(null); reload() }}
          onCancel={() => { setCreating(false); setEditing(null) }}
        />
      )}
      {showSprints && (
        <SprintManager departmentSlug={departmentSlug} sprints={sprints}
          onChanged={() => { loadSprints(); loadBoard() }} onClose={() => setShowSprints(false)} />
      )}
    </div>
  )
}

function findTicket(columns: Column[], id: string | null): Ticket | null {
  if (!id) return null
  for (const c of columns) { const t = c.tickets.find(x => x.id === id); if (t) return t }
  return null
}

function Avatar({ person }: { person: { name: string; avatarUrl?: string | null } }) {
  const initials = person.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  if (person.avatarUrl) return <img src={person.avatarUrl} alt={person.name} title={person.name} className="w-5 h-5 rounded-full object-cover border border-empire-border" />
  return <span title={person.name} className="grid place-items-center w-5 h-5 rounded-full bg-empire-elevated border border-empire-border text-[9px] font-data text-empire-text-muted">{initials}</span>
}

function TicketCard({ t, onDragStart, onView, onEdit, onDelete }: {
  t: Ticket; onDragStart: () => void; onView: () => void; onEdit: () => void; onDelete: () => void | Promise<void>
}) {
  return (
    <div draggable onDragStart={onDragStart} onClick={onView}
      className="group bg-empire-surface border border-empire-border rounded-md p-2.5 cursor-grab active:cursor-grabbing hover:border-empire-gold/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <EmpireIcon name={TYPE_ICON[t.type]} size={12} className={TYPE_COLOR[t.type]} />
          <span className="font-data text-[10px] text-empire-gold-muted">{t.key}</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <RowActions onView={onView} onEdit={onEdit} onDelete={onDelete} deleteLabel={`ticket ${t.key}`} size={13} />
        </div>
      </div>
      <p className="text-empire-text text-xs mt-1 leading-snug line-clamp-3">{t.title}</p>
      <div className="flex items-center justify-between gap-2 mt-2">
        <span className={`px-1.5 py-0.5 text-[9px] rounded border ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
        <div className="flex items-center gap-1.5">
          {t.storyPoints != null && <span className="font-data text-[10px] text-empire-text-muted">{t.storyPoints}p</span>}
          {t.assignee && <Avatar person={t.assignee} />}
        </div>
      </div>
    </div>
  )
}

function Segmented({ label, value, options, onChange, accent }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void; accent: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-empire-text-dim">{label}</span>
      <div className="flex border border-empire-border rounded overflow-hidden">
        {options.map(o => (
          <button key={o} onClick={() => onChange(o)} className="px-2.5 py-1 text-xs capitalize transition-colors"
            style={value === o ? { background: accent, color: '#0a0a0a' } : { color: 'var(--empire-text-muted, #7A7468)' }}>
            {o.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---- Delivery dashboard (board/list/dashboard toggle) ----
type BurndownData = {
  sprintName: string; committed: number; completed: number; remaining: number
  days: { date: string; remaining: number; ideal: number; completed: number }[]
}

// Sprint burndown — actual remaining points vs. the ideal straight-line glide
// path. Fetched per-sprint from /api/tickets/burndown.
function Burndown({ sprintId, accent }: { sprintId: string; accent: string }) {
  const [data, setData] = useState<BurndownData | null>(null)
  useEffect(() => {
    let on = true
    fetcher(`/api/tickets/burndown?sprintId=${sprintId}`).then(d => { if (on) setData(d) }).catch(() => { if (on) setData(null) })
    return () => { on = false }
  }, [sprintId])
  if (!data || data.days.length < 2 || data.committed === 0) return null

  const remaining = data.days.map(d => d.remaining)
  const ideal = data.days.map(d => d.ideal)
  const labels = data.days.map(d => format(new Date(d.date), 'MMM d'))
  return (
    <div className="bg-empire-surface border border-empire-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest text-empire-text-dim inline-flex items-center gap-2">
          <EmpireIcon name="chart-line" size={12} /> Burndown · {data.sprintName}
        </span>
        <span className="font-data text-[10px] text-empire-text-muted tabular-nums">{data.remaining}/{data.committed} pts left</span>
      </div>
      <AreaChart
        series={remaining} compare={ideal} labels={labels}
        color={accent} compareColor="#7A7468"
        seriesLabel="Remaining" compareLabel="Ideal"
        valueFormat={(v) => `${Math.round(v)} pts`}
      />
    </div>
  )
}

function Dashboard({ m, accent, scopeLabel, sprintId }: { m: Metrics; accent: string; scopeLabel: string; sprintId: string | null }) {
  const band = m.healthBand
  const bandColor = HEALTH_COLOR[band]
  const ring = 2 * Math.PI * 52
  const pct = m.healthScore ?? 0
  return (
    <div className="space-y-5 animate-slide-up">
      {/* scope + headline health */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest text-empire-text-dim inline-flex items-center gap-2">
          <EmpireIcon name="gauge" size={12} /> Scope · {scopeLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5 items-stretch">
        {/* Health ring */}
        <div className="bg-empire-surface border border-empire-border rounded-xl p-5 flex items-center gap-5 min-w-[260px]">
          <div className="relative w-[124px] h-[124px] flex-shrink-0">
            <svg viewBox="0 0 124 124" className="w-full h-full -rotate-90">
              <circle cx="62" cy="62" r="52" fill="none" stroke="var(--empire-border, #2a2a2a)" strokeWidth="9" />
              <circle cx="62" cy="62" r="52" fill="none" stroke={bandColor} strokeWidth="9" strokeLinecap="round"
                strokeDasharray={ring} strokeDashoffset={ring * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)' }} />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="font-empire text-3xl leading-none" style={{ color: bandColor }}>{m.healthScore ?? '—'}</div>
                <div className="text-[9px] uppercase tracking-widest text-empire-text-dim mt-1">/ 100</div>
              </div>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-empire-text-dim">Delivery health</div>
            <div className="font-empire text-lg" style={{ color: bandColor }}>{HEALTH_LABEL[band]}</div>
            <p className="text-empire-text-dim text-xs mt-1.5 max-w-[160px] leading-relaxed">
              Composite of completion, velocity, flow &amp; punctuality.
            </p>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <Kpi label="Completion" value={`${m.doneRatio}%`} sub={`${m.doneCount}/${m.total} done`} accent={accent} />
          <Kpi label="Avg velocity" value={`${m.avgVelocity}%`} sub={`${m.sprintsTracked} sprint${m.sprintsTracked === 1 ? '' : 's'}`} accent={accent} />
          <Kpi label="In flight" value={String(m.wip)} sub={`${m.overdue} overdue`} accent={m.overdue > 0 ? '#F4EFE3' : accent} />
          <Kpi label="Median cycle" value={m.medianCycleHours == null ? '—' : fmtHours(m.medianCycleHours)} sub="start → done" accent={accent} />
        </div>
      </div>

      {/* Throughput */}
      <div className="bg-empire-surface border border-empire-border rounded-xl p-4">
        <div className="text-[10px] uppercase tracking-widest text-empire-text-dim mb-3">Throughput — tickets shipped</div>
        <div className="grid grid-cols-3 gap-3">
          {([['Last 7 days', m.throughput.last7], ['Last 14 days', m.throughput.last14], ['Last 30 days', m.throughput.last30]] as const).map(([l, v]) => (
            <div key={l} className="text-center">
              <div className="font-empire text-2xl tabular-nums" style={{ color: accent }}>{v}</div>
              <div className="text-[10px] uppercase tracking-wider text-empire-text-dim mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DistPanel title="By status" data={STATUS_ORDER.map(s => ({ label: STATUS_LABEL[s], value: m.byStatus[s] ?? 0 }))} total={m.total} accent={accent} />
        <DistPanel title="By type" data={TYPES.map(t => ({ label: t, value: m.byType[t] ?? 0 }))} total={m.total} accent={accent} />
        <DistPanel title="By priority" data={PRIORITIES.map(p => ({ label: p, value: m.byPriority[p] ?? 0 }))} total={m.total} accent={accent} />
      </div>

      {/* Sprint velocity */}
      {m.perSprint.length > 0 && (
        <div className="bg-empire-surface border border-empire-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-widest text-empire-text-dim">Sprint velocity</span>
            <span className="text-[10px] text-empire-text-dim">avg {m.avgThroughputPts} pts / sprint</span>
          </div>
          <div className="space-y-2.5">
            {m.perSprint.map(s => (
              <div key={s.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-empire-text inline-flex items-center gap-2 min-w-0">
                    <span className="truncate">{s.name}</span>
                    <span className="px-1.5 py-0.5 text-[9px] rounded border border-empire-border capitalize text-empire-text-dim">{s.status}</span>
                  </span>
                  <span className="font-data text-empire-text-muted tabular-nums">{s.completedPoints}/{s.committedPoints} pts · {s.velocityPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-empire-elevated overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, s.velocityPct)}%`, background: s.velocityPct >= 100 ? HEALTH_COLOR.elite : accent, transition: 'width .6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Burndown — ideal vs. actual remaining points (only meaningful per-sprint) */}
      {sprintId && <Burndown sprintId={sprintId} accent={accent} />}

      {/* Contributors leaderboard */}
      {m.contributors.length > 0 && (
        <div className="bg-empire-surface border border-empire-border rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-empire-text-dim mb-3">Contributors</div>
          <div className="space-y-2">
            {m.contributors.slice(0, 8).map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="font-data text-[10px] text-empire-text-dim w-4 tabular-nums">{i + 1}</span>
                <Avatar person={c} />
                <span className="text-empire-text text-sm truncate flex-1">{c.name}</span>
                <span className="text-[10px] text-empire-text-dim">{c.active} active</span>
                <span className="font-data text-xs text-empire-text-muted tabular-nums w-16 text-right">{c.done} done</span>
                <span className="font-data text-xs tabular-nums w-14 text-right" style={{ color: accent }}>{c.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="bg-empire-surface border border-empire-border rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-empire-text-dim">{label}</div>
      <div className="font-empire text-2xl mt-1.5 tabular-nums" style={{ color: accent }}>{value}</div>
      <div className="text-[10px] text-empire-text-dim mt-1">{sub}</div>
    </div>
  )
}

function DistPanel({ title, data, total, accent }: { title: string; data: { label: string; value: number }[]; total: number; accent: string }) {
  return (
    <div className="bg-empire-surface border border-empire-border rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-empire-text-dim mb-3">{title}</div>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.label}>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="capitalize text-empire-text-muted">{d.label.replace('_', ' ')}</span>
              <span className="font-data text-empire-text-dim tabular-nums">{d.value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-empire-elevated overflow-hidden">
              <div className="h-full rounded-full" style={{ width: total ? `${(d.value / total) * 100}%` : '0%', background: accent, transition: 'width .6s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`
  if (h < 48) return `${Math.round(h * 10) / 10}h`
  return `${Math.round(h / 24 * 10) / 10}d`
}

type LinkRow = { linkId: string; dir: 'in' | 'out'; type: string; label: string; ticket: { id: string; key: string; title: string; status: string; type: string } }
const LINK_TYPE_OPTS = [
  { value: 'blocks', label: 'blocks' },
  { value: 'relates', label: 'relates to' },
  { value: 'duplicates', label: 'duplicates' },
]

function TicketViewer({ t, departmentSlug, onClose, onEdit, onDeleted }: {
  t: Ticket; departmentSlug: string; onClose: () => void; onEdit: () => void; onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [links, setLinks] = useState<LinkRow[]>([])
  const [candidates, setCandidates] = useState<{ id: string; key: string; title: string }[]>([])
  const [linkTarget, setLinkTarget] = useState('')
  const [linkType, setLinkType] = useState('blocks')
  const [linking, setLinking] = useState(false)

  const loadLinks = useCallback(async () => {
    try { const d = await fetcher(`/api/tickets/${t.id}`); setLinks(d?.links ?? []) }
    catch (e) { console.error(e) }
  }, [t.id])
  useEffect(() => { loadLinks() }, [loadLinks])
  useEffect(() => {
    fetcher(`/api/tickets?departmentSlug=${departmentSlug}&pageSize=200`)
      .then(r => setCandidates((r?.data ?? []).filter((x: { id: string }) => x.id !== t.id).map((x: { id: string; key: string; title: string }) => ({ id: x.id, key: x.key, title: x.title }))))
      .catch(() => {})
  }, [departmentSlug, t.id])

  async function addLink() {
    if (!linkTarget) return
    setLinking(true)
    try { await post(`/api/tickets/${t.id}/links`, { targetId: linkTarget, type: linkType }); setLinkTarget(''); await loadLinks() }
    catch (e) { console.error(e) }
    finally { setLinking(false) }
  }
  async function removeLink(linkId: string) {
    try { await del(`/api/tickets/links/${linkId}`); await loadLinks() }
    catch (e) { console.error(e) }
  }

  async function remove() {
    setDeleting(true)
    try { await del(`/api/tickets/${t.id}`); onDeleted() }
    catch (e) { console.error(e); setDeleting(false) }
  }
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-empire-text-dim mb-0.5">{label}</div>
      <div className="text-empire-text text-sm">{children}</div>
    </div>
  )
  return (
    <Modal open onClose={onClose} width="max-w-2xl"
      title={`${t.key} · ${t.title}`}
      icon={<EmpireIcon name={TYPE_ICON[t.type]} size={18} />}>
      <div className="space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 text-[10px] rounded border border-empire-border uppercase tracking-wider text-empire-text-muted">{STATUS_LABEL[t.status]}</span>
          <span className={`px-2 py-0.5 text-[10px] rounded border ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
          <span className="px-2 py-0.5 text-[10px] rounded border border-empire-border capitalize text-empire-text-muted">{t.type}</span>
          {t.storyPoints != null && <span className="font-data text-xs text-empire-text-muted">{t.storyPoints} pts</span>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {t.assignee && <Field label="Assignee">{t.assignee.name} · {t.assignee.role}</Field>}
          {t.reporter && <Field label="Reporter">{t.reporter.name}</Field>}
          {t.sprint && <Field label="Sprint">{t.sprint.name}</Field>}
          {t.dueDate && <Field label="Due">{format(new Date(t.dueDate), 'MMM d, yyyy')}</Field>}
        </div>
        {t.labels.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {t.labels.map(l => <span key={l} className="px-2 py-0.5 text-[10px] rounded bg-empire-elevated text-empire-text-muted">{l}</span>)}
          </div>
        )}
        {t.description && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-empire-text-dim mb-1">Description</div>
            <p className="text-empire-text-muted text-sm leading-relaxed whitespace-pre-wrap">{t.description}</p>
          </div>
        )}

        {/* Dependencies — Jira-style blocks / blocked-by / relates links */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-empire-text-dim mb-1.5">Dependencies</div>
          {links.length > 0 ? (
            <div className="space-y-1.5">
              {links.map(l => (
                <div key={l.linkId} className="flex items-center gap-2 rounded border border-empire-border px-2.5 py-1.5">
                  <span className={`px-1.5 py-0.5 text-[9px] rounded uppercase tracking-wider ${l.type === 'blocks' ? 'border border-empire-red/40 text-empire-red-bright' : 'border border-empire-border text-empire-text-muted'}`}>{l.label}</span>
                  <span className="font-data text-xs text-empire-text-muted">{l.ticket.key}</span>
                  <span className="text-xs text-empire-text truncate flex-1">{l.ticket.title}</span>
                  <span className="text-[10px] text-empire-text-dim">{STATUS_LABEL[l.ticket.status as Ticket['status']] ?? l.ticket.status}</span>
                  <button onClick={() => removeLink(l.linkId)} title="Remove link" className="text-empire-text-dim hover:text-empire-red-bright transition-colors">
                    <EmpireIcon name="trash" size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-empire-text-dim">No dependencies.</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <select value={linkType} onChange={e => setLinkType(e.target.value)}
              className="bg-empire-elevated border border-empire-border rounded px-2 py-1 text-xs text-empire-text">
              {LINK_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={linkTarget} onChange={e => setLinkTarget(e.target.value)}
              className="bg-empire-elevated border border-empire-border rounded px-2 py-1 text-xs text-empire-text flex-1 min-w-0">
              <option value="">Select a ticket…</option>
              {candidates.map(c => <option key={c.id} value={c.id}>{c.key} · {c.title}</option>)}
            </select>
            <button onClick={addLink} disabled={!linkTarget || linking}
              className="text-xs px-3 py-1 border border-empire-gold/30 text-empire-gold rounded hover:bg-empire-gold/10 transition-colors disabled:opacity-50">
              {linking ? 'Linking…' : 'Link'}
            </button>
          </div>
        </div>

        {/* Collaboration — comments, attachments & notes (§4) */}
        <TicketActivity ticketId={t.id} />

        <div className="flex justify-end gap-2 border-t border-empire-border pt-4">
          <button onClick={remove} disabled={deleting} className="text-xs px-3 py-1.5 border border-empire-red/30 text-empire-red-bright rounded hover:bg-empire-red/10 transition-colors disabled:opacity-50">
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <button onClick={onEdit} className="empire-btn-primary text-xs">Edit</button>
        </div>
      </div>
    </Modal>
  )
}

// Comments + attachments + notes for a single ticket (§4). Three small tabs so
// the viewer stays compact; each is full CRUD against the live API.
type CommentRow = { id: string; body: string; createdAt: string; author: { id: string; name: string } | null }
type AttachmentRow = { id: string; name: string; url: string; mimeType: string | null; size: number | null; createdAt: string }
type NoteRow = { id: string; body: string; pinned: boolean; createdAt: string; author: { id: string; name: string } | null }

function TicketActivity({ ticketId }: { ticketId: string }) {
  const [tab, setTab] = useState<'comments' | 'attachments' | 'notes'>('comments')
  const [comments, setComments] = useState<CommentRow[]>([])
  const [attachments, setAttachments] = useState<AttachmentRow[]>([])
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [draft, setDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [c, a, n] = await Promise.all([
        fetcher(`/api/tickets/${ticketId}/comments?pageSize=100`),
        fetcher(`/api/tickets/${ticketId}/attachments?pageSize=100`),
        fetcher(`/api/notes?ticketId=${ticketId}&pageSize=100`),
      ])
      setComments(c?.data ?? [])
      setAttachments(a?.data ?? [])
      setNotes(n?.data ?? [])
    } catch (e) { console.error(e) }
  }, [ticketId])
  useEffect(() => { load() }, [load])

  async function addComment() {
    if (!draft.trim()) return
    setBusy(true)
    try { await post(`/api/tickets/${ticketId}/comments`, { body: draft }); setDraft(''); await load() }
    catch (e) { console.error(e) } finally { setBusy(false) }
  }
  async function delComment(id: string) {
    try { await del(`/api/tickets/comments/${id}`); await load() } catch (e) { console.error(e) }
  }
  async function addNote() {
    if (!noteDraft.trim()) return
    setBusy(true)
    try { await post(`/api/notes`, { body: noteDraft, ticketId }); setNoteDraft(''); await load() }
    catch (e) { console.error(e) } finally { setBusy(false) }
  }
  async function togglePin(n: NoteRow) {
    try { await patch(`/api/notes/${n.id}`, { pinned: !n.pinned }); await load() } catch (e) { console.error(e) }
  }
  async function delNote(id: string) {
    try { await del(`/api/notes/${id}`); await load() } catch (e) { console.error(e) }
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 6 * 1024 * 1024) { console.error('attachment too large (6MB max)'); return }
    setBusy(true)
    try {
      const url: string = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result))
        r.onerror = reject
        r.readAsDataURL(file)
      })
      await post(`/api/tickets/${ticketId}/attachments`, { name: file.name, url, mimeType: file.type, size: file.size })
      await load()
    } catch (err) { console.error(err) } finally { setBusy(false); e.target.value = '' }
  }
  async function delAttachment(id: string) {
    try { await del(`/api/tickets/attachments/${id}`); await load() } catch (e) { console.error(e) }
  }

  const TabBtn = ({ id, label, count }: { id: typeof tab; label: string; count: number }) => (
    <button onClick={() => setTab(id)}
      className={`px-2.5 py-1 text-[11px] uppercase tracking-wider rounded transition-colors ${tab === id ? 'bg-empire-gold-dim text-empire-gold border border-empire-gold/30' : 'text-empire-text-muted hover:text-empire-text border border-transparent'}`}>
      {label}{count > 0 && <span className="ml-1 font-data text-[10px] opacity-70">{count}</span>}
    </button>
  )

  return (
    <div className="border-t border-empire-border pt-4">
      <div className="flex items-center gap-1.5 mb-3">
        <TabBtn id="comments" label="Comments" count={comments.length} />
        <TabBtn id="attachments" label="Files" count={attachments.length} />
        <TabBtn id="notes" label="Notes" count={notes.length} />
      </div>

      {tab === 'comments' && (
        <div className="space-y-2">
          {comments.length === 0 && <p className="text-xs text-empire-text-dim">No comments yet.</p>}
          {comments.map(c => (
            <div key={c.id} className="rounded border border-empire-border px-2.5 py-1.5">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] text-empire-text">{c.author?.name ?? 'System'}</span>
                <span className="text-[10px] text-empire-text-dim">{format(new Date(c.createdAt), 'MMM d, HH:mm')}</span>
                <button onClick={() => delComment(c.id)} title="Delete comment" className="ml-auto text-empire-text-dim hover:text-empire-red-bright transition-colors">
                  <EmpireIcon name="trash" size={12} />
                </button>
              </div>
              <p className="text-sm text-empire-text-muted whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
          <div className="flex items-start gap-2 pt-1">
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2} placeholder="Add a comment…"
              className="flex-1 bg-empire-elevated border border-empire-border rounded px-2.5 py-1.5 text-sm text-empire-text resize-none" />
            <button onClick={addComment} disabled={busy || !draft.trim()}
              className="text-xs px-3 py-1.5 border border-empire-gold/30 text-empire-gold rounded hover:bg-empire-gold/10 transition-colors disabled:opacity-50">Post</button>
          </div>
        </div>
      )}

      {tab === 'attachments' && (
        <div className="space-y-2">
          {attachments.length === 0 && <p className="text-xs text-empire-text-dim">No files attached.</p>}
          {attachments.map(a => (
            <div key={a.id} className="flex items-center gap-2 rounded border border-empire-border px-2.5 py-1.5">
              <EmpireIcon name="document" size={14} />
              <a href={a.url} download={a.name} className="text-sm text-empire-text hover:text-empire-gold truncate flex-1">{a.name}</a>
              {a.size != null && <span className="font-data text-[10px] text-empire-text-dim">{Math.max(1, Math.round(a.size / 1024))} KB</span>}
              <button onClick={() => delAttachment(a.id)} title="Remove file" className="text-empire-text-dim hover:text-empire-red-bright transition-colors">
                <EmpireIcon name="trash" size={12} />
              </button>
            </div>
          ))}
          <label className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-empire-gold/30 text-empire-gold rounded hover:bg-empire-gold/10 transition-colors cursor-pointer mt-1">
            <EmpireIcon name="plus" size={12} /> {busy ? 'Uploading…' : 'Attach file'}
            <input type="file" onChange={onFile} disabled={busy} className="hidden" />
          </label>
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-2">
          {notes.length === 0 && <p className="text-xs text-empire-text-dim">No notes.</p>}
          {notes.map(n => (
            <div key={n.id} className={`rounded border px-2.5 py-1.5 ${n.pinned ? 'border-empire-gold/40 bg-empire-gold-dim/30' : 'border-empire-border'}`}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] text-empire-text">{n.author?.name ?? 'Note'}</span>
                <span className="text-[10px] text-empire-text-dim">{format(new Date(n.createdAt), 'MMM d, HH:mm')}</span>
                <button onClick={() => togglePin(n)} title={n.pinned ? 'Unpin' : 'Pin'} className={`ml-auto transition-colors ${n.pinned ? 'text-empire-gold' : 'text-empire-text-dim hover:text-empire-gold'}`}>
                  <EmpireIcon name="star" size={12} />
                </button>
                <button onClick={() => delNote(n.id)} title="Delete note" className="text-empire-text-dim hover:text-empire-red-bright transition-colors">
                  <EmpireIcon name="trash" size={12} />
                </button>
              </div>
              <p className="text-sm text-empire-text-muted whitespace-pre-wrap">{n.body}</p>
            </div>
          ))}
          <div className="flex items-start gap-2 pt-1">
            <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} rows={2} placeholder="Add a note…"
              className="flex-1 bg-empire-elevated border border-empire-border rounded px-2.5 py-1.5 text-sm text-empire-text resize-none" />
            <button onClick={addNote} disabled={busy || !noteDraft.trim()}
              className="text-xs px-3 py-1.5 border border-empire-gold/30 text-empire-gold rounded hover:bg-empire-gold/10 transition-colors disabled:opacity-50">Add</button>
          </div>
        </div>
      )}
    </div>
  )
}

function TicketForm({ departmentSlug, ticket, people, sprints, defaultSprintId, onSaved, onCancel }: {
  departmentSlug: string; ticket?: Ticket; people: Person[]; sprints: Sprint[]
  defaultSprintId?: string; onSaved: () => void; onCancel: () => void
}) {
  const isEdit = !!ticket
  const [f, setF] = useState({
    title: ticket?.title ?? '',
    description: ticket?.description ?? '',
    type: ticket?.type ?? 'task',
    status: ticket?.status ?? 'backlog',
    priority: ticket?.priority ?? 'normal',
    storyPoints: ticket?.storyPoints != null ? String(ticket.storyPoints) : '',
    assigneeId: ticket?.assigneeId ?? '',
    reporterId: ticket?.reporterId ?? '',
    sprintId: ticket?.sprintId ?? defaultSprintId ?? '',
    dueDate: ticket?.dueDate ? ticket.dueDate.slice(0, 10) : '',
    labels: ticket?.labels.join(', ') ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!f.title.trim()) return
    setSaving(true)
    const body = {
      title: f.title.trim(),
      description: f.description || undefined,
      type: f.type,
      status: f.status,
      priority: f.priority,
      storyPoints: f.storyPoints ? Number(f.storyPoints) : null,
      assigneeId: f.assigneeId || null,
      reporterId: f.reporterId || null,
      sprintId: f.sprintId || null,
      dueDate: f.dueDate || null,
      labels: f.labels.split(',').map(s => s.trim()).filter(Boolean),
      departmentSlug,
    }
    try {
      if (isEdit && ticket) await patch(`/api/tickets/${ticket.id}`, body)
      else await post('/api/tickets', body)
      onSaved()
    } catch (e) { console.error(e); setSaving(false) }
  }

  return (
    <Modal open onClose={onCancel} width="max-w-2xl" title={isEdit ? `Edit ${ticket!.key}` : 'New ticket'} icon={<EmpireIcon name="rocket" size={18} />}>
      <div className="space-y-4">
        <input placeholder="Title *" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="empire-input w-full" />
        <textarea placeholder="Description" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} rows={3} className="empire-input w-full resize-none" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="empire-label">Type</label>
            <select value={f.type} onChange={e => setF({ ...f, type: e.target.value as Ticket['type'] })} className="empire-input w-full mt-1">
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="empire-label">Status</label>
            <select value={f.status} onChange={e => setF({ ...f, status: e.target.value as Ticket['status'] })} className="empire-input w-full mt-1">
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="empire-label">Priority</label>
            <select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value as Ticket['priority'] })} className="empire-input w-full mt-1">
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="empire-label">Story points</label>
            <input type="number" min={0} value={f.storyPoints} onChange={e => setF({ ...f, storyPoints: e.target.value })} className="empire-input w-full mt-1" />
          </div>
          <div>
            <label className="empire-label">Assignee — earns XP when done</label>
            <select value={f.assigneeId} onChange={e => setF({ ...f, assigneeId: e.target.value })} className="empire-input w-full mt-1">
              <option value="">— none —</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}
            </select>
          </div>
          <div>
            <label className="empire-label">Reporter</label>
            <select value={f.reporterId} onChange={e => setF({ ...f, reporterId: e.target.value })} className="empire-input w-full mt-1">
              <option value="">— none —</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}
            </select>
          </div>
          <div>
            <label className="empire-label">Sprint</label>
            <select value={f.sprintId} onChange={e => setF({ ...f, sprintId: e.target.value })} className="empire-input w-full mt-1">
              <option value="">— backlog (no sprint) —</option>
              {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="empire-label">Due date</label>
            <input type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} className="empire-input w-full mt-1" />
          </div>
        </div>
        <input placeholder="Labels (comma-separated)" value={f.labels} onChange={e => setF({ ...f, labels: e.target.value })} className="empire-input w-full" />
        <div className="flex gap-2 border-t border-empire-border pt-4">
          <button onClick={submit} disabled={saving || !f.title.trim()} className="empire-btn-primary disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create ticket'}
          </button>
          <button onClick={onCancel} className="text-xs px-4 py-2 text-empire-text-muted hover:text-empire-text">Cancel</button>
        </div>
      </div>
    </Modal>
  )
}

function SprintManager({ departmentSlug, sprints, onChanged, onClose }: {
  departmentSlug: string; sprints: Sprint[]; onChanged: () => void; onClose: () => void
}) {
  const [editing, setEditing] = useState<Sprint | null>(null)
  const [showForm, setShowForm] = useState(false)
  const blank = { name: '', goal: '', status: 'planned', startDate: '', endDate: '', committedPoints: '' }
  const [f, setF] = useState(blank)
  const [saving, setSaving] = useState(false)

  function openNew() { setEditing(null); setF(blank); setShowForm(true) }
  function openEdit(s: Sprint) {
    setEditing(s)
    setF({ name: s.name, goal: s.goal ?? '', status: s.status, startDate: s.startDate.slice(0, 10), endDate: s.endDate.slice(0, 10), committedPoints: s.committedPoints != null ? String(s.committedPoints) : '' })
    setShowForm(true)
  }

  async function save() {
    if (!f.name || !f.startDate || !f.endDate) return
    setSaving(true)
    const body = {
      name: f.name, goal: f.goal || undefined, status: f.status,
      startDate: f.startDate, endDate: f.endDate,
      committedPoints: f.committedPoints ? Number(f.committedPoints) : undefined,
      departmentSlug,
    }
    try {
      if (editing) await patch(`/api/tickets/sprints/${editing.id}`, body)
      else await post('/api/tickets/sprints', body)
      setShowForm(false); setEditing(null); onChanged()
    } catch (e) { console.error(e); setSaving(false); return }
    setSaving(false)
  }

  async function remove(s: Sprint) {
    try { await del(`/api/tickets/sprints/${s.id}`); onChanged() }
    catch (e) { console.error(e) }
  }

  return (
    <Modal open onClose={onClose} width="max-w-xl" title="Sprints" icon={<EmpireIcon name="rocket" size={18} />}>
      <div className="space-y-4">
        {!showForm && (
          <button onClick={openNew} className="px-4 py-2 bg-empire-gold-dim border border-empire-gold/30 text-empire-gold text-xs uppercase tracking-widest rounded hover:bg-empire-gold/20 transition-colors">
            + New sprint
          </button>
        )}

        {showForm && (
          <div className="bg-empire-surface border border-empire-gold/20 rounded-lg p-4 space-y-3">
            <h4 className="font-empire text-empire-gold text-sm">{editing ? 'Edit sprint' : 'New sprint'}</h4>
            <input placeholder="Name *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className="empire-input w-full" />
            <input placeholder="Goal" value={f.goal} onChange={e => setF({ ...f, goal: e.target.value })} className="empire-input w-full" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="empire-label">Status</label>
                <select value={f.status} onChange={e => setF({ ...f, status: e.target.value })} className="empire-input w-full mt-1">
                  {['planned', 'active', 'completed'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="empire-label">Committed points</label>
                <input type="number" min={0} value={f.committedPoints} onChange={e => setF({ ...f, committedPoints: e.target.value })} className="empire-input w-full mt-1" />
              </div>
              <div>
                <label className="empire-label">Start *</label>
                <input type="date" value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value })} className="empire-input w-full mt-1" />
              </div>
              <div>
                <label className="empire-label">End *</label>
                <input type="date" value={f.endDate} onChange={e => setF({ ...f, endDate: e.target.value })} className="empire-input w-full mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving || !f.name || !f.startDate || !f.endDate} className="empire-btn-primary text-xs disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create sprint'}
              </button>
              <button onClick={() => { setShowForm(false); setEditing(null) }} className="text-xs px-4 py-2 text-empire-text-muted hover:text-empire-text">Cancel</button>
            </div>
          </div>
        )}

        {sprints.length === 0 && !showForm ? (
          <EmptyState icon="rocket" title="No sprints yet" hint="Create a sprint to group tickets and track velocity." />
        ) : (
          <div className="space-y-2">
            {sprints.map(s => (
              <div key={s.id} className="bg-empire-surface border border-empire-border rounded-lg p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-empire-text text-sm truncate">{s.name}</span>
                    <span className="px-2 py-0.5 text-[10px] rounded border border-empire-border capitalize text-empire-text-muted">{s.status}</span>
                  </div>
                  <div className="text-empire-text-dim text-xs mt-0.5">
                    {s.ticketCount} tickets · {s.completedPoints ?? 0}/{s.committedPoints ?? 0} pts · {s.velocityPct}% velocity
                  </div>
                </div>
                <RowActions onEdit={() => openEdit(s)} onDelete={() => remove(s)} deleteLabel={`sprint “${s.name}”`} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
