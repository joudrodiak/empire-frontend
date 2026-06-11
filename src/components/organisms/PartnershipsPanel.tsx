'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetcher, post, patch, del } from '@/lib/api'
import { KpiCard, Panel, BarChart, DataTable, TabBar, Grid, EmptyState, type Column } from '@/lib/ui'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { EntityFormModal, type FieldDef } from '@/components/molecules/EntityFormModal'
import { useStickyTab } from '@/lib/use-sticky-tab'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'
import { AffixInput } from '@/components/molecules/AffixInput'

type Page<T> = { data: T[]; page: number; pageSize: number; total: number; totalPages: number }

// Partnerships — channel & alliances surface backed by the partner book and
// co-sell pipeline (/api/partnerships/*). Sourced/influenced ARR, weighted
// forecast, win-rate, tier economics and fee liability all derive server-side.

const ACCENT = '#C9A233'
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'partners', label: 'Partners' },
  { id: 'pipeline', label: 'Co-Sell' },
  { id: 'tiers', label: 'Tiers' },
]
const TIER_COLOR: Record<string, string> = { platinum: '#C9A233', gold: '#C9A233', silver: '#C9A233', bronze: '#C9A233' }
const TYPE_COLOR: Record<string, string> = { reseller: '#C9A233', technology: '#C9A233', agency: '#C9A233', referral: '#C9A233', oem: '#C9A233' }
const STATUS_COLOR: Record<string, string> = { active: '#C9A233', onboarding: '#C9A233', dormant: '#C9A233', terminated: '#F4EFE3' }
const STAGE_COLOR: Record<string, string> = { registered: '#7A7468', qualified: '#C9A233', proposal: '#C9A233', committed: '#C9A233', closed_won: '#C9A233', closed_lost: '#F4EFE3' }
const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n))
const eur = (n: number) => `€${fmt(n)}`

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap" style={{ color, borderColor: `${color}55`, background: `${color}12` }}>{text}</span>
}

export function PartnershipsPanel() {
  const [tab, setTab] = useStickyTab('partnerships', 'overview')
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid place-items-center w-9 h-9 rounded-lg border border-empire-border bg-empire-elevated/40 text-empire-gold shrink-0">
          <EmpireIcon name={deptIcon('partnerships')} size={18} />
        </span>
        <div>
          <h3 className="font-empire text-empire-gold text-sm tracking-widest uppercase">Channel &amp; Alliances</h3>
          <p className="text-empire-text-muted text-xs mt-0.5">Partner-sourced revenue, co-sell pipeline, tier economics &amp; referral-fee liability — derived from the live partner book.</p>
        </div>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} accent={ACCENT} />
      {tab === 'overview' && <Overview />}
      {tab === 'partners' && <Partners />}
      {tab === 'pipeline' && <PipelineTab />}
      {tab === 'tiers' && <Tiers />}
    </div>
  )
}

function usePtr<T>(path: string): { data: T | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    setLoading(true)
    fetcher(`/api/partnerships/${path}`).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [path])
  useEffect(() => { reload() }, [reload])
  return { data, loading, reload }
}
function Loading() { return <div className="py-16 text-center text-empire-text-dim text-sm animate-pulse">Computing from partner book…</div> }
const inputCls = 'bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/60'

/* ---------------- Overview ---------------- */
type Summary = {
  totalPartners: number; activePartners: number; sourcedArr: number; influencedArr: number; totalChannelArr: number
  openDeals: number; pipelineValue: number; weightedPipeline: number; wonDeals: number; wonValue: number; winRate: number
  feeLiability: number; certifiedReps: number
}
function Overview() {
  const { data: s, loading } = usePtr<Summary>('summary')
  if (loading) return <Loading />
  if (!s) return <EmptyState icon="handshake" title="No partner data" />
  return (
    <div className="space-y-6">
      <Grid cols={6}>
        <KpiCard icon="coins" label="Partner-Sourced ARR" value={eur(s.sourcedArr)} sub={`+${eur(s.influencedArr)} influenced`} accent={ACCENT} />
        <KpiCard icon="chart-line" label="Total Channel ARR" value={eur(s.totalChannelArr)} accent={ACCENT} />
        <KpiCard icon="handshake" label="Active Partners" value={String(s.activePartners)} sub={`${s.totalPartners} total`} accent="#C9A233" />
        <KpiCard icon="flag" label="Co-Sell Pipeline" value={eur(s.pipelineValue)} sub={`${s.openDeals} open`} accent="#C9A233" />
        <KpiCard icon="gauge" label="Weighted Forecast" value={eur(s.weightedPipeline)} accent="#C9A233" />
        <KpiCard icon="trophy" label="Channel Win Rate" value={`${s.winRate}%`} sub={`${s.wonDeals} won`} accent={s.winRate >= 50 ? '#C9A233' : '#C9A233'} />
      </Grid>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel icon="trophy" title="Closed-won (channel)">
          <div className="text-4xl font-empire leading-none tabular-nums" style={{ color: '#C9A233' }}>{eur(s.wonValue)}</div>
          <div className="text-empire-text-muted text-xs mt-2">{s.wonDeals} deals closed via partners</div>
        </Panel>
        <Panel icon="coins" title="Referral-fee liability">
          <div className="text-4xl font-empire leading-none tabular-nums" style={{ color: '#C9A233' }}>{eur(s.feeLiability)}</div>
          <div className="text-empire-text-muted text-xs mt-2">accrued on partner-sourced closed-won</div>
        </Panel>
        <Panel icon="medal" title="Certified reps">
          <div className="text-4xl font-empire leading-none tabular-nums" style={{ color: ACCENT }}>{s.certifiedReps}</div>
          <div className="text-empire-text-muted text-xs mt-2">across the active channel</div>
        </Panel>
      </div>
    </div>
  )
}

/* ---------------- Partners ---------------- */
type Partner = { id: string; name: string; type: string; tier: string; status: string; region: string; sourcedArr: number; influencedArr: number; referralFeePct: number; feeAccrued: number; certifiedReps: number; managerName: string | null; openDeals: number }
const PARTNER_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Partner', full: true },
  { key: 'type', label: 'Type', type: 'select', options: ['reseller', 'technology', 'agency', 'referral', 'oem'].map(v => ({ value: v, label: v })) },
  { key: 'tier', label: 'Tier', type: 'select', options: ['platinum', 'gold', 'silver', 'bronze'].map(v => ({ value: v, label: v })) },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'onboarding', 'dormant', 'terminated'].map(v => ({ value: v, label: v })) },
  { key: 'region', label: 'Region' },
  { key: 'sourcedArr', label: 'Sourced ARR', type: 'number' },
  { key: 'influencedArr', label: 'Influenced ARR', type: 'number' },
  { key: 'referralFeePct', label: 'Referral fee %', type: 'number' },
  { key: 'certifiedReps', label: 'Certified reps', type: 'number' },
  { key: 'managerName', label: 'Manager' },
]
function Partners() {
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [tier, setTier] = useState('')
  const { data, loading, reload } = usePtr<Page<Partner>>(`partners?pageSize=15&page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}${tier ? `&tier=${tier}` : ''}`)
  const [form, setForm] = useState({ name: '', type: 'reseller', tier: 'silver', sourcedArr: '', influencedArr: '', referralFeePct: '15', certifiedReps: '', managerName: '' })
  const [busy, setBusy] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [active, setActive] = useState<{ row: Partner; mode: 'view' | 'edit' } | null>(null)
  async function submit() {
    if (!form.name) return
    setBusy(true)
    await post('/api/partnerships/partners', form).catch(console.error)
    setBusy(false); setForm({ name: '', type: 'reseller', tier: 'silver', sourcedArr: '', influencedArr: '', referralFeePct: '15', certifiedReps: '', managerName: '' }); setShowNew(false); setPage(0); reload()
  }
  async function remove(id: string) { await del(`/api/partnerships/partners/${id}`).catch(console.error); reload() }
  async function saveEdit(p: Record<string, any>) { if (!active) return; await patch(`/api/partnerships/partners/${active.row.id}`, p).catch(console.error); setActive(null); reload() }
  if (loading) return <Loading />
  const rows = data?.data || []
  const cols: Column<Partner>[] = [
    { key: 'name', label: 'Partner', render: p => <div><div className="font-medium text-empire-text">{p.name}</div><div className="text-empire-text-dim text-[11px]">{p.region}{p.managerName ? ` · ${p.managerName}` : ''}</div></div> },
    { key: 'type', label: 'Type', render: p => <Pill text={p.type} color={TYPE_COLOR[p.type] || '#7A7468'} /> },
    { key: 'tier', label: 'Tier', render: p => <Pill text={p.tier} color={TIER_COLOR[p.tier] || '#7A7468'} /> },
    { key: 'status', label: 'Status', render: p => <Pill text={p.status} color={STATUS_COLOR[p.status] || '#7A7468'} /> },
    { key: 'sourcedArr', label: 'Sourced', align: 'right', render: p => <span className="text-empire-text">{eur(p.sourcedArr)}</span> },
    { key: 'feeAccrued', label: 'Fee', align: 'right', render: p => <span style={{ color: '#C9A233' }}>{eur(p.feeAccrued)}</span> },
    { key: 'certifiedReps', label: 'Reps', align: 'right', render: p => <span className="text-empire-text-muted">{p.certifiedReps}</span> },
    { key: 'id', label: '', align: 'right', render: p => <div className="flex justify-end"><RowActions onView={() => setActive({ row: p, mode: 'view' })} onEdit={() => setActive({ row: p, mode: 'edit' })} onDelete={() => remove(p.id)} deleteLabel={p.name} /></div> },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input className={`${inputCls} w-56`} placeholder="Search partners…" value={q} onChange={e => { setQ(e.target.value); setPage(0) }} />
        <select className={inputCls} value={tier} onChange={e => { setTier(e.target.value); setPage(0) }}>
          <option value="">All tiers</option><option value="platinum">platinum</option><option value="gold">gold</option><option value="silver">silver</option><option value="bronze">bronze</option>
        </select>
        <button onClick={() => setShowNew(v => !v)} className="ml-auto px-3 py-1.5 rounded text-sm font-medium text-white" style={{ background: ACCENT }}>{showNew ? 'Close' : '+ New Partner'}</button>
      </div>
      {showNew && (
        <Panel title="New partner">
          <div className="flex flex-wrap gap-2 items-end">
            <input className={`${inputCls} w-48`} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="reseller">reseller</option><option value="technology">technology</option><option value="agency">agency</option><option value="referral">referral</option><option value="oem">oem</option></select>
            <select className={inputCls} value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })}><option value="platinum">platinum</option><option value="gold">gold</option><option value="silver">silver</option><option value="bronze">bronze</option></select>
            <AffixInput money className={`${inputCls} w-28`} placeholder="sourced ARR" value={form.sourcedArr} onChange={e => setForm({ ...form, sourcedArr: e.target.value })} />
            <AffixInput money className={`${inputCls} w-28`} placeholder="influenced" value={form.influencedArr} onChange={e => setForm({ ...form, influencedArr: e.target.value })} />
            <AffixInput pct className={`${inputCls} w-20`} placeholder="fee %" value={form.referralFeePct} onChange={e => setForm({ ...form, referralFeePct: e.target.value })} />
            <input className={`${inputCls} w-20`} placeholder="reps" value={form.certifiedReps} onChange={e => setForm({ ...form, certifiedReps: e.target.value })} />
            <input className={`${inputCls} w-36`} placeholder="manager" value={form.managerName} onChange={e => setForm({ ...form, managerName: e.target.value })} />
            <button disabled={busy || !form.name} onClick={submit} className="px-3 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Create'}</button>
          </div>
        </Panel>
      )}
      <Panel icon="partnerships" title={`Partners (${data?.total ?? rows.length})`}>
        <DataTable columns={cols} rows={rows} empty="No partners." />
        {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
      </Panel>
      <EntityFormModal
        open={!!active}
        mode={active?.mode ?? 'view'}
        title={active ? `${active.mode === 'edit' ? 'Edit' : 'View'} partner — ${active.row.name}` : ''}
        icon="partnerships"
        accent={ACCENT}
        entity={active?.row ?? null}
        fields={PARTNER_FIELDS}
        onClose={() => setActive(null)}
        onSave={saveEdit}
      />
    </div>
  )
}

/* ---------------- Co-Sell pipeline ---------------- */
type FunnelStage = { stage: string; count: number; value: number; weighted: number }
type TopDeal = { id: string; name: string; customer: string; partner: string; stage: string; amount: number; probability: number; motion: string; closeDate: string | null }
type PipelineData = { funnel: FunnelStage[]; top: TopDeal[] }
// Full co-sell deal record from /api/partnerships/deals (paginated CRUD).
type CoSellDeal = { id: string; name: string; customer: string; stage: string; amount: number; probability: number; motion: string; partner: string; tier: string; weighted: number; closeDate: string | null; ownerName: string | null }
type UnitMember = { id: string; name: string; role: string }
const BASE_DEAL_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Deal', full: true },
  { key: 'customer', label: 'Customer' },
  { key: 'stage', label: 'Stage', type: 'select', options: ['registered', 'qualified', 'proposal', 'committed', 'closed_won', 'closed_lost'].map(v => ({ value: v, label: v.replace('_', ' ') })) },
  { key: 'motion', label: 'Motion', type: 'select', options: ['partner_sourced', 'partner_influenced', 'co_sell'].map(v => ({ value: v, label: v.replace(/_/g, ' ') })) },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'probability', label: 'Probability %', type: 'number' },
  { key: 'closeDate', label: 'Close date', type: 'date' },
  { key: 'partner', label: 'Partner', readOnly: true },
]
function PipelineTab() {
  const { data, loading } = usePtr<PipelineData>('pipeline')
  if (loading) return <Loading />
  if (!data) return <EmptyState icon="chart-bar" title="No pipeline" />
  const totalOpen = data.funnel.reduce((s, f) => s + f.value, 0)
  const cols: Column<TopDeal>[] = [
    { key: 'name', label: 'Deal', render: d => <div><div className="font-medium text-empire-text text-sm">{d.customer}</div><div className="text-empire-text-dim text-[11px]">via {d.partner}</div></div> },
    { key: 'stage', label: 'Stage', render: d => <Pill text={d.stage.replace('_', ' ')} color={STAGE_COLOR[d.stage] || '#7A7468'} /> },
    { key: 'motion', label: 'Motion', render: d => <span className="text-empire-text-muted text-xs">{d.motion.replace('_', ' ')}</span> },
    { key: 'amount', label: 'Amount', align: 'right', render: d => <span className="text-empire-text">{eur(d.amount)}</span> },
    { key: 'probability', label: 'P', align: 'right', render: d => <span className="text-empire-text-muted">{d.probability}%</span> },
  ]
  return (
    <div className="space-y-4">
      <Panel icon="gauge" title="Co-sell funnel by stage">
        <BarChart data={data.funnel.map(f => f.value)} labels={data.funnel.map(f => f.stage)} color={ACCENT} height={150} />
        <div className="grid grid-cols-4 gap-3 mt-4">
          {data.funnel.map(f => (
            <div key={f.stage} className="border border-empire-border rounded-lg p-2.5 transition-all hover:-translate-y-0.5 hover:border-empire-gold/40">
              <div className="text-empire-text-dim text-[10px] uppercase tracking-[0.16em] capitalize">{f.stage}</div>
              <div className="text-empire-text font-empire text-xl leading-none mt-1 tabular-nums">{eur(f.value)}</div>
              <div className="text-[11px] mt-1.5 font-data" style={{ color: ACCENT }}>{f.count} deals · {eur(f.weighted)} wtd</div>
            </div>
          ))}
        </div>
        <div className="text-empire-text-muted text-xs mt-3">Open pipeline total: <span className="text-empire-text">{eur(totalOpen)}</span></div>
      </Panel>
      <Panel icon="trophy" title="Top weighted deals">
        <DataTable columns={cols} rows={data.top} empty="No open deals." />
      </Panel>
      <CoSellDeals />
    </div>
  )
}

/* Full co-sell deal register — paginated list with view / edit / delete. */
function CoSellDeals() {
  const [page, setPage] = useState(0)
  const [stage, setStage] = useState('')
  const { data, loading, reload } = usePtr<Page<CoSellDeal>>(`deals?pageSize=15&page=${page + 1}${stage ? `&stage=${stage}` : ''}`)
  const [active, setActive] = useState<{ row: CoSellDeal; mode: 'view' | 'edit' } | null>(null)
  const [creating, setCreating] = useState(false)
  const [members, setMembers] = useState<UnitMember[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  useEffect(() => {
    fetcher('/api/employees?department=partnerships').then((rows: UnitMember[]) => setMembers(Array.isArray(rows) ? rows : [])).catch(() => setMembers([]))
    fetcher('/api/partnerships/partners?pageSize=100').then(r => setPartners(r?.data || [])).catch(() => setPartners([]))
  }, [])
  async function remove(id: string) { await del(`/api/partnerships/deals/${id}`).catch(console.error); reload() }
  async function saveEdit(p: Record<string, any>) { if (!active) return; await patch(`/api/partnerships/deals/${active.row.id}`, p).catch(console.error); setActive(null); reload() }
  async function saveCreate(p: Record<string, any>) { await post('/api/partnerships/deals', p).catch(console.error); setCreating(false); setPage(0); reload() }
  const dealFields: FieldDef[] = [
    ...BASE_DEAL_FIELDS.slice(0, 6),
    members.length
      ? { key: 'ownerName', label: 'Partnerships member', type: 'select', options: [{ value: '', label: 'Unassigned' }, ...members.map(m => ({ value: m.name, label: `${m.name} · ${m.role}` }))] }
      : { key: 'ownerName', label: 'Partnerships member' },
    ...BASE_DEAL_FIELDS.slice(6),
  ]
  const createFields: FieldDef[] = [
    { key: 'partnerId', label: 'Partner', type: 'select', options: [{ value: '', label: 'Select partner...' }, ...partners.map(p => ({ value: p.id, label: p.name }))] },
    ...dealFields.filter(f => f.key !== 'partner' && f.key !== 'tier' && f.key !== 'weighted'),
  ]
  const blankDeal = {
    partnerId: partners[0]?.id || '',
    name: '',
    customer: '',
    stage: 'registered',
    amount: 0,
    probability: 20,
    motion: 'partner_sourced',
    ownerName: members[0]?.name || '',
    closeDate: '',
  }
  const rows = data?.data || []
  const cols: Column<CoSellDeal>[] = [
    { key: 'name', label: 'Deal', render: d => <div><div className="font-medium text-empire-text text-sm">{d.name}</div><div className="text-empire-text-dim text-[11px]">{d.customer || '—'} · via {d.partner}</div></div> },
    { key: 'stage', label: 'Stage', render: d => <Pill text={d.stage.replace('_', ' ')} color={STAGE_COLOR[d.stage] || '#7A7468'} /> },
    { key: 'amount', label: 'Amount', align: 'right', render: d => <span className="text-empire-text">{eur(d.amount)}</span> },
    { key: 'probability', label: 'P', align: 'right', render: d => <span className="text-empire-text-muted">{d.probability}%</span> },
    { key: 'weighted', label: 'Weighted', align: 'right', render: d => <span style={{ color: ACCENT }}>{eur(d.weighted)}</span> },
    { key: 'id', label: '', align: 'right', render: d => <div className="flex justify-end"><RowActions onView={() => setActive({ row: d, mode: 'view' })} onEdit={() => setActive({ row: d, mode: 'edit' })} onDelete={() => remove(d.id)} deleteLabel={d.name} /></div> },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select className={inputCls} value={stage} onChange={e => { setStage(e.target.value); setPage(0) }}>
          <option value="">All stages</option>
          {['registered', 'qualified', 'proposal', 'committed', 'closed_won', 'closed_lost'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <button onClick={() => setCreating(true)} className="ml-auto inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-white" style={{ background: ACCENT }}><EmpireIcon name="plus" size={13} />New deal</button>
      </div>
      <Panel icon="flag" title={`Co-sell deals (${data?.total ?? rows.length})`}>
        {loading ? <Loading /> : <DataTable columns={cols} rows={rows} empty="No co-sell deals." />}
        {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
      </Panel>
      <EntityFormModal
        open={!!active}
        mode={active?.mode ?? 'view'}
        title={active ? `${active.mode === 'edit' ? 'Edit' : 'View'} deal — ${active.row.name}` : ''}
        icon="flag"
        accent={ACCENT}
        entity={active?.row ?? null}
        fields={dealFields}
        onClose={() => setActive(null)}
        onSave={saveEdit}
      />
      <EntityFormModal
        open={creating}
        mode="edit"
        title="New co-sell deal"
        icon="plus"
        accent={ACCENT}
        entity={creating ? blankDeal : null}
        fields={createFields}
        onClose={() => setCreating(false)}
        onSave={saveCreate}
      />
    </div>
  )
}

/* ---------------- Tiers ---------------- */
type TierRow = { tier: string; partners: number; sourcedArr: number; avgSourced: number; certifiedReps: number }
type TypeRow = { type: string; partners: number; sourcedArr: number }
type TiersData = { tiers: TierRow[]; byType: TypeRow[] }
function Tiers() {
  const { data, loading } = usePtr<TiersData>('tiers')
  if (loading) return <Loading />
  if (!data) return <EmptyState icon="medal" title="No tier data" />
  const tierCols: Column<TierRow>[] = [
    { key: 'tier', label: 'Tier', render: t => <Pill text={t.tier} color={TIER_COLOR[t.tier] || '#7A7468'} /> },
    { key: 'partners', label: 'Partners', align: 'right', render: t => <span className="text-empire-text">{t.partners}</span> },
    { key: 'sourcedArr', label: 'Sourced ARR', align: 'right', render: t => <span className="text-empire-text">{eur(t.sourcedArr)}</span> },
    { key: 'avgSourced', label: 'Avg/Partner', align: 'right', render: t => <span className="text-empire-text-muted">{eur(t.avgSourced)}</span> },
    { key: 'certifiedReps', label: 'Reps', align: 'right', render: t => <span className="text-empire-text-muted">{t.certifiedReps}</span> },
  ]
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel icon="medal" title="Economics by tier">
        <DataTable columns={tierCols} rows={data.tiers} empty="No tiers." />
      </Panel>
      <Panel icon="chart-bar" title="Sourced ARR by partner type">
        <BarChart data={data.byType.map(t => t.sourcedArr)} labels={data.byType.map(t => t.type)} color={ACCENT} height={160} />
        <div className="space-y-1.5 mt-3">
          {data.byType.map(t => (
            <div key={t.type} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLOR[t.type] || '#7A7468' }} /><span className="text-empire-text-muted capitalize">{t.type}</span></div>
              <span className="text-empire-text">{t.partners} · {eur(t.sourcedArr)}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
