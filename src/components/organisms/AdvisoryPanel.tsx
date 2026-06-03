'use client'

import { useState, useEffect, useCallback } from 'react'
import { KpiCard, Panel, AreaChart, BarChart, DonutChart, DataTable, TabBar, Grid, EmptyState, type Column } from '@/lib/ui'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { Modal } from '@/components/molecules/Modal'
import { fetcher, post, patch, del, formatCurrency } from '@/lib/api'
import { useStickyTab } from '@/lib/use-sticky-tab'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'

// Advisory — board of advisors & strategic network. Active advisors, advisory
// equity granted & vested, committed hours, session cadence + value rating, and
// the warm-intro funnel (requested → made → responded → converted) with
// conversion rate and pipeline value all derive server-side from /api/advisory/*.

const ACCENT = '#14b8a6' // advisory teal

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'overview' as const },
  { id: 'network', label: 'Network', icon: 'compass' as const },
  { id: 'intros', label: 'Intros', icon: 'handshake' as const },
  { id: 'advisors', label: 'Advisors', icon: 'people' as const },
]

const EXPERTISE_COLOR: Record<string, string> = {
  GTM: '#14b8a6', Finance: '#22c55e', Product: '#8b5cf6', Legal: '#f59e0b', Technical: '#4f8ff7', Industry: '#ec4899',
}
const TIER_COLOR: Record<string, string> = { strategic: '#14b8a6', specialist: '#4f8ff7', operational: '#94a3b8' }
const STATUS_COLOR: Record<string, string> = { active: '#10b981', onboarding: '#4f8ff7', inactive: '#f59e0b', alumni: '#94a3b8' }
const INTRO_COLOR: Record<string, string> = { requested: '#6b7280', made: '#4f8ff7', responded: '#06b6d4', converted: '#10b981', declined: '#c94f4f' }

const inputCls = 'bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/60'

function Pill({ text, color }: { text: string; color: string }) {
  return <span style={{ color, background: color + '18', border: '1px solid ' + color + '40' }} className="px-2 py-0.5 rounded text-xs font-medium">{text}</span>
}

function useAdv<T = any>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    setLoading(true)
    fetcher(`/api/advisory/${path}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [path])
  useEffect(() => { reload() }, [reload])
  return { data, loading, reload }
}

function Loading() { return <div className="py-16 text-center text-empire-text-dim text-sm animate-pulse">Computing from advisory network…</div> }

export function AdvisoryPanel() {
  const [tab, setTab] = useStickyTab('advisory', 'overview')
  return (
    <div className="space-y-6 font-empire animate-slide-up">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-empire-border bg-empire-elevated/40 text-empire-gold/80">
          <EmpireIcon name={deptIcon('advisory')} size={18} />
        </span>
        <div>
          <h3 className="font-empire text-empire-gold text-sm tracking-widest uppercase">Board of Advisors</h3>
          <p className="text-empire-text-muted text-xs mt-0.5">Strategic network, advisory equity & vesting, session cadence and the warm-intro pipeline — all derived from the live advisory book.</p>
        </div>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} accent={ACCENT} />
      {tab === 'overview' && <Overview />}
      {tab === 'network' && <Network />}
      {tab === 'intros' && <Intros />}
      {tab === 'advisors' && <Advisors />}
    </div>
  )
}

/* ---------------- Overview ---------------- */
type Summary = {
  totalAdvisors: number; activeAdvisors: number; equityGrantedPct: number; equityVestedPct: number
  committedHours: number; sessions90: number; avgValueRating: number
  introsConverted: number; introConversion: number; pipelineValue: number
  trend: number[]; trendLabels: string[]
}
function Overview() {
  const { data: s, loading } = useAdv<Summary>('summary')
  const { data: net } = useAdv<NetworkData>('network')
  if (loading) return <Loading />
  if (!s) return <EmptyState icon="compass" title="No advisory data" hint="Seed the advisory dataset to populate the board." />
  const expertiseSegments = (net?.byExpertise || []).map(x => ({
    label: x.expertise, value: x.advisors, color: EXPERTISE_COLOR[x.expertise] || '#6b7280',
  }))
  return (
    <div className="space-y-6">
      <Grid cols={5}>
        <KpiCard icon="people" label="Active Advisors" value={String(s.activeAdvisors)} sub={`${s.totalAdvisors} total`} accent={ACCENT} />
        <KpiCard icon="coins" label="Equity Granted" value={`${s.equityGrantedPct}%`} sub={`${s.equityVestedPct}% vested`} accent="#22c55e" />
        <KpiCard icon="clock" label="Committed Hrs/mo" value={String(s.committedHours)} sub="across active board" accent="#4f8ff7" />
        <KpiCard icon="star" label="Sessions (90d)" value={String(s.sessions90)} sub={`${s.avgValueRating} avg value`} accent="#8b5cf6" />
        <KpiCard icon="handshake" label="Intro Conversion" value={`${s.introConversion}%`} sub={`${s.introsConverted} converted`} accent={s.introConversion >= 25 ? '#10b981' : '#f59e0b'} />
      </Grid>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Panel icon="chart-line" title="Advisory sessions per month">
            <AreaChart series={s.trend} color={ACCENT} height={160} />
            <div className="flex justify-between mt-2 px-1">
              {s.trendLabels.map((l, i) => (
                <span key={i} className="text-empire-text-dim text-[11px]">{l}</span>
              ))}
            </div>
            <div className="text-empire-text-muted text-xs mt-3">
              Open intro pipeline value: <span className="text-empire-text">{formatCurrency(s.pipelineValue)}</span>
            </div>
          </Panel>
        </div>
        <Panel icon="compass" title="Advisors by expertise">
          {expertiseSegments.length ? (
            <div className="flex flex-col items-center gap-3">
              <DonutChart segments={expertiseSegments} size={150} />
              <div className="w-full space-y-1.5">
                {expertiseSegments.map(seg => (
                  <div key={seg.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color }} /><span className="text-empire-text-muted">{seg.label}</span></div>
                    <span className="text-empire-text">{seg.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyState icon="compass" title="No expertise data" />}
        </Panel>
      </div>
    </div>
  )
}

/* ---------------- Network ---------------- */
type ExpertiseRow = { expertise: string; advisors: number; equityPct: number; hours: number }
type TierRow = { tier: string; advisors: number; equityPct: number; hours: number }
type TypeRow = { type: string; count: number; avgRating: number }
type NetworkData = { byExpertise: ExpertiseRow[]; byTier: TierRow[]; byType: TypeRow[] }
function Network() {
  const { data, loading } = useAdv<NetworkData>('network')
  if (loading) return <Loading />
  if (!data) return <EmptyState icon="compass" title="No network data" />
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel icon="compass" title="Advisors by expertise">
          <BarChart data={data.byExpertise.map(x => x.advisors)} labels={data.byExpertise.map(x => x.expertise)} color={ACCENT} height={160} />
          <div className="space-y-1.5 mt-3">
            {data.byExpertise.map(x => (
              <div key={x.expertise} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: EXPERTISE_COLOR[x.expertise] || '#6b7280' }} /><span className="text-empire-text-muted">{x.expertise}</span></div>
                <span className="text-empire-text">{x.advisors} · {x.equityPct}% · {x.hours}h/mo</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel icon="medal" title="Advisors by tier">
          <BarChart data={data.byTier.map(t => t.advisors)} labels={data.byTier.map(t => t.tier)} color="#4f8ff7" height={160} />
          <div className="space-y-1.5 mt-3">
            {data.byTier.map(t => (
              <div key={t.tier} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><Pill text={t.tier} color={TIER_COLOR[t.tier] || '#6b7280'} /></div>
                <span className="text-empire-text">{t.advisors} advisors · {t.equityPct}% equity</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel icon="calendar" title="Sessions by type">
        <BarChart data={data.byType.map(t => t.count)} labels={data.byType.map(t => t.type)} color="#8b5cf6" height={150} />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          {data.byType.map(t => (
            <div key={t.type} className="border border-empire-border rounded p-2.5 transition-colors hover:border-empire-gold/40">
              <div className="text-empire-text-dim text-[11px] capitalize">{t.type}</div>
              <div className="text-empire-text font-empire text-lg">{t.count}</div>
              <div className="flex items-center gap-1 text-[11px]" style={{ color: ACCENT }}><EmpireIcon name="star" size={11} />{t.avgRating} avg</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

/* ---------------- Intros ---------------- */
type FunnelStage = { status: string; count: number; value: number }
type IntroRow = { id: string; advisor: string; target: string; purpose: string; status: string; potentialValueEur: number | null; requestedAt: string; madeAt: string | null }
type IntrosData = { funnel: FunnelStage[]; converted: number; conversion: number; pipelineValue: number; total: number; recent: IntroRow[] }
function Intros() {
  const { data, loading } = useAdv<IntrosData>('intros')
  if (loading) return <Loading />
  if (!data) return <EmptyState icon="handshake" title="No intros yet" />
  const stageCount = (s: string) => data.funnel.find(f => f.status === s)?.count ?? 0
  const cols: Column<IntroRow>[] = [
    { key: 'target', label: 'Target', render: i => <div><div className="font-medium text-empire-text text-sm">{i.target}</div><div className="text-empire-text-dim text-[11px]">via {i.advisor}</div></div> },
    { key: 'purpose', label: 'Purpose', render: i => <span className="text-empire-text-muted text-xs capitalize">{i.purpose}</span> },
    { key: 'status', label: 'Status', render: i => <Pill text={i.status} color={INTRO_COLOR[i.status] || '#6b7280'} /> },
    { key: 'potentialValueEur', label: 'Potential', align: 'right', render: i => <span className="text-empire-text">{i.potentialValueEur ? formatCurrency(i.potentialValueEur) : '—'}</span> },
  ]
  return (
    <div className="space-y-4">
      <Grid cols={5}>
        <KpiCard icon="megaphone" label="Requested" value={String(stageCount('requested'))} accent={INTRO_COLOR.requested} />
        <KpiCard icon="handshake" label="Made" value={String(stageCount('made'))} accent={INTRO_COLOR.made} />
        <KpiCard icon="check" label="Responded" value={String(stageCount('responded'))} accent={INTRO_COLOR.responded} />
        <KpiCard icon="trophy" label="Converted" value={String(stageCount('converted'))} sub={`${data.conversion}% conv`} accent={INTRO_COLOR.converted} />
        <KpiCard icon="coins" label="Pipeline Value" value={formatCurrency(data.pipelineValue)} sub={`${data.total} intros`} accent={ACCENT} />
      </Grid>
      <Panel icon="chart-bar" title="Warm-intro funnel">
        <BarChart data={data.funnel.map(f => f.count)} labels={data.funnel.map(f => f.status)} color={ACCENT} height={140} />
      </Panel>
      <Panel icon="clock" title="Recent intros">
        <DataTable columns={cols} rows={data.recent} empty="No intros." />
      </Panel>
    </div>
  )
}

/* ---------------- Advisors (paginated + add) ---------------- */
type Advisor = { id: string; name: string; expertise: string; firm: string | null; tier: string; status: string; equityPct: number; monthlyHours: number; sessionCount: number; openIntros: number }
type Page<T> = { data: T[]; page: number; pageSize: number; total: number; totalPages: number }
function Advisors() {
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const { data, loading, reload } = useAdv<Page<Advisor>>(`advisors?pageSize=15&page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}${status ? `&status=${status}` : ''}`)
  const [form, setForm] = useState({ name: '', firm: '', expertise: 'GTM', tier: 'specialist', status: 'active', equityPct: '' })
  const [busy, setBusy] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [viewing, setViewing] = useState<Advisor | null>(null)
  const [editing, setEditing] = useState<Advisor | null>(null)
  async function submit() {
    if (!form.name) return
    setBusy(true)
    await post('/api/advisory/advisors', form).catch(() => {})
    setBusy(false); setForm({ name: '', firm: '', expertise: 'GTM', tier: 'specialist', status: 'active', equityPct: '' }); setShowNew(false); setPage(0); reload()
  }
  async function remove(id: string) { await del(`/api/advisory/advisors/${id}`).catch(() => {}); reload() }
  if (loading) return <Loading />
  const rows = data?.data || []
  const cols: Column<Advisor>[] = [
    { key: 'name', label: 'Advisor', render: a => <div><div className="font-medium text-empire-text">{a.name}</div><div className="text-empire-text-dim text-[11px]">{a.firm || '—'}</div></div> },
    { key: 'expertise', label: 'Expertise', render: a => <Pill text={a.expertise} color={EXPERTISE_COLOR[a.expertise] || '#6b7280'} /> },
    { key: 'tier', label: 'Tier', render: a => <Pill text={a.tier} color={TIER_COLOR[a.tier] || '#6b7280'} /> },
    { key: 'status', label: 'Status', render: a => <Pill text={a.status} color={STATUS_COLOR[a.status] || '#6b7280'} /> },
    { key: 'equityPct', label: 'Equity', align: 'right', render: a => <span className="text-empire-text">{a.equityPct}%</span> },
    { key: 'monthlyHours', label: 'Hrs/mo', align: 'right', render: a => <span className="text-empire-text-muted">{a.monthlyHours}</span> },
    { key: 'sessionCount', label: 'Sessions', align: 'right', render: a => <span className="text-empire-text-muted">{a.sessionCount}</span> },
    { key: 'openIntros', label: 'Open Intros', align: 'right', render: a => <span style={{ color: a.openIntros ? ACCENT : undefined }} className={a.openIntros ? '' : 'text-empire-text-dim'}>{a.openIntros}</span> },
    { key: 'id', label: '', align: 'right', render: a => (
      <RowActions
        onView={() => setViewing(a)}
        onEdit={() => setEditing(a)}
        onDelete={() => remove(a.id)}
        deleteLabel={`advisor “${a.name}”`}
      />
    ) },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input className={`${inputCls} w-56`} placeholder="Search advisors…" value={q} onChange={e => { setQ(e.target.value); setPage(0) }} />
        <select className={inputCls} value={status} onChange={e => { setStatus(e.target.value); setPage(0) }}>
          <option value="">All statuses</option><option value="active">active</option><option value="onboarding">onboarding</option><option value="inactive">inactive</option><option value="alumni">alumni</option>
        </select>
        <button onClick={() => setShowNew(v => !v)} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white" style={{ background: ACCENT }}><EmpireIcon name={showNew ? 'close' : 'plus'} size={13} />{showNew ? 'Close' : 'Add Advisor'}</button>
      </div>
      {showNew && (
        <Panel icon="plus" title="New advisor">
          <div className="flex flex-wrap gap-2 items-end">
            <input className={`${inputCls} w-48`} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className={`${inputCls} w-48`} placeholder="Company / firm" value={form.firm} onChange={e => setForm({ ...form, firm: e.target.value })} />
            <select className={inputCls} value={form.expertise} onChange={e => setForm({ ...form, expertise: e.target.value })}><option value="GTM">GTM</option><option value="Finance">Finance</option><option value="Product">Product</option><option value="Legal">Legal</option><option value="Technical">Technical</option><option value="Industry">Industry</option></select>
            <select className={inputCls} value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })}><option value="strategic">strategic</option><option value="specialist">specialist</option><option value="operational">operational</option></select>
            <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="active">active</option><option value="onboarding">onboarding</option><option value="inactive">inactive</option><option value="alumni">alumni</option></select>
            <input className={`${inputCls} w-24`} placeholder="equity %" value={form.equityPct} onChange={e => setForm({ ...form, equityPct: e.target.value })} />
            <button disabled={busy || !form.name} onClick={submit} className="px-3 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Create'}</button>
          </div>
        </Panel>
      )}
      <Panel icon="people" title={`Advisors (${data?.total ?? rows.length})`}>
        <DataTable columns={cols} rows={rows} empty="No advisors." />
        {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
      </Panel>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Advisor" icon={<EmpireIcon name="people" size={18} />}>
        {viewing && (
          <div className="space-y-3">
            <div className="font-empire text-empire-text text-lg">{viewing.name}</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <AdvDetail label="Firm">{viewing.firm || '—'}</AdvDetail>
              <AdvDetail label="Expertise"><Pill text={viewing.expertise} color={EXPERTISE_COLOR[viewing.expertise] || '#6b7280'} /></AdvDetail>
              <AdvDetail label="Tier"><Pill text={viewing.tier} color={TIER_COLOR[viewing.tier] || '#6b7280'} /></AdvDetail>
              <AdvDetail label="Status"><Pill text={viewing.status} color={STATUS_COLOR[viewing.status] || '#6b7280'} /></AdvDetail>
              <AdvDetail label="Equity">{viewing.equityPct}%</AdvDetail>
              <AdvDetail label="Hours / mo">{viewing.monthlyHours}</AdvDetail>
              <AdvDetail label="Sessions">{viewing.sessionCount}</AdvDetail>
              <AdvDetail label="Open Intros">{viewing.openIntros}</AdvDetail>
            </div>
          </div>
        )}
      </Modal>

      {editing && (
        <AdvisorEditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload() }}
        />
      )}
    </div>
  )
}

function AdvDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-empire-text-dim mb-0.5">{label}</div>
      <div className="text-empire-text">{children}</div>
    </div>
  )
}

function AdvisorEditModal({ row, onClose, onSaved }: { row: Advisor; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: row.name, firm: row.firm ?? '', expertise: row.expertise, tier: row.tier,
    status: row.status, equityPct: String(row.equityPct), monthlyHours: String(row.monthlyHours),
  })
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!f.name) return
    setBusy(true)
    await patch(`/api/advisory/advisors/${row.id}`, {
      name: f.name, firm: f.firm, expertise: f.expertise, tier: f.tier, status: f.status,
      equityPct: Number(f.equityPct) || 0, monthlyHours: Number(f.monthlyHours) || 0,
    }).catch(() => {})
    setBusy(false); onSaved()
  }
  return (
    <Modal open onClose={onClose} title="Edit advisor" icon={<EmpireIcon name="pen" size={18} />}>
      <div className="space-y-3">
        <input className={`${inputCls} w-full`} placeholder="Name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <input className={`${inputCls} w-full`} placeholder="Company / firm" value={f.firm} onChange={e => setF({ ...f, firm: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <select className={inputCls} value={f.expertise} onChange={e => setF({ ...f, expertise: e.target.value })}><option value="GTM">GTM</option><option value="Finance">Finance</option><option value="Product">Product</option><option value="Legal">Legal</option><option value="Technical">Technical</option><option value="Industry">Industry</option></select>
          <select className={inputCls} value={f.tier} onChange={e => setF({ ...f, tier: e.target.value })}><option value="strategic">strategic</option><option value="specialist">specialist</option><option value="operational">operational</option></select>
          <select className={inputCls} value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="active">active</option><option value="onboarding">onboarding</option><option value="inactive">inactive</option><option value="alumni">alumni</option></select>
          <input className={inputCls} type="number" placeholder="Equity %" value={f.equityPct} onChange={e => setF({ ...f, equityPct: e.target.value })} />
          <input className={inputCls} type="number" placeholder="Hours / mo" value={f.monthlyHours} onChange={e => setF({ ...f, monthlyHours: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy || !f.name} className="px-4 py-2 rounded text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </Modal>
  )
}
