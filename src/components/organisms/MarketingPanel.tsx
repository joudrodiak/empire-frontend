'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { fetcher, post, patch, del } from '@/lib/api'
import { KpiCard, Panel, AreaChart, BarChart, DataTable, TabBar, Grid, EmptyState, type Column } from '@/lib/ui'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { Modal } from '@/components/molecules/Modal'
import { useStickyTab } from '@/lib/use-sticky-tab'
import { EmpireIcon, asIconName } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'

// Small read-only key/value row for view modals.
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-empire-border/40 py-1.5 last:border-0">
      <span className="text-[11px] uppercase tracking-wide text-empire-text-dim">{label}</span>
      <span className="text-sm text-empire-text text-right">{children}</span>
    </div>
  )
}
const modalInput = 'w-full bg-empire-bg border border-empire-border rounded px-2.5 py-1.5 text-sm text-empire-text focus:outline-none focus:border-empire-gold/60'

type Page<T> = { data: T[]; page: number; pageSize: number; total: number; totalPages: number }

// Marketing & Growth — AARRR surface backed by real campaigns, funnel snapshots
// and the lead pipeline (/api/marketing/*). CAC, ROAS, CPL, channel ROI and
// stage conversion are all derived server-side — nothing is hard-coded.

const ACCENT = '#10b981'
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'funnel', label: 'AARRR Funnel' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'channels', label: 'Channels' },
  { id: 'leads', label: 'Pipeline' },
  { id: 'accounts', label: 'Social Accounts' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'influencers', label: 'Influencers' },
]

const CHANNEL_COLOR: Record<string, string> = {
  paid_search: '#4f8ff7', seo: '#10b981', paid_social: '#a855f7', content: '#f59e0b',
  email: '#ec4899', events: '#06b6d4', referral: '#3DAF75', pr: '#6b7280',
}
const STAGE_COLOR: Record<string, string> = {
  new: '#6b7280', mql: '#4f8ff7', sql: '#06b6d4', opportunity: '#f59e0b', won: '#10b981', lost: '#c94f4f',
}
const STATUS_COLOR: Record<string, string> = { active: '#10b981', planned: '#4f8ff7', paused: '#f59e0b', completed: '#6b7280' }
const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n))
const eur = (n: number) => `€${fmt(n)}`

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap" style={{ color, borderColor: `${color}55`, background: `${color}12` }}>{text}</span>
}

export function MarketingPanel() {
  const [tab, setTab] = useStickyTab('marketing', 'overview')
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid place-items-center w-9 h-9 rounded-lg border border-empire-border bg-empire-elevated/40 text-empire-gold shrink-0">
          <EmpireIcon name={deptIcon('marketing')} size={18} />
        </span>
        <div>
          <h3 className="font-empire text-empire-gold text-sm tracking-widest uppercase">Growth Intelligence</h3>
          <p className="text-empire-text-muted text-xs mt-0.5">AARRR funnel, channel ROI and pipeline — derived from real campaigns, funnel snapshots &amp; leads.</p>
        </div>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} accent={ACCENT} />
      {tab === 'overview' && <Overview />}
      {tab === 'funnel' && <Funnel />}
      {tab === 'campaigns' && <Campaigns />}
      {tab === 'channels' && <Channels />}
      {tab === 'leads' && <Leads />}
      {tab === 'accounts' && <SocialAccounts />}
      {tab === 'intelligence' && <Intelligence />}
      {tab === 'influencers' && <Influencers />}
    </div>
  )
}

function useMkt<T>(path: string): { data: T | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    setLoading(true)
    fetcher(`/api/marketing/${path}`).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [path])
  useEffect(() => { reload() }, [reload])
  return { data, loading, reload }
}
function Loading() { return <div className="py-16 text-center text-empire-text-dim text-sm animate-pulse">Computing from growth data…</div> }
const inputCls = 'bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/60'

/* ---------------- Overview ---------------- */
type Summary = {
  spend: number; revenue: number; conversions: number; leadCount: number; blendedCAC: number; roas: number; cpl: number
  activeCampaigns: number; totalCampaigns: number; pipelineValue: number; winRate: number; openLeads: number
  visitorToPaying: number; trendVisitors: number[]; trendPaying: number[]
}
function Overview() {
  const { data: s, loading } = useMkt<Summary>('summary')
  if (loading) return <Loading />
  if (!s) return <EmptyState icon="chart-line" title="No marketing data" />
  return (
    <div className="space-y-6">
      <Grid cols={6}>
        <KpiCard icon="coins" label="Attributed Revenue" value={eur(s.revenue)} accent={ACCENT} />
        <KpiCard icon="gauge" label="Blended ROAS" value={`${s.roas}×`} sub={`€${fmt(s.spend)} spend`} accent={s.roas >= 4 ? '#10b981' : s.roas >= 2 ? '#f59e0b' : '#c94f4f'} />
        <KpiCard icon="megaphone" label="Blended CAC" value={eur(s.blendedCAC)} sub={`${s.conversions} customers`} accent={ACCENT} />
        <KpiCard icon="user" label="Cost / Lead" value={eur(s.cpl)} sub={`${s.leadCount} leads`} accent={ACCENT} />
        <KpiCard icon="chart-line" label="Pipeline Value" value={eur(s.pipelineValue)} sub={`${s.openLeads} open`} accent={ACCENT} />
        <KpiCard icon="trophy" label="Win Rate" value={`${s.winRate}%`} sub="closed leads" accent={s.winRate >= 40 ? '#10b981' : '#f59e0b'} />
      </Grid>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel icon="chart-line" title="Visitors (6 mo)"><AreaChart series={s.trendVisitors} color={ACCENT} height={200} /></Panel>
        <Panel icon="chart-line" title="Paying Customers (6 mo)"><AreaChart series={s.trendPaying} color="#4f8ff7" height={200} /></Panel>
      </div>
    </div>
  )
}

/* ---------------- AARRR Funnel ---------------- */
type FunnelStage = { stage: string; metric: string; value: number; conv: number }
type FunnelData = { latest: any; stages: FunnelStage[]; history: { periodLabel: string; visitors: number; signups: number; activated: number; retained: number; paying: number; referrals: number }[] }
function Funnel() {
  const { data, loading, reload } = useMkt<FunnelData>('funnel')
  const [form, setForm] = useState({ periodLabel: '', visitors: '', signups: '', activated: '', retained: '', paying: '', referrals: '' })
  const [busy, setBusy] = useState(false)
  async function submit() {
    if (!form.periodLabel) return
    setBusy(true)
    await post('/api/marketing/funnel', form).catch(console.error)
    setBusy(false); setForm({ periodLabel: '', visitors: '', signups: '', activated: '', retained: '', paying: '', referrals: '' }); reload()
  }
  if (loading) return <Loading />
  if (!data || !data.stages.length) return <EmptyState icon="chart-bar" title="No funnel snapshots" hint="Add a period below." />
  const maxV = Math.max(...data.stages.map(s => s.value))
  const STAGE_HUE: Record<string, string> = { Acquisition: '#4f8ff7', Activation: '#10b981', Retention: '#06b6d4', Revenue: '#f59e0b', Referral: '#a855f7' }
  return (
    <div className="space-y-4">
      <Panel icon="gauge" title={`AARRR Funnel — ${data.latest?.periodLabel ?? 'latest'}`}>
        <div className="space-y-2">
          {data.stages.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-28 text-right text-xs text-empire-text-muted">{s.metric}</div>
              <div className="flex-1 bg-empire-bg rounded h-9 relative overflow-hidden border border-empire-border">
                <div className="h-full rounded flex items-center px-3 transition-all" style={{ width: `${Math.max(6, (s.value / maxV) * 100)}%`, background: `${STAGE_HUE[s.stage] || ACCENT}28`, borderRight: `2px solid ${STAGE_HUE[s.stage] || ACCENT}` }}>
                  <span className="text-empire-text text-sm font-medium">{s.value.toLocaleString()}</span>
                </div>
              </div>
              <div className="w-20 text-xs"><Pill text={`${s.conv}%`} color={STAGE_HUE[s.stage] || ACCENT} /></div>
            </div>
          ))}
        </div>
        <p className="text-empire-text-dim text-[11px] mt-3">Each % is step conversion from the stage above. Stages grouped by AARRR phase.</p>
      </Panel>
      <Panel icon="chart-bar" title="Paying-customer trend">
        <BarChart data={data.history.map(h => h.paying)} labels={data.history.map(h => h.periodLabel.split(' ')[0])} color={ACCENT} height={160} />
      </Panel>
      <Panel icon="plus" title="Log a funnel snapshot">
        <div className="flex flex-wrap gap-2 items-end">
          <input className={`${inputCls} w-32`} placeholder="Period (Jun 2026)" value={form.periodLabel} onChange={e => setForm({ ...form, periodLabel: e.target.value })} />
          {(['visitors', 'signups', 'activated', 'retained', 'paying', 'referrals'] as const).map(k => (
            <input key={k} className={`${inputCls} w-24`} placeholder={k} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
          ))}
          <button disabled={busy || !form.periodLabel} onClick={submit} className="px-3 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Add'}</button>
        </div>
      </Panel>
    </div>
  )
}

/* ---------------- Campaigns ---------------- */
type Camp = { id: string; name: string; channel: string; status: string; objective: string | null; budget: number; spend: number; leads: number; conversions: number; revenue: number; cac: number; roas: number; ctr: number; ownerName: string | null }
function Campaigns() {
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const { data, loading, reload } = useMkt<Page<Camp>>(`campaigns?pageSize=15&page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`)
  const [form, setForm] = useState({ name: '', channel: 'paid_search', budget: '', spend: '', leads: '', conversions: '', revenue: '' })
  const [busy, setBusy] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [viewing, setViewing] = useState<Camp | null>(null)
  const [editing, setEditing] = useState<Camp | null>(null)
  async function submit() {
    if (!form.name) return
    setBusy(true)
    await post('/api/marketing/campaigns', form).catch(console.error)
    setBusy(false); setForm({ name: '', channel: 'paid_search', budget: '', spend: '', leads: '', conversions: '', revenue: '' }); setShowNew(false); setPage(0); reload()
  }
  async function remove(id: string) { await del(`/api/marketing/campaigns/${id}`).catch(console.error); reload() }
  if (loading) return <Loading />
  const rows = data?.data || []
  const cols: Column<Camp>[] = [
    { key: 'name', label: 'Campaign', render: c => <div><div className="font-medium text-empire-text">{c.name}</div>{c.ownerName && <div className="text-empire-text-dim text-[11px]">{c.ownerName}</div>}</div> },
    { key: 'channel', label: 'Channel', render: c => <Pill text={c.channel.replace('_', ' ')} color={CHANNEL_COLOR[c.channel] || '#6b7280'} /> },
    { key: 'status', label: 'Status', render: c => <Pill text={c.status} color={STATUS_COLOR[c.status] || '#6b7280'} /> },
    { key: 'spend', label: 'Spend', align: 'right', render: c => <span className="text-empire-text-muted">{eur(c.spend)}</span> },
    { key: 'revenue', label: 'Revenue', align: 'right', render: c => <span className="text-empire-text">{eur(c.revenue)}</span> },
    { key: 'roas', label: 'ROAS', align: 'right', render: c => <span style={{ color: c.roas >= 4 ? '#10b981' : c.roas >= 2 ? '#f59e0b' : '#c94f4f' }}>{c.roas}×</span> },
    { key: 'cac', label: 'CAC', align: 'right', render: c => <span className="text-empire-text-muted">{c.cac ? eur(c.cac) : '—'}</span> },
    { key: 'actions', label: '', align: 'right', render: c => (
      <RowActions
        onView={() => setViewing(c)}
        onEdit={() => setEditing(c)}
        onDelete={() => remove(c.id)}
        deleteLabel={`the “${c.name}” campaign`}
      />
    ) },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input className={`${inputCls} w-64`} placeholder="Search campaigns…" value={q} onChange={e => { setQ(e.target.value); setPage(0) }} />
        <button onClick={() => setShowNew(v => !v)} className="ml-auto px-3 py-1.5 rounded text-sm font-medium text-white" style={{ background: ACCENT }}>{showNew ? 'Close' : '+ New Campaign'}</button>
      </div>
      {showNew && (
        <Panel title="New campaign">
          <div className="flex flex-wrap gap-2 items-end">
            <input className={`${inputCls} w-56`} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select className={inputCls} value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>
              {Object.keys(CHANNEL_COLOR).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {(['budget', 'spend', 'leads', 'conversions', 'revenue'] as const).map(k => (
              <input key={k} className={`${inputCls} w-24`} placeholder={k} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
            ))}
            <button disabled={busy || !form.name} onClick={submit} className="px-3 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Create'}</button>
          </div>
        </Panel>
      )}
      <Panel title={`Campaigns (${data?.total ?? rows.length})`}>
        <DataTable columns={cols} rows={rows} empty="No campaigns." />
        {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
      </Panel>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || 'Campaign'} icon={<EmpireIcon name="megaphone" size={18} />}>
        {viewing && (
          <div className="space-y-0.5">
            <Field label="Channel"><Pill text={viewing.channel.replace('_', ' ')} color={CHANNEL_COLOR[viewing.channel] || '#6b7280'} /></Field>
            <Field label="Status"><Pill text={viewing.status} color={STATUS_COLOR[viewing.status] || '#6b7280'} /></Field>
            <Field label="Objective">{viewing.objective || '—'}</Field>
            <Field label="Owner">{viewing.ownerName || '—'}</Field>
            <Field label="Budget">{eur(viewing.budget)}</Field>
            <Field label="Spend">{eur(viewing.spend)}</Field>
            <Field label="Leads">{viewing.leads}</Field>
            <Field label="Conversions">{viewing.conversions}</Field>
            <Field label="Revenue">{eur(viewing.revenue)}</Field>
            <Field label="ROAS">{viewing.roas}×</Field>
            <Field label="CAC">{viewing.cac ? eur(viewing.cac) : '—'}</Field>
            <Field label="CTR">{viewing.ctr}%</Field>
          </div>
        )}
      </Modal>

      <CampaignEdit campaign={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />
    </div>
  )
}

function CampaignEdit({ campaign, onClose, onSaved }: { campaign: Camp | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Record<string, any>>({})
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (campaign) setF({ name: campaign.name, channel: campaign.channel, status: campaign.status, ownerName: campaign.ownerName ?? '', budget: campaign.budget, spend: campaign.spend, leads: campaign.leads, conversions: campaign.conversions, revenue: campaign.revenue })
  }, [campaign])
  async function save() {
    if (!campaign) return
    setBusy(true)
    await patch(`/api/marketing/campaigns/${campaign.id}`, f).catch(console.error)
    setBusy(false); onSaved()
  }
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }))
  return (
    <Modal open={!!campaign} onClose={onClose} title="Edit campaign" icon={<EmpireIcon name="pen" size={18} />}>
      <div className="space-y-3">
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Name</span>
          <input className={modalInput} value={f.name ?? ''} onChange={e => set('name', e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Channel</span>
            <select className={modalInput} value={f.channel ?? ''} onChange={e => set('channel', e.target.value)}>
              {Object.keys(CHANNEL_COLOR).map(c => <option key={c} value={c}>{c}</option>)}
            </select></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Status</span>
            <select className={modalInput} value={f.status ?? ''} onChange={e => set('status', e.target.value)}>
              {Object.keys(STATUS_COLOR).map(s => <option key={s} value={s}>{s}</option>)}
            </select></label>
        </div>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Owner</span>
          <input className={modalInput} value={f.ownerName ?? ''} onChange={e => set('ownerName', e.target.value)} /></label>
        <div className="grid grid-cols-3 gap-3">
          {(['budget', 'spend', 'leads', 'conversions', 'revenue'] as const).map(k => (
            <label key={k} className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted capitalize">{k}</span>
              <input type="number" className={modalInput} value={f[k] ?? ''} onChange={e => set(k, e.target.value)} /></label>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy} className="rounded px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-50" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- Channels ---------------- */
type Chan = { channel: string; campaigns: number; spend: number; revenue: number; leads: number; conversions: number; cac: number; cpl: number; roas: number; ctr: number; cvr: number }
function Channels() {
  const { data, loading } = useMkt<Chan[]>('channels')
  if (loading) return <Loading />
  const rows = data || []
  const cols: Column<Chan>[] = [
    { key: 'channel', label: 'Channel', render: c => <Pill text={c.channel.replace('_', ' ')} color={CHANNEL_COLOR[c.channel] || '#6b7280'} /> },
    { key: 'campaigns', label: 'Camps', align: 'right' },
    { key: 'spend', label: 'Spend', align: 'right', render: c => <span className="text-empire-text-muted">{eur(c.spend)}</span> },
    { key: 'revenue', label: 'Revenue', align: 'right', render: c => <span className="text-empire-text">{eur(c.revenue)}</span> },
    { key: 'leads', label: 'Leads', align: 'right' },
    { key: 'cac', label: 'CAC', align: 'right', render: c => <span className="text-empire-text-muted">{c.cac ? eur(c.cac) : '—'}</span> },
    { key: 'roas', label: 'ROAS', align: 'right', render: c => <span style={{ color: c.roas >= 4 ? '#10b981' : c.roas >= 2 ? '#f59e0b' : '#c94f4f' }}>{c.roas}×</span> },
  ]
  return (
    <div className="space-y-4">
      <Panel icon="coins" title="Revenue by channel">
        <BarChart data={rows.map(r => r.revenue)} labels={rows.map(r => r.channel.replace('_', ' '))} color={ACCENT} height={180} />
      </Panel>
      <Panel icon="chart-bar" title={`Channel ROI (${rows.length})`}>
        <DataTable columns={cols} rows={rows} empty="No channel data." />
      </Panel>
    </div>
  )
}

/* ---------------- Pipeline (Leads) ---------------- */
type Lead = { id: string; name: string; company: string | null; source: string; stage: string; score: number; value: number; ownerName: string | null }
type LeadPage = Page<Lead> & { byStage: { stage: string; count: number; value: number }[] }
const STAGES = ['new', 'mql', 'sql', 'opportunity', 'won', 'lost']
function Leads() {
  const [page, setPage] = useState(0)
  const [stage, setStage] = useState('')
  const { data, loading, reload } = useMkt<LeadPage>(`leads?pageSize=15&page=${page + 1}${stage ? `&stage=${stage}` : ''}`)
  const [viewing, setViewing] = useState<Lead | null>(null)
  const [editing, setEditing] = useState<Lead | null>(null)
  async function move(id: string, s: string) { await patch(`/api/marketing/leads/${id}`, { stage: s }).catch(console.error); reload() }
  async function remove(id: string) { await del(`/api/marketing/leads/${id}`).catch(console.error); reload() }
  if (loading) return <Loading />
  const rows = data?.data || []
  const cols: Column<Lead>[] = [
    { key: 'name', label: 'Lead', render: l => <div><div className="font-medium text-empire-text">{l.name}</div><div className="text-empire-text-dim text-[11px]">{l.company || '—'}</div></div> },
    { key: 'source', label: 'Source', render: l => <Pill text={l.source.replace('_', ' ')} color={CHANNEL_COLOR[l.source] || '#6b7280'} /> },
    { key: 'score', label: 'Score', align: 'right', render: l => <span style={{ color: l.score >= 70 ? '#10b981' : l.score >= 40 ? '#f59e0b' : '#6b7280' }}>{l.score}</span> },
    { key: 'value', label: 'ACV', align: 'right', render: l => <span className="text-empire-text-muted">{l.value ? eur(l.value) : '—'}</span> },
    { key: 'stage', label: 'Stage', align: 'right', render: l => (
      <select value={l.stage} onChange={e => move(l.id, e.target.value)} className="bg-empire-bg-soft border rounded px-1.5 py-1 text-xs" style={{ color: STAGE_COLOR[l.stage], borderColor: `${STAGE_COLOR[l.stage]}55` }}>
        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    ) },
    { key: 'actions', label: '', align: 'right', render: l => (
      <RowActions onView={() => setViewing(l)} onEdit={() => setEditing(l)} onDelete={() => remove(l.id)} deleteLabel={`the lead “${l.name}”`} />
    ) },
  ]
  return (
    <div className="space-y-4">
      <Grid cols={6}>
        {(data?.byStage || []).map(s => (
          <button key={s.stage} onClick={() => { setStage(stage === s.stage ? '' : s.stage); setPage(0) }}
            className="text-left rounded-lg border p-3 transition-all hover:-translate-y-0.5" style={{ borderColor: stage === s.stage ? STAGE_COLOR[s.stage] : '#2A2A44', background: stage === s.stage ? `${STAGE_COLOR[s.stage]}10` : 'transparent' }}>
            <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: STAGE_COLOR[s.stage] }}>{s.stage}</div>
            <div className="text-empire-text text-2xl font-empire leading-none mt-1 tabular-nums">{s.count}</div>
            <div className="text-empire-text-dim text-[11px] mt-1.5 font-data">{eur(s.value)}</div>
          </button>
        ))}
      </Grid>
      <Panel icon="flag" title={`Lead Pipeline${stage ? ` — ${stage}` : ''} (${data?.total ?? rows.length})`}>
        <DataTable columns={cols} rows={rows} empty="No leads." />
        {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
      </Panel>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || 'Lead'} icon={<EmpireIcon name="user" size={18} />}>
        {viewing && (
          <div className="space-y-0.5">
            <Field label="Name">{viewing.name}</Field>
            <Field label="Company">{viewing.company || '—'}</Field>
            <Field label="Source"><Pill text={viewing.source.replace('_', ' ')} color={CHANNEL_COLOR[viewing.source] || '#6b7280'} /></Field>
            <Field label="Stage"><Pill text={viewing.stage} color={STAGE_COLOR[viewing.stage] || '#6b7280'} /></Field>
            <Field label="Score">{viewing.score}</Field>
            <Field label="ACV">{viewing.value ? eur(viewing.value) : '—'}</Field>
            <Field label="Owner">{viewing.ownerName || '—'}</Field>
          </div>
        )}
      </Modal>
      <LeadEdit lead={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />
    </div>
  )
}

function LeadEdit({ lead, onClose, onSaved }: { lead: Lead | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Record<string, any>>({})
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (lead) setF({ name: lead.name, company: lead.company ?? '', stage: lead.stage, score: lead.score, value: lead.value, ownerName: lead.ownerName ?? '' }) }, [lead])
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }))
  async function save() {
    if (!lead) return
    setBusy(true)
    await patch(`/api/marketing/leads/${lead.id}`, f).catch(console.error)
    setBusy(false); onSaved()
  }
  return (
    <Modal open={!!lead} onClose={onClose} title="Edit lead" icon={<EmpireIcon name="pen" size={18} />}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Name</span>
            <input className={modalInput} value={f.name ?? ''} onChange={e => set('name', e.target.value)} /></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Company</span>
            <input className={modalInput} value={f.company ?? ''} onChange={e => set('company', e.target.value)} /></label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Stage</span>
            <select className={modalInput} value={f.stage ?? ''} onChange={e => set('stage', e.target.value)}>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Score</span>
            <input type="number" className={modalInput} value={f.score ?? ''} onChange={e => set('score', e.target.value)} /></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">ACV</span>
            <input type="number" className={modalInput} value={f.value ?? ''} onChange={e => set('value', e.target.value)} /></label>
        </div>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Owner</span>
          <input className={modalInput} value={f.ownerName ?? ''} onChange={e => set('ownerName', e.target.value)} /></label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy} className="rounded px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-50" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- Influencers ----------------
 * Influencer partnerships are stored as real DeptEntry rows (category
 * 'influencer', marketing unit). Channel-specific detail lives in metadata so we
 * don't need a bespoke table yet — full CRUD via /api/entries. The "sync"
 * columns (reach, results) are entered manually for now; the NOTES block below
 * captures the data-integration approach we still need to decide on. */
type Influencer = {
  id: string; title: string; status: string; description: string | null
  metadata: { handle?: string; platform?: string; platforms?: string[]; followers?: number; engagementRate?: number; dealValue?: number; tier?: string } | null
}
const INF_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'x', 'linkedin', 'twitch', 'newsletter', 'podcast']
const INF_TIERS = ['nano', 'micro', 'mid', 'macro', 'mega']
const INF_STATUS_COLOR: Record<string, string> = { prospect: '#6b7280', negotiating: '#4f8ff7', active: '#10b981', paused: '#f59e0b', ended: '#c94f4f' }
const PLATFORM_COLOR: Record<string, string> = {
  instagram: '#e1306c', tiktok: '#06b6d4', youtube: '#c94f4f', x: '#6b7280',
  linkedin: '#4f8ff7', twitch: '#a855f7', newsletter: '#f59e0b', podcast: '#10b981',
}
const INF_PAGE_SIZE = 8

function Influencers() {
  const [list, setList] = useState<Influencer[] | null>(null)
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [viewing, setViewing] = useState<Influencer | null>(null)
  const [editing, setEditing] = useState<Influencer | null>(null)

  const reload = useCallback(() => {
    fetcher('/api/entries?departmentSlug=marketing&category=influencer')
      .then((rows: Influencer[]) => setList(rows || [])).catch(() => setList([]))
  }, [])
  useEffect(() => { reload() }, [reload])

  async function remove(id: string) { await del(`/api/entries/${id}`).catch(console.error); reload() }

  if (!list) return <Loading />
  const filtered = list.filter(i => {
    if (!q) return true
    const m = i.metadata || {}
    return [i.title, m.handle, m.platform, ...(m.platforms || []), i.status].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase())
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / INF_PAGE_SIZE))
  const rows = filtered.slice(page * INF_PAGE_SIZE, page * INF_PAGE_SIZE + INF_PAGE_SIZE)

  const totalReach = list.reduce((s, i) => s + (Number(i.metadata?.followers) || 0), 0)
  const activeCount = list.filter(i => i.status === 'active').length
  const committed = list.reduce((s, i) => s + (Number(i.metadata?.dealValue) || 0), 0)
  const avgEng = list.length ? list.reduce((s, i) => s + (Number(i.metadata?.engagementRate) || 0), 0) / list.length : 0

  return (
    <div className="space-y-4">
      <Grid cols={4}>
        <KpiCard icon="people" label="Influencers" value={String(list.length)} sub={`${activeCount} active`} accent={ACCENT} />
        <KpiCard icon="megaphone" label="Combined Reach" value={fmt(totalReach)} sub="followers across roster" accent={ACCENT} />
        <KpiCard icon="coins" label="Committed Spend" value={eur(committed)} sub="deal value" accent={ACCENT} />
        <KpiCard icon="gauge" label="Avg Engagement" value={`${avgEng.toFixed(1)}%`} sub="entered manually" accent={ACCENT} />
      </Grid>

      {/* Data-sync discussion notes — explicitly requested for a later decision. */}
      <Panel icon="book" title="Notes — connecting live results (to discuss)">
        <div className="text-empire-text-muted text-[13px] leading-relaxed space-y-2">
          <p>Reach &amp; engagement are entered by hand today. Before we automate the sync, we need to decide:</p>
          <ul className="list-disc pl-5 space-y-1 text-empire-text-dim">
            <li><span className="text-empire-text">Source of truth</span> — official platform APIs (Instagram Graph, TikTok Business, YouTube Data, LinkedIn) vs. an aggregator (Modash / Upfluence / HypeAuditor).</li>
            <li><span className="text-empire-text">What we store per influencer</span> — handle, platform, follower count, engagement rate, audience geo/age split, fraud score, rate card, and per-post performance (impressions, reach, saves, clicks, attributed leads/revenue).</li>
            <li><span className="text-empire-text">Attribution</span> — UTM links + promo codes per influencer so results tie back to the Pipeline &amp; campaign ROAS already in this unit.</li>
            <li><span className="text-empire-text">Refresh cadence</span> — nightly pull into <code className="text-empire-gold">metadata</code>, or a dedicated <code className="text-empire-gold">InfluencerMetric</code> table for time-series. Rodiak would surface drops in the weekly Monday review.</li>
          </ul>
          <p className="text-empire-text-dim text-[11px] pt-1">For now this roster is fully editable; nothing here is synthetic — every row is a real DB entry.</p>
        </div>
      </Panel>

      <div className="flex items-center gap-2">
        <input className={`${inputCls} w-64`} placeholder="Search influencers…" value={q} onChange={e => { setQ(e.target.value); setPage(0) }} />
        <button onClick={() => setShowNew(true)} className="ml-auto px-3 py-1.5 rounded text-sm font-medium text-white" style={{ background: ACCENT }}>+ Add Influencer</button>
      </div>

      <Panel title={`Roster (${filtered.length})`}>
        {rows.length === 0 ? (
          <EmptyState icon="people" title="No influencers yet" hint="Add your first partnership above." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rows.map(inf => {
              const m = inf.metadata || {}
              const platforms = m.platforms?.length ? m.platforms : m.platform ? [m.platform] : []
              return (
                <div key={inf.id} className="glass rounded-lg border border-empire-border p-3 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                       style={{ background: `${PLATFORM_COLOR[platforms[0] || ''] || ACCENT}22`, color: PLATFORM_COLOR[platforms[0] || ''] || ACCENT }}>
                    {inf.title.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-empire-text text-sm font-medium truncate">{inf.title}</span>
                      <Pill text={inf.status} color={INF_STATUS_COLOR[inf.status] || '#6b7280'} />
                    </div>
                    <div className="text-empire-text-dim text-[11px] mt-0.5 truncate">
                      {m.handle ? `${m.handle} · ` : ''}{platforms.length ? platforms.join(', ') : '—'}{m.tier ? ` · ${m.tier}` : ''}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-empire-text-muted font-data">
                      <span>{fmt(Number(m.followers) || 0)} followers</span>
                      {m.engagementRate != null && <span>{m.engagementRate}% eng</span>}
                      {m.dealValue != null && <span>{eur(Number(m.dealValue) || 0)}</span>}
                    </div>
                  </div>
                  <RowActions
                    onView={() => setViewing(inf)}
                    onEdit={() => setEditing(inf)}
                    onDelete={() => remove(inf.id)}
                    deleteLabel={`the influencer “${inf.title}”`}
                  />
                </div>
              )
            })}
          </div>
        )}
        <Pagination page={page} pageCount={totalPages} total={filtered.length} onPage={setPage} accent={ACCENT} />
      </Panel>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title || 'Influencer'} icon={<EmpireIcon name="megaphone" size={18} />}>
        {viewing && (() => { const m = viewing.metadata || {}; return (
          <div className="space-y-0.5">
            <Field label="Status"><Pill text={viewing.status} color={INF_STATUS_COLOR[viewing.status] || '#6b7280'} /></Field>
            <Field label="Handle">{m.handle || '—'}</Field>
            <Field label="Platforms">{(m.platforms?.length ? m.platforms : m.platform ? [m.platform] : []).length
              ? <span className="inline-flex flex-wrap justify-end gap-1">{(m.platforms?.length ? m.platforms : [m.platform!]).map(p => <Pill key={p} text={p} color={PLATFORM_COLOR[p] || '#6b7280'} />)}</span>
              : '—'}</Field>
            <Field label="Tier">{m.tier || '—'}</Field>
            <Field label="Followers">{m.followers != null ? Number(m.followers).toLocaleString() : '—'}</Field>
            <Field label="Engagement">{m.engagementRate != null ? `${m.engagementRate}%` : '—'}</Field>
            <Field label="Deal Value">{m.dealValue != null ? eur(Number(m.dealValue)) : '—'}</Field>
            <Field label="Notes">{viewing.description || '—'}</Field>
          </div>
        ) })()}
      </Modal>

      <InfluencerEdit
        influencer={showNew ? null : editing}
        open={showNew || !!editing}
        onClose={() => { setShowNew(false); setEditing(null) }}
        onSaved={() => { setShowNew(false); setEditing(null); reload() }}
      />
    </div>
  )
}

function InfluencerEdit({ influencer, open, onClose, onSaved }: { influencer: Influencer | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const empty = { title: '', status: 'prospect', handle: '', platforms: 'instagram', tier: 'micro', followers: '', engagementRate: '', dealValue: '', description: '' }
  const [f, setF] = useState<Record<string, string>>(empty)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    if (influencer) {
      const m = influencer.metadata || {}
      setF({
        title: influencer.title, status: influencer.status,
        handle: m.handle ?? '', platforms: (m.platforms?.length ? m.platforms : m.platform ? [m.platform] : ['instagram']).join(','), tier: m.tier ?? 'micro',
        followers: m.followers != null ? String(m.followers) : '',
        engagementRate: m.engagementRate != null ? String(m.engagementRate) : '',
        dealValue: m.dealValue != null ? String(m.dealValue) : '',
        description: influencer.description ?? '',
      })
    } else setF(empty)
  }, [influencer, open]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))
  const selectedPlatforms = f.platforms.split(',').map(p => p.trim()).filter(Boolean)
  const togglePlatform = (platform: string) => {
    const next = selectedPlatforms.includes(platform) ? selectedPlatforms.filter(p => p !== platform) : [...selectedPlatforms, platform]
    set('platforms', next.join(','))
  }
  async function save() {
    if (!f.title) return
    setBusy(true)
    const platforms = selectedPlatforms.length ? selectedPlatforms : ['instagram']
    const metadata = {
      handle: f.handle || null, platform: platforms[0], platforms, tier: f.tier,
      followers: f.followers ? Number(f.followers) : null,
      engagementRate: f.engagementRate ? Number(f.engagementRate) : null,
      dealValue: f.dealValue ? Number(f.dealValue) : null,
    }
    try {
      if (influencer) {
        await patch(`/api/entries/${influencer.id}`, { title: f.title, status: f.status, description: f.description || null, metadata })
      } else {
        await post('/api/entries', { departmentSlug: 'marketing', category: 'influencer', title: f.title, status: f.status, description: f.description || null, metadata })
      }
      onSaved()
    } catch (e) { console.error(e) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={influencer ? 'Edit influencer' : 'Add influencer'} icon={<EmpireIcon name={influencer ? 'pen' : 'plus'} size={18} />}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Name</span>
            <input className={modalInput} value={f.title} onChange={e => set('title', e.target.value)} /></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Handle</span>
            <input className={modalInput} value={f.handle} onChange={e => set('handle', e.target.value)} placeholder="@handle" /></label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Platforms</span>
            <div className="mt-1 flex min-h-[36px] flex-wrap gap-1.5 rounded border border-empire-border bg-empire-bg px-2 py-1.5">
              {INF_PLATFORMS.map(p => (
                <button key={p} type="button" onClick={() => togglePlatform(p)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide transition-colors ${selectedPlatforms.includes(p) ? 'border-empire-gold/50 bg-empire-gold/10 text-empire-gold' : 'border-empire-border text-empire-text-dim hover:text-empire-text'}`}>
                  {p}
                </button>
              ))}
            </div></div>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Tier</span>
            <select className={modalInput} value={f.tier} onChange={e => set('tier', e.target.value)}>
              {INF_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Status</span>
            <select className={modalInput} value={f.status} onChange={e => set('status', e.target.value)}>
              {Object.keys(INF_STATUS_COLOR).map(s => <option key={s} value={s}>{s}</option>)}
            </select></label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Followers</span>
            <input type="number" className={modalInput} value={f.followers} onChange={e => set('followers', e.target.value)} /></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Engagement %</span>
            <input type="number" className={modalInput} value={f.engagementRate} onChange={e => set('engagementRate', e.target.value)} /></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Deal € </span>
            <input type="number" className={modalInput} value={f.dealValue} onChange={e => set('dealValue', e.target.value)} /></label>
        </div>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Notes</span>
          <textarea className={modalInput} rows={2} value={f.description} onChange={e => set('description', e.target.value)} placeholder="Campaign context, deliverables, contacts…" /></label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy || !f.title} className="rounded px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-50" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- Social Accounts (connected presences + dashboards) ----------------
 * Connect IG/Meta/etc., choose an account or view all together. Per-account and
 * all-accounts dashboards plus prescriptive "you need an increase here" fixes —
 * all derived from the SocialSnapshot series (/api/marketing/social/*). Real auth
 * keys go in env/Secrets later; the surface works DB-driven today. */
const SOCIAL_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'x', 'linkedin', 'youtube']
const SOCIAL_CONNECTIONS = [
  { id: 'login_session', label: 'IG / Meta login session' },
  { id: 'oauth', label: 'OAuth app' },
  { id: 'api_key', label: 'API key' },
  { id: 'manual', label: 'Manual entry' },
]
const ACC_STATUS_COLOR: Record<string, string> = { connected: '#10b981', pending: '#f59e0b', disconnected: '#6b7280', error: '#c94f4f' }
const SEV_COLOR: Record<string, string> = { high: '#c94f4f', medium: '#f59e0b', low: '#6b7280' }

type Fix = { area: string; severity: 'high' | 'medium' | 'low'; message: string; metric: string; handle?: string; platform?: string }
type SocialAcc = {
  id: string; platform: string; handle: string; displayName: string | null; avatarUrl: string | null
  status: string; connection: string; lastSyncedAt: string | null
  followers: number; reach: number; impressions: number; engagements: number; posts: number; engagementRate: number
  deltas: { followers: number; reach: number; engagements: number; impressions: number }
  series: { labels: string[]; followers: number[]; reach: number[]; engagements: number[]; impressions: number[] }
  fixes: Fix[]
}
type SocialOverview = {
  totals: { followers: number; reach: number; engagements: number; impressions: number; posts: number }
  avgEngagementRate: number; accountsTracked: number; connected: number
  perAccount: { id: string; platform: string; handle: string; displayName: string | null; avatarUrl: string | null; status: string; followers: number; engagementRate: number; deltas: SocialAcc['deltas']; fixCount: number }[]
  portfolioFixes: Fix[]
}

function Delta({ v, pct = true }: { v: number; pct?: boolean }) {
  const color = v > 0 ? '#10b981' : v < 0 ? '#c94f4f' : '#6b7280'
  const sign = v > 0 ? '+' : ''
  return <span className="font-data text-[11px]" style={{ color }}>{sign}{v}{pct ? '%' : ''}</span>
}

function FixCard({ f }: { f: Fix }) {
  const c = SEV_COLOR[f.severity]
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: `${c}44`, background: `${c}0d` }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] uppercase tracking-wide font-medium" style={{ color: c }}>{f.area}</span>
        <span className="font-data text-[11px] text-empire-text-muted">{f.metric}{f.handle ? ` · ${f.handle}` : ''}</span>
      </div>
      <p className="text-empire-text-muted text-xs leading-relaxed">{f.message}</p>
    </div>
  )
}

function SocialAccounts() {
  const [accounts, setAccounts] = useState<SocialAcc[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string>('all') // 'all' | account id
  const [overview, setOverview] = useState<SocialOverview | null>(null)
  const [detail, setDetail] = useState<SocialAcc | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [editing, setEditing] = useState<SocialAcc | null>(null)
  const [snapFor, setSnapFor] = useState<SocialAcc | null>(null)
  const [page, setPage] = useState(0)
  const PS = 6

  const loadAccounts = useCallback(() => {
    setLoading(true)
    fetcher('/api/marketing/social/accounts?pageSize=100')
      .then((r: Page<SocialAcc>) => setAccounts(r.data || []))
      .catch(console.error).finally(() => setLoading(false))
  }, [])
  const loadOverview = useCallback(() => {
    fetcher('/api/marketing/social/overview').then(setOverview).catch(console.error)
  }, [])
  const loadDetail = useCallback((id: string) => {
    fetcher(`/api/marketing/social/accounts/${id}/metrics`).then(setDetail).catch(console.error)
  }, [])

  useEffect(() => { loadAccounts(); loadOverview() }, [loadAccounts, loadOverview])
  // Returning from the provider OAuth consent screen lands here with ?social=…
  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search).get('social')
    if (p === 'connected' || p === 'error') {
      loadAccounts(); loadOverview()
      const url = new URL(window.location.href); url.searchParams.delete('social')
      window.history.replaceState({}, '', url.toString())
    }
  }, [loadAccounts, loadOverview])
  useEffect(() => { if (selected !== 'all') loadDetail(selected) }, [selected, loadDetail])
  function reloadAll() { loadAccounts(); loadOverview(); if (selected !== 'all') loadDetail(selected) }

  async function sync(id: string) {
    try { await post(`/api/marketing/social/accounts/${id}/sync`, {}); reloadAll() } catch (e) { console.error(e) }
  }
  async function remove(id: string) {
    try { await del(`/api/marketing/social/accounts/${id}`); if (selected === id) setSelected('all'); reloadAll() } catch (e) { console.error(e) }
  }

  if (loading) return <Loading />

  const selectedAcc = accounts.find(a => a.id === selected)
  const pageRows = overview ? overview.perAccount.slice(page * PS, page * PS + PS) : []

  return (
    <div className="space-y-6">
      {/* Toolbar: choose account / all, connect, sync */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] uppercase tracking-wide text-empire-text-dim">View</span>
        <select className={inputCls} value={selected} onChange={e => { setSelected(e.target.value); setPage(0) }}>
          <option value="all">All accounts (portfolio)</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.handle} · {a.platform}</option>)}
        </select>
        {selectedAcc && (
          <>
            <Pill text={selectedAcc.status} color={ACC_STATUS_COLOR[selectedAcc.status] || '#6b7280'} />
            <button onClick={() => sync(selectedAcc.id)} className="rounded px-3 py-1.5 text-xs uppercase tracking-widest border border-empire-border text-empire-text-muted hover:text-empire-text hover:border-empire-gold/40 inline-flex items-center gap-1.5">
              <EmpireIcon name="rocket" size={12} /> Sync now
            </button>
            <button onClick={() => setSnapFor(selectedAcc)} className="rounded px-3 py-1.5 text-xs uppercase tracking-widest border border-empire-border text-empire-text-muted hover:text-empire-text">+ Period data</button>
            <RowActions onEdit={() => setEditing(selectedAcc)} onDelete={() => remove(selectedAcc.id)} deleteLabel={`account ${selectedAcc.handle}`} />
          </>
        )}
        <button onClick={() => setConnecting(true)} className="ml-auto rounded px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white" style={{ background: ACCENT }}>
          + Connect account
        </button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState icon="megaphone" title="No accounts connected" hint="Connect an Instagram / Meta account (login session or API key) to pull reach, engagement and follower growth. Real keys go in env later — connect now to start recording." />
      ) : selected === 'all' ? (
        /* ---- Portfolio (all accounts together) ---- */
        <div className="space-y-6">
          <Grid cols={5}>
            <KpiCard icon="people" label="Total Followers" value={fmt(overview?.totals.followers || 0)} sub={`${overview?.accountsTracked || 0} accounts`} accent={ACCENT} />
            <KpiCard icon="gauge" label="Avg Engagement" value={`${overview?.avgEngagementRate || 0}%`} accent={(overview?.avgEngagementRate || 0) >= 3 ? '#10b981' : (overview?.avgEngagementRate || 0) >= 1 ? '#f59e0b' : '#c94f4f'} />
            <KpiCard icon="chart-line" label="Reach" value={fmt(overview?.totals.reach || 0)} accent={ACCENT} />
            <KpiCard icon="megaphone" label="Impressions" value={fmt(overview?.totals.impressions || 0)} accent={ACCENT} />
            <KpiCard icon="check" label="Connected" value={`${overview?.connected || 0}/${overview?.accountsTracked || 0}`} accent={ACCENT} />
          </Grid>

          <Panel icon="people" title="Accounts">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {pageRows.map(a => {
                const c = PLATFORM_COLOR[a.platform] || ACCENT
                return (
                  <button key={a.id} onClick={() => { setSelected(a.id); setPage(0) }} className="text-left rounded-lg border border-empire-border bg-empire-elevated/30 p-3 hover:border-empire-gold/40 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="grid place-items-center w-8 h-8 rounded-full text-[11px] font-semibold" style={{ background: `${c}22`, color: c }}>{a.platform.slice(0, 2).toUpperCase()}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><span className="text-empire-text text-sm truncate">{a.handle}</span><Pill text={a.status} color={ACC_STATUS_COLOR[a.status] || '#6b7280'} /></div>
                        <div className="text-[11px] text-empire-text-dim">{a.platform}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2.5 text-[11px] text-empire-text-muted font-data">
                      <span>{fmt(a.followers)} followers <Delta v={a.deltas.followers} pct={false} /></span>
                      <span>{a.engagementRate}% eng</span>
                      {a.fixCount > 0 && <span style={{ color: '#f59e0b' }}>{a.fixCount} fix{a.fixCount > 1 ? 'es' : ''}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
            <Pagination page={page} pageCount={Math.ceil((overview?.perAccount.length || 0) / PS)} total={overview?.perAccount.length || 0} onPage={setPage} accent={ACCENT} />
          </Panel>

          {overview && overview.portfolioFixes.length > 0 && (
            <Panel icon="alert" title="Recommended actions — where to push next">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {overview.portfolioFixes.map((f, i) => <FixCard key={i} f={f} />)}
              </div>
            </Panel>
          )}
        </div>
      ) : detail ? (
        /* ---- Single account dashboard ---- */
        <div className="space-y-6">
          <Grid cols={5}>
            <KpiCard icon="people" label="Followers" value={fmt(detail.followers)} sub={`${detail.deltas.followers >= 0 ? '+' : ''}${detail.deltas.followers} vs prev`} accent={ACCENT} />
            <KpiCard icon="gauge" label="Engagement Rate" value={`${detail.engagementRate}%`} accent={detail.engagementRate >= 3 ? '#10b981' : detail.engagementRate >= 1 ? '#f59e0b' : '#c94f4f'} />
            <KpiCard icon="chart-line" label="Reach" value={fmt(detail.reach)} accent={ACCENT} />
            <KpiCard icon="megaphone" label="Impressions" value={fmt(detail.impressions)} accent={ACCENT} />
            <KpiCard icon="sparkle" label="Posts / period" value={String(detail.posts)} accent={ACCENT} />
          </Grid>

          {detail.series.labels.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Panel icon="chart-line" title={`Followers — ${detail.series.labels.join(' → ')}`}><AreaChart series={detail.series.followers} color={ACCENT} height={200} /></Panel>
              <Panel icon="chart-line" title="Engagements"><AreaChart series={detail.series.engagements} color="#a855f7" height={200} /></Panel>
            </div>
          ) : (
            <EmptyState icon="chart-line" title="No period data yet" hint="Add a reporting period (or sync once keys are configured) to chart growth." />
          )}

          {detail.fixes.length > 0 && (
            <Panel icon="alert" title="Recommended actions — you need an increase here">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {detail.fixes.map((f, i) => <FixCard key={i} f={f} />)}
              </div>
            </Panel>
          )}
        </div>
      ) : <Loading />}

      {/* Connect / edit modal */}
      <SocialAccountEdit account={connecting ? null : editing} open={connecting || !!editing} onClose={() => { setConnecting(false); setEditing(null) }} onSaved={() => { setConnecting(false); setEditing(null); reloadAll() }} />
      {/* Add period snapshot */}
      <SocialSnapshotForm account={snapFor} open={!!snapFor} onClose={() => setSnapFor(null)} onSaved={() => { setSnapFor(null); reloadAll() }} />
    </div>
  )
}

/* ---------------- Campaign intelligence (§6) ----------------
 * One consolidated read of the whole social portfolio, grouped into four lenses
 * (engagement / growth / audience / content-gap). Every number is derived by the
 * API from the snapshot series + campaign rows — nothing here is hard-coded. */
type IntelRec = { severity: 'high' | 'medium' | 'low'; metric: string; message: string }
type IntelCat = { key: string; title: string; score: number; severity: 'high' | 'medium' | 'low'; recommendations: IntelRec[] }
type Intel = { generatedAt: string; accountsAnalyzed: number; withData: number; categories: IntelCat[] }
const CAT_ICON: Record<string, string> = { engagement: 'gauge', growth: 'chart-line', audience: 'people', content_gap: 'megaphone' }

function Intelligence() {
  const [data, setData] = useState<Intel | null>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(() => {
    setLoading(true)
    fetcher('/api/marketing/social/intelligence').then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])
  if (loading) return <Loading />
  if (!data || data.accountsAnalyzed === 0) return <EmptyState icon="sparkle" title="No accounts to analyse yet" hint="Connect a social account and record at least one reporting period — the intelligence engine reads the snapshot series to surface engagement, growth, audience and content-gap actions." />

  const totalRecs = data.categories.reduce((s, c) => s + c.recommendations.length, 0)
  const high = data.categories.reduce((s, c) => s + c.recommendations.filter(r => r.severity === 'high').length, 0)
  return (
    <div className="space-y-6">
      <Grid cols={3}>
        <KpiCard icon="people" label="Accounts analysed" value={String(data.accountsAnalyzed)} sub={`${data.withData} with period data`} accent={ACCENT} />
        <KpiCard icon="sparkle" label="Recommendations" value={String(totalRecs)} sub="across 4 lenses" accent={ACCENT} />
        <KpiCard icon="alert" label="High priority" value={String(high)} accent={high > 0 ? '#c94f4f' : '#10b981'} />
      </Grid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.categories.map(cat => {
          const c = SEV_COLOR[cat.severity]
          return (
            <Panel key={cat.key} icon={asIconName(CAT_ICON[cat.key], 'sparkle')} title={cat.title}>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Pill text={cat.severity} color={c} />
                  <span className="text-[11px] text-empire-text-dim font-data">{cat.recommendations.length} action{cat.recommendations.length === 1 ? '' : 's'}</span>
                </div>
                {cat.recommendations.length === 0 ? (
                  <p className="text-empire-text-dim text-xs">Nothing flagged — this lens looks healthy.</p>
                ) : cat.recommendations.map((r, i) => (
                  <div key={i} className="rounded-lg border p-3" style={{ borderColor: `${SEV_COLOR[r.severity]}44`, background: `${SEV_COLOR[r.severity]}0d` }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] uppercase tracking-wide font-medium" style={{ color: SEV_COLOR[r.severity] }}>{r.severity}</span>
                      <span className="font-data text-[11px] text-empire-text-muted">{r.metric}</span>
                    </div>
                    <p className="text-empire-text-muted text-xs leading-relaxed">{r.message}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )
        })}
      </div>
      <p className="text-[11px] text-empire-text-dim text-right">Generated {new Date(data.generatedAt).toLocaleString()} · derived from live snapshot + campaign data</p>
    </div>
  )
}

function SocialAccountEdit({ account, open, onClose, onSaved }: { account: SocialAcc | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const empty = { platform: 'instagram', handle: '', displayName: '', connection: 'login_session', status: 'pending' }
  const [f, setF] = useState<Record<string, string>>(empty)
  const [busy, setBusy] = useState(false)
  const [oauthBusy, setOauthBusy] = useState(false)
  const [oauthNote, setOauthNote] = useState('')
  useEffect(() => {
    if (!open) return
    setOauthNote('')
    setF(account ? { platform: account.platform, handle: account.handle, displayName: account.displayName ?? '', connection: account.connection, status: account.status } : empty)
  }, [account, open]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))
  // Real authorization-code handshake. If the provider has live keys in env we
  // bounce to its consent screen; otherwise we run the dev "simulate" connect so
  // the flow is demoable on dummy data (no secrets required).
  async function connectOAuth() {
    if (!account) return
    setOauthBusy(true); setOauthNote('')
    try {
      const r: { configured: boolean; url?: string; hint?: string } =
        await fetcher(`/api/marketing/social/oauth/${account.platform}/authorize-url?accountId=${account.id}`)
      if (r.configured && r.url) { window.location.href = r.url; return }
      await post(`/api/marketing/social/accounts/${account.id}/oauth/simulate`, {})
      setOauthNote('Simulated OAuth connection — add provider keys in env for a live token.')
      onSaved()
    } catch (e) { console.error(e); setOauthNote('Could not start OAuth.') } finally { setOauthBusy(false) }
  }
  async function save() {
    if (!f.handle) return
    setBusy(true)
    const body = { platform: f.platform, handle: f.handle, displayName: f.displayName || null, connection: f.connection, ...(account && { status: f.status }) }
    try {
      if (account) await patch(`/api/marketing/social/accounts/${account.id}`, body)
      else await post('/api/marketing/social/accounts', body)
      onSaved()
    } catch (e) { console.error(e) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={account ? 'Edit account' : 'Connect account'} icon={<EmpireIcon name={account ? 'pen' : 'plus'} size={18} />}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Platform</span>
            <select className={modalInput} value={f.platform} onChange={e => set('platform', e.target.value)}>{SOCIAL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Handle</span>
            <input className={modalInput} value={f.handle} onChange={e => set('handle', e.target.value)} placeholder="@cregen" /></label>
        </div>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Display name</span>
          <input className={modalInput} value={f.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Cregen" /></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Connection method</span>
          <select className={modalInput} value={f.connection} onChange={e => set('connection', e.target.value)}>{SOCIAL_CONNECTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        {account && (
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Status</span>
            <select className={modalInput} value={f.status} onChange={e => set('status', e.target.value)}>{Object.keys(ACC_STATUS_COLOR).map(s => <option key={s} value={s}>{s}</option>)}</select></label>
        )}
        {account && f.connection === 'oauth' && (
          <div className="rounded-lg border border-empire-border bg-empire-elevated/30 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wide text-empire-text-muted">OAuth authorization</span>
              <button onClick={connectOAuth} disabled={oauthBusy} className="rounded px-3 py-1.5 text-xs uppercase tracking-widest border border-empire-gold/40 text-empire-gold hover:bg-empire-gold/10 disabled:opacity-50 inline-flex items-center gap-1.5">
                <EmpireIcon name="lock" size={12} /> {oauthBusy ? 'Connecting…' : 'Connect via OAuth'}
              </button>
            </div>
            <p className="text-[11px] text-empire-text-dim leading-relaxed">Starts the provider authorization-code flow. With live keys in env you are sent to the provider&apos;s consent screen; without keys it records a simulated connection so the flow is demoable.</p>
            {oauthNote && <p className="text-[11px]" style={{ color: '#10b981' }}>{oauthNote}</p>}
          </div>
        )}
        <p className="text-[11px] text-empire-text-dim leading-relaxed">Auth keys/tokens are added in env later — connecting now records the account so metrics light up on first sync.</p>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy || !f.handle} className="rounded px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-50" style={{ background: ACCENT }}>{busy ? 'Saving…' : account ? 'Save' : 'Connect'}</button>
        </div>
      </div>
    </Modal>
  )
}

function SocialSnapshotForm({ account, open, onClose, onSaved }: { account: SocialAcc | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const empty = { periodLabel: '', followers: '', reach: '', impressions: '', engagements: '', posts: '', clicks: '' }
  const [f, setF] = useState<Record<string, string>>(empty)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setF(empty) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))
  async function save() {
    if (!account || !f.periodLabel) return
    setBusy(true)
    try {
      await post(`/api/marketing/social/accounts/${account.id}/snapshots`, {
        periodLabel: f.periodLabel,
        followers: Number(f.followers) || 0, reach: Number(f.reach) || 0, impressions: Number(f.impressions) || 0,
        engagements: Number(f.engagements) || 0, posts: Number(f.posts) || 0, clicks: Number(f.clicks) || 0,
      })
      onSaved()
    } catch (e) { console.error(e) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={`Add period · ${account?.handle || ''}`} icon={<EmpireIcon name="calendar" size={18} />}>
      <div className="space-y-3">
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Period label</span>
          <input className={modalInput} value={f.periodLabel} onChange={e => set('periodLabel', e.target.value)} placeholder="May 2026" /></label>
        <div className="grid grid-cols-3 gap-3">
          {(['followers', 'reach', 'impressions', 'engagements', 'posts', 'clicks'] as const).map(k => (
            <label key={k} className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted capitalize">{k}</span>
              <input type="number" className={modalInput} value={f[k]} onChange={e => set(k, e.target.value)} /></label>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy || !f.periodLabel} className="rounded px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-50" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Save period'}</button>
        </div>
      </div>
    </Modal>
  )
}
