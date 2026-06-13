'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { fetcher, post, patch, del } from '@/lib/api'
import { KpiCard, Panel, AreaChart, ProgressBar, DataTable, TabBar, Grid, EmptyState, type Column } from '@/lib/ui'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { Modal } from '@/components/molecules/Modal'
import { useStickyTab } from '@/lib/use-sticky-tab'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'

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

// Local colored status pill — the shared Badge only supports preset tones,
// but DORA/severity/tier statuses each need their own color.
function Pill({ text, color }: { text: string; color: string }) {
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap" style={{ color, borderColor: `${color}55`, background: `${color}12` }}>{text}</span>
}

// Engineering — enterprise delivery surface backed by real events.
// DORA (deploy frequency, lead time, change-failure rate, MTTR) and sprint
// velocity are all derived server-side from services/deploys/incidents/sprints
// (/api/engineering/*). Nothing is hard-coded. Log a deploy or incident and
// every metric recomputes.

const ACCENT = '#C9A233'
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'dora', label: 'DORA' },
  { id: 'services', label: 'Services' },
  { id: 'deploys', label: 'Deploys' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'sprints', label: 'Sprints' },
]

const PERF_COLOR: Record<string, string> = { elite: '#C9A233', high: '#C9A233', medium: '#c9a233', low: '#F4EFE3' }
const SEV_COLOR: Record<string, string> = { sev1: '#F4EFE3', sev2: '#C9A233', sev3: '#c9a233', sev4: '#7A7468' }
const TIER_COLOR: Record<string, string> = { critical: '#F4EFE3', standard: '#C9A233', internal: '#7A7468' }
const ago = (d: string) => {
  const h = (Date.now() - new Date(d).getTime()) / 3600000
  if (h < 1) return `${Math.round(h * 60)}m ago`
  if (h < 24) return `${Math.round(h)}h ago`
  return `${Math.round(h / 24)}d ago`
}

export function EngineeringPanel() {
  const [tab, setTab] = useStickyTab('engineering', 'overview')
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h3 className="flex items-center gap-2 font-empire text-empire-gold text-sm tracking-widest uppercase">
          <EmpireIcon name={deptIcon('engineering')} size={16} className="text-empire-gold-muted" />
          Delivery Intelligence
        </h3>
        <p className="text-empire-text-muted text-xs mt-0.5">DORA + velocity derived from real deploys, incidents & sprints — log an event and every metric recomputes.</p>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} accent={ACCENT} />
      {tab === 'overview' && <Overview />}
      {tab === 'dora' && <Dora />}
      {tab === 'services' && <Services />}
      {tab === 'deploys' && <Deploys />}
      {tab === 'incidents' && <Incidents />}
      {tab === 'sprints' && <Sprints />}
    </div>
  )
}

function useEng<T>(path: string): { data: T | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    setLoading(true)
    fetcher(`/api/engineering/${path}`).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [path])
  useEffect(() => { reload() }, [reload])
  return { data, loading, reload }
}

function Loading() { return <div className="py-16 text-center text-empire-text-dim text-sm animate-pulse">Computing from delivery events…</div> }
function Rating({ r }: { r: string }) { return <Pill text={r.toUpperCase()} color={PERF_COLOR[r] || '#7A7468'} /> }

/* ---------------- Overview ---------------- */
type Summary = { services: number; deploysLast30: number; openIncidents: number; activeSprint: { name: string; goal: string | null; committedPoints: number; completedPoints: number; velocityPct: number } | null; deployTrend: number[] }
type Dora = { windowDays: number; deployFrequency: { total: number; perWeek: number; perDay: number; rating: string }; leadTime: { medianHours: number; medianDays: number; sample: number; rating: string }; changeFailureRate: { pct: number; failures: number; total: number; rating: string }; timeToRestore: { medianHours: number; medianDays: number; sample: number; rating: string }; overall: string }

function Overview() {
  const { data: s, loading } = useEng<Summary>('summary')
  const { data: d } = useEng<Dora>('dora')
  if (loading) return <Loading />
  if (!s) return <EmptyState icon="rocket" title="No delivery data" hint="Log a deploy to begin." />
  return (
    <div className="space-y-6">
      <Grid cols={6}>
        <KpiCard label="Active Services" value={String(s.services)} accent={ACCENT} icon="cog" />
        <KpiCard label="Deploys (30d)" value={String(s.deploysLast30)} spark={s.deployTrend} accent={ACCENT} icon="rocket" />
        <KpiCard label="Open Incidents" value={String(s.openIncidents)} accent={s.openIncidents > 0 ? '#F4EFE3' : '#C9A233'} icon={s.openIncidents > 0 ? 'alert' : 'check'} />
        <KpiCard label="DORA Band" value={d ? d.overall.toUpperCase() : '—'} accent={d ? PERF_COLOR[d.overall] : ACCENT} icon="gauge" />
        <KpiCard label="Lead Time" value={d ? `${d.leadTime.medianHours}h` : '—'} sub="commit → prod" accent={ACCENT} icon="clock" />
        <KpiCard label="Sprint Velocity" value={s.activeSprint ? `${s.activeSprint.velocityPct}%` : '—'} sub={s.activeSprint?.name} accent={ACCENT} icon="chart-line" />
      </Grid>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Production Deploys (12 wk)" className="lg:col-span-2" icon="rocket">
          <AreaChart series={s.deployTrend} color={ACCENT} height={200} />
        </Panel>
        <Panel title="Active Sprint" icon="flag">
          {s.activeSprint ? (
            <div className="space-y-3">
              <div className="text-empire-text font-medium">{s.activeSprint.name}</div>
              <div className="text-empire-text-muted text-xs">{s.activeSprint.goal}</div>
              <ProgressBar value={s.activeSprint.completedPoints} max={s.activeSprint.committedPoints} color={ACCENT} />
              <div className="text-xs text-empire-text-muted">{s.activeSprint.completedPoints} / {s.activeSprint.committedPoints} pts · {s.activeSprint.velocityPct}%</div>
            </div>
          ) : <EmptyState icon="flag" title="No active sprint" />}
        </Panel>
      </div>
    </div>
  )
}

/* ---------------- DORA ---------------- */
function Dora() {
  const { data: d, loading } = useEng<Dora>('dora')
  if (loading) return <Loading />
  if (!d) return <EmptyState icon="gauge" title="No DORA data" />
  const metrics: { label: string; value: string; sub: string; rating: string; icon: IconName }[] = [
    { label: 'Deployment Frequency', value: `${d.deployFrequency.perDay}/day`, sub: `${d.deployFrequency.total} deploys / ${d.windowDays}d · ${d.deployFrequency.perWeek}/wk`, rating: d.deployFrequency.rating, icon: 'rocket' },
    { label: 'Lead Time for Changes', value: `${d.leadTime.medianHours}h`, sub: `median commit→prod · n=${d.leadTime.sample}`, rating: d.leadTime.rating, icon: 'clock' },
    { label: 'Change Failure Rate', value: `${d.changeFailureRate.pct}%`, sub: `${d.changeFailureRate.failures} of ${d.changeFailureRate.total} deploys`, rating: d.changeFailureRate.rating, icon: 'alert' },
    { label: 'Time to Restore', value: `${d.timeToRestore.medianHours}h`, sub: `median MTTR · n=${d.timeToRestore.sample}`, rating: d.timeToRestore.rating, icon: 'lifebuoy' },
  ]
  return (
    <div className="space-y-6">
      <Panel title={`Overall DORA performance — ${d.overall.toUpperCase()}`} icon="gauge">
        <p className="text-empire-text-muted text-xs">Banded against the official DORA thresholds (worst-of the four metrics). Window: last {d.windowDays} days.</p>
      </Panel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((m) => (
          <Panel key={m.label} title={m.label} icon={m.icon}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-empire text-3xl leading-none tracking-tight tabular-nums" style={{ color: PERF_COLOR[m.rating] }}>{m.value}</div>
                <div className="text-empire-text-muted text-[11px] uppercase tracking-wide mt-2">{m.sub}</div>
              </div>
              <Rating r={m.rating} />
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Services ---------------- */
type Svc = { id: string; name: string; slug: string; repo: string | null; tier: string; language: string | null; ownerName: string | null; deployCount: number; incidentCount: number; openIncidents: number }
function Services() {
  const { data, loading, reload } = useEng<Svc[]>('services')
  const [viewing, setViewing] = useState<Svc | null>(null)
  const [editing, setEditing] = useState<Svc | null>(null)
  const [creating, setCreating] = useState(false)
  async function remove(id: string) { await del(`/api/engineering/services/${id}`).catch(console.error); reload() }
  if (loading) return <Loading />
  const rows = data || []
  const cols: Column<Svc>[] = [
    { key: 'name', label: 'Service', render: (s) => <span className="font-medium text-empire-text">{s.name}</span> },
    { key: 'tier', label: 'Tier', render: (s) => <Pill text={s.tier} color={TIER_COLOR[s.tier] || '#7A7468'} /> },
    { key: 'language', label: 'Stack', render: (s) => <span className="text-empire-text-muted">{s.language || '—'}</span> },
    { key: 'ownerName', label: 'Owner', render: (s) => <span className="text-empire-text-muted">{s.ownerName || '—'}</span> },
    { key: 'deployCount', label: 'Deploys', align: 'right' },
    { key: 'openIncidents', label: 'Open Inc.', align: 'right', render: (s) => <span style={{ color: s.openIncidents > 0 ? '#F4EFE3' : undefined }}>{s.openIncidents}</span> },
    { key: 'actions', label: '', align: 'right', render: (s) => (
      <RowActions onView={() => setViewing(s)} onEdit={() => setEditing(s)} onDelete={() => remove(s.id)} deleteLabel={`the “${s.name}” service`} />
    ) },
  ]
  return (
    <Panel
      title={`Service Catalog (${rows.length})`}
      icon="cog"
      actions={
        <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 rounded border border-empire-gold/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-empire-gold hover:border-empire-gold/70 hover:bg-empire-gold/10">
          <EmpireIcon name="plus" size={13} /> Add service
        </button>
      }
    >
      <DataTable columns={cols} rows={rows} empty="No services registered yet — add your first one to start logging deploys and incidents." />

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || 'Service'} icon={<EmpireIcon name="cog" size={18} />}>
        {viewing && (
          <div className="space-y-0.5">
            <Field label="Name">{viewing.name}</Field>
            <Field label="Slug"><span className="font-mono text-xs">{viewing.slug}</span></Field>
            <Field label="Tier"><Pill text={viewing.tier} color={TIER_COLOR[viewing.tier] || '#7A7468'} /></Field>
            <Field label="Stack">{viewing.language || '—'}</Field>
            <Field label="Repo">{viewing.repo || '—'}</Field>
            <Field label="Owner">{viewing.ownerName || '—'}</Field>
            <Field label="Deploys">{viewing.deployCount}</Field>
            <Field label="Open Incidents">{viewing.openIncidents}</Field>
          </div>
        )}
      </Modal>
      <ServiceForm open={!!editing || creating} service={editing} onClose={() => { setEditing(null); setCreating(false) }} onSaved={() => { setEditing(null); setCreating(false); reload() }} />
    </Panel>
  )
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

function ServiceForm({ open, service, onClose, onSaved }: { open: boolean; service: Svc | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Record<string, any>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setError('')
    if (service) setF({ name: service.name, tier: service.tier, language: service.language ?? '', repo: service.repo ?? '', ownerName: service.ownerName ?? '' })
    else if (open) setF({ name: '', tier: 'standard', language: '', repo: '', ownerName: '' })
  }, [service, open])
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }))
  async function save() {
    if (!String(f.name || '').trim()) { setError('Name is required.'); return }
    setBusy(true); setError('')
    try {
      if (service) await patch(`/api/engineering/services/${service.id}`, f)
      else await post('/api/engineering/services', { ...f, slug: slugify(f.name) })
      setBusy(false); onSaved()
    } catch (e: any) {
      setBusy(false)
      setError(e?.message?.includes('409') || e?.message?.includes('exists') ? 'A service with this name already exists.' : 'Could not save the service — try again.')
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={service ? 'Edit service' : 'Add service'} icon={<EmpireIcon name={service ? 'pen' : 'plus'} size={18} />}>
      <div className="space-y-3">
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Name</span>
          <input className={modalInput} placeholder="e.g. Billing API" value={f.name ?? ''} onChange={e => set('name', e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Tier</span>
            <select className={modalInput} value={f.tier ?? ''} onChange={e => set('tier', e.target.value)}>
              {Object.keys(TIER_COLOR).map(t => <option key={t} value={t}>{t}</option>)}
            </select></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Stack</span>
            <input className={modalInput} value={f.language ?? ''} placeholder="TypeScript / Node" onChange={e => set('language', e.target.value)} /></label>
        </div>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Repo</span>
          <input className={modalInput} value={f.repo ?? ''} placeholder="github.com/org/repo" onChange={e => set('repo', e.target.value)} /></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Owner</span>
          <input className={modalInput} placeholder="e.g. Lukas Beckers" value={f.ownerName ?? ''} onChange={e => set('ownerName', e.target.value)} /></label>
        {error && <p className="text-xs text-empire-text" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy || !String(f.name || '').trim()} className="empire-btn-primary px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-50">{busy ? 'Saving…' : service ? 'Save' : 'Add service'}</button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- Deploys ---------------- */
type Dep = { id: string; service: string; serviceId: string; version: string; environment: string; status: string; author: string | null; deployedAt: string; leadTimeHours: number | null; causedIncidents: number }
function Deploys() {
  const [page, setPage] = useState(0)
  const { data, loading, reload } = useEng<Page<Dep>>(`deploys?pageSize=25&page=${page + 1}`)
  const { data: services } = useEng<Svc[]>('services')
  const [form, setForm] = useState({ serviceId: '', version: '', status: 'success', author: '', leadHours: '12' })
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState<Dep | null>(null)
  async function remove(id: string) { await del(`/api/engineering/deploys/${id}`).catch(console.error); reload() }

  async function submit() {
    if (!form.serviceId || !form.version) return
    setBusy(true)
    const commitAt = new Date(Date.now() - Number(form.leadHours || 0) * 3600000).toISOString()
    await post('/api/engineering/deploys', { serviceId: form.serviceId, version: form.version, status: form.status, author: form.author || null, commitAt }).catch(console.error)
    setBusy(false)
    setForm({ ...form, version: '' })
    setPage(0)
    reload()
  }

  if (loading) return <Loading />
  const rows = data?.data || []
  const cols: Column<Dep>[] = [
    { key: 'service', label: 'Service', render: (d) => <span className="font-medium text-empire-text">{d.service}</span> },
    { key: 'version', label: 'Version', render: (d) => <span className="font-mono text-xs text-empire-text-muted">{d.version}</span> },
    { key: 'status', label: 'Status', render: (d) => <Pill text={d.status} color={d.status === 'success' ? '#C9A233' : '#F4EFE3'} /> },
    { key: 'author', label: 'Author', render: (d) => <span className="text-empire-text-muted">{d.author || '—'}</span> },
    { key: 'leadTimeHours', label: 'Lead', align: 'right', render: (d) => <span className="text-empire-text-muted">{d.leadTimeHours != null ? `${d.leadTimeHours}h` : '—'}</span> },
    { key: 'deployedAt', label: 'When', align: 'right', render: (d) => <span className="text-empire-text-dim text-xs">{ago(d.deployedAt)}</span> },
    { key: 'actions', label: '', align: 'right', render: (d) => (
      <RowActions onView={() => setViewing(d)} onDelete={() => remove(d.id)} deleteLabel={`deploy ${d.version} of ${d.service}`} />
    ) },
  ]
  return (
    <div className="space-y-4">
      <Panel title="Log a deploy" icon="plus">
        <div className="flex flex-wrap gap-2 items-end">
          <select className="bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
            <option value="">Service…</option>
            {(services || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text w-28" placeholder="v1.2.0" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
          <select className="bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="success">success</option>
            <option value="failed">failed</option>
            <option value="rolled_back">rolled_back</option>
          </select>
          <input className="bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text w-28" placeholder="author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          <input className="bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text w-24" placeholder="lead hrs" value={form.leadHours} onChange={(e) => setForm({ ...form, leadHours: e.target.value })} />
          <button
            disabled={busy || !form.serviceId || !form.version.trim()}
            onClick={submit}
            title={!form.serviceId ? 'Pick a service first' : !form.version.trim() ? 'Enter a version' : undefined}
            className="empire-btn-primary px-3 py-1.5 text-sm disabled:opacity-40"
          >{busy ? 'Logging…' : 'Deploy'}</button>
        </div>
        {(services || []).length === 0 && (
          <p className="mt-2 text-xs text-empire-text-muted">No services yet — add one in the Services tab before logging a deploy.</p>
        )}
        {!form.serviceId && (services || []).length > 0 && (
          <p className="mt-2 text-xs text-empire-text-dim">Select a service to enable the Deploy button.</p>
        )}
      </Panel>
      <Panel title={`Recent Deploys (${data?.total ?? rows.length})`} icon="rocket">
        <DataTable columns={cols} rows={rows} empty="No deploys yet." />
        {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
      </Panel>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${viewing.service} · ${viewing.version}` : 'Deploy'} icon={<EmpireIcon name="rocket" size={18} />}>
        {viewing && (
          <div className="space-y-0.5">
            <Field label="Service">{viewing.service}</Field>
            <Field label="Version"><span className="font-mono text-xs">{viewing.version}</span></Field>
            <Field label="Environment">{viewing.environment}</Field>
            <Field label="Status"><Pill text={viewing.status} color={viewing.status === 'success' ? '#C9A233' : '#F4EFE3'} /></Field>
            <Field label="Author">{viewing.author || '—'}</Field>
            <Field label="Lead Time">{viewing.leadTimeHours != null ? `${viewing.leadTimeHours}h` : '—'}</Field>
            <Field label="Caused Incidents">{viewing.causedIncidents}</Field>
            <Field label="Deployed">{new Date(viewing.deployedAt).toLocaleString()}</Field>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ---------------- Incidents ---------------- */
type Inc = { id: string; service: string; serviceId: string; title: string; severity: string; status: string; cause: string | null; detectedAt: string; resolvedAt: string | null; ttrHours: number | null }
function Incidents() {
  const [page, setPage] = useState(0)
  const { data, loading, reload } = useEng<Page<Inc>>(`incidents?pageSize=25&page=${page + 1}`)
  const { data: services } = useEng<Svc[]>('services')
  const [form, setForm] = useState({ serviceId: '', title: '', severity: 'sev3', cause: 'deploy' })
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState<Inc | null>(null)

  async function submit() {
    if (!form.serviceId || !form.title) return
    setBusy(true)
    await post('/api/engineering/incidents', form).catch(console.error)
    setBusy(false)
    setForm({ ...form, title: '' })
    setPage(0)
    reload()
  }
  async function resolve(id: string) {
    await patch(`/api/engineering/incidents/${id}`, { status: 'resolved' }).catch(console.error)
    reload()
  }
  async function remove(id: string) { await del(`/api/engineering/incidents/${id}`).catch(console.error); reload() }

  if (loading) return <Loading />
  const rows = data?.data || []
  const cols: Column<Inc>[] = [
    { key: 'severity', label: 'Sev', render: (i) => <Pill text={i.severity} color={SEV_COLOR[i.severity] || '#7A7468'} /> },
    { key: 'title', label: 'Incident', render: (i) => <span className="font-medium text-empire-text">{i.title}</span> },
    { key: 'service', label: 'Service', render: (i) => <span className="text-empire-text-muted">{i.service}</span> },
    { key: 'cause', label: 'Cause', render: (i) => <span className="text-empire-text-muted">{i.cause || '—'}</span> },
    { key: 'ttrHours', label: 'MTTR', align: 'right', render: (i) => <span className="text-empire-text-muted">{i.ttrHours != null ? `${i.ttrHours}h` : '—'}</span> },
    { key: 'status', label: 'Status', align: 'right', render: (i) => i.status === 'resolved'
        ? <Pill text="resolved" color="#C9A233" />
        : <button onClick={() => resolve(i.id)} className="text-xs px-2 py-1 rounded border border-empire-border text-empire-text-muted hover:text-empire-text">Resolve</button> },
    { key: 'actions', label: '', align: 'right', render: (i) => (
      <RowActions onView={() => setViewing(i)} onDelete={() => remove(i.id)} deleteLabel={`incident “${i.title}”`} />
    ) },
  ]
  return (
    <div className="space-y-4">
      <Panel title="Declare an incident" icon="alert">
        <div className="flex flex-wrap gap-2 items-end">
          <select className="bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
            <option value="">Service…</option>
            {(services || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text w-64" placeholder="What happened?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            <option value="sev1">sev1</option><option value="sev2">sev2</option><option value="sev3">sev3</option><option value="sev4">sev4</option>
          </select>
          <select className="bg-empire-bg-soft border border-empire-border rounded px-2 py-1.5 text-sm text-empire-text" value={form.cause} onChange={(e) => setForm({ ...form, cause: e.target.value })}>
            <option value="deploy">deploy</option><option value="infra">infra</option><option value="dependency">dependency</option><option value="human">human</option><option value="unknown">unknown</option>
          </select>
          <button disabled={busy || !form.serviceId || !form.title.trim()} onClick={submit} title={!form.serviceId ? 'Pick a service first' : !form.title.trim() ? 'Describe what happened' : undefined} className="empire-btn-primary px-3 py-1.5 text-sm disabled:opacity-40">{busy ? 'Declaring…' : 'Declare'}</button>
        </div>
        {(services || []).length === 0 && (
          <p className="mt-2 text-xs text-empire-text-muted">No services yet — add one in the Services tab before declaring an incident.</p>
        )}
      </Panel>
      <Panel title={`Incidents (${data?.total ?? rows.length})`} icon="alert">
        <DataTable columns={cols} rows={rows} empty="No incidents — clean record." />
        {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
      </Panel>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title || 'Incident'} icon={<EmpireIcon name="alert" size={18} />}>
        {viewing && (
          <div className="space-y-0.5">
            <Field label="Title">{viewing.title}</Field>
            <Field label="Service">{viewing.service}</Field>
            <Field label="Severity"><Pill text={viewing.severity} color={SEV_COLOR[viewing.severity] || '#7A7468'} /></Field>
            <Field label="Status"><span className="capitalize">{viewing.status}</span></Field>
            <Field label="Cause">{viewing.cause || '—'}</Field>
            <Field label="MTTR">{viewing.ttrHours != null ? `${viewing.ttrHours}h` : '—'}</Field>
            <Field label="Detected">{new Date(viewing.detectedAt).toLocaleString()}</Field>
            <Field label="Resolved">{viewing.resolvedAt ? new Date(viewing.resolvedAt).toLocaleString() : '—'}</Field>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ---------------- Sprints ---------------- */
type Spr = { id: string; name: string; goal: string | null; status: string; startDate: string; endDate: string; committedPoints: number; completedPoints: number; velocityPct: number }
function Sprints() {
  const { data, loading, reload } = useEng<Spr[]>('sprints')
  const [viewing, setViewing] = useState<Spr | null>(null)
  const [editing, setEditing] = useState<Spr | null>(null)
  async function remove(id: string) { await del(`/api/engineering/sprints/${id}`).catch(console.error); reload() }
  if (loading) return <Loading />
  const rows = data || []
  const done = rows.filter((s) => s.status === 'completed')
  const avgVel = done.length ? Math.round(done.reduce((a, s) => a + s.velocityPct, 0) / done.length) : 0
  return (
    <div className="space-y-4">
      <Grid cols={3}>
        <KpiCard label="Avg Velocity" value={`${avgVel}%`} sub="completed sprints" accent={ACCENT} icon="gauge" />
        <KpiCard label="Sprints Tracked" value={String(rows.length)} accent={ACCENT} icon="flag" />
        <KpiCard label="Throughput" value={String(done.length ? Math.round(done.reduce((a, s) => a + s.completedPoints, 0) / done.length) : 0)} sub="avg pts / sprint" accent={ACCENT} icon="chart-bar" />
      </Grid>
      <Panel title="Sprint History" icon="flag">
        <div className="space-y-3">
          {rows.map((s) => (
            <div key={s.id} className="border border-empire-border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-empire-text">{s.name}</span>
                  <Pill text={s.status} color={s.status === 'active' ? ACCENT : s.status === 'completed' ? '#C9A233' : '#7A7468'} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-empire-text-muted text-xs">{s.completedPoints} / {s.committedPoints} pts · {s.velocityPct}%</span>
                  <RowActions size={14} onView={() => setViewing(s)} onEdit={() => setEditing(s)} onDelete={() => remove(s.id)} deleteLabel={`the “${s.name}” sprint`} />
                </div>
              </div>
              {s.goal && <div className="text-empire-text-muted text-xs mb-2">{s.goal}</div>}
              <ProgressBar value={s.completedPoints} max={s.committedPoints} color={s.velocityPct >= 90 ? '#C9A233' : s.velocityPct >= 70 ? ACCENT : '#c9a233'} />
            </div>
          ))}
          {!rows.length && <EmptyState icon="flag" title="No sprints yet" />}
        </div>
      </Panel>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || 'Sprint'} icon={<EmpireIcon name="flag" size={18} />}>
        {viewing && (
          <div className="space-y-0.5">
            <Field label="Name">{viewing.name}</Field>
            <Field label="Status"><span className="capitalize">{viewing.status}</span></Field>
            <Field label="Goal">{viewing.goal || '—'}</Field>
            <Field label="Committed">{viewing.committedPoints} pts</Field>
            <Field label="Completed">{viewing.completedPoints} pts</Field>
            <Field label="Velocity">{viewing.velocityPct}%</Field>
            <Field label="Window">{new Date(viewing.startDate).toLocaleDateString()} → {new Date(viewing.endDate).toLocaleDateString()}</Field>
          </div>
        )}
      </Modal>
      <SprintEdit sprint={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />
    </div>
  )
}

function SprintEdit({ sprint, onClose, onSaved }: { sprint: Spr | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Record<string, any>>({})
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (sprint) setF({ name: sprint.name, goal: sprint.goal ?? '', status: sprint.status, committedPoints: sprint.committedPoints, completedPoints: sprint.completedPoints }) }, [sprint])
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }))
  async function save() {
    if (!sprint) return
    setBusy(true)
    await patch(`/api/engineering/sprints/${sprint.id}`, { ...f, committedPoints: Number(f.committedPoints) || 0, completedPoints: Number(f.completedPoints) || 0 }).catch(console.error)
    setBusy(false); onSaved()
  }
  return (
    <Modal open={!!sprint} onClose={onClose} title="Edit sprint" icon={<EmpireIcon name="pen" size={18} />}>
      <div className="space-y-3">
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Name</span>
          <input className={modalInput} value={f.name ?? ''} placeholder="Sprint 24" onChange={e => set('name', e.target.value)} /></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Goal</span>
          <textarea className={modalInput} rows={2} value={f.goal ?? ''} onChange={e => set('goal', e.target.value)} /></label>
        <div className="grid grid-cols-3 gap-3">
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Status</span>
            <select className={modalInput} value={f.status ?? ''} onChange={e => set('status', e.target.value)}>
              {['planned', 'active', 'completed'].map(s => <option key={s} value={s}>{s}</option>)}
            </select></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Committed</span>
            <input type="number" className={modalInput} value={f.committedPoints ?? ''} placeholder="0" onChange={e => set('committedPoints', e.target.value)} /></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Completed</span>
            <input type="number" className={modalInput} value={f.completedPoints ?? ''} placeholder="0" onChange={e => set('completedPoints', e.target.value)} /></label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy} className="rounded px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-50" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  )
}
