'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useAuth, userCan } from '@/lib/auth'
import { fetcher, post, patch, del } from '@/lib/api'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { LiquidMetalButton } from '@/components/atoms/LiquidMetalButton'
import { Modal } from '@/components/molecules/Modal'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { TabBar } from '@/components/templates/TabBar'

/* ---------- types ---------- */
type ChannelStatus = { slack: boolean; telegram: boolean }
type AgentStatus = { name: string; codename: string; role: string; channels: ChannelStatus; note: string }
type AgentMessage = {
  id: string; direction: string; channel: string; body: string; sentBy: string
  kind: string; status: string; delivery: string | null; approvalId: string | null; createdAt: string
  rating?: string | null
}
type Approval = {
  id: string; requestedBy: string; title: string; description: string; category: string
  priority: string; status: string; joudDecision: string | null; createdAt: string
}
type Unit = { id: string; name: string; slug: string }
type Agent = {
  id: string; name: string; codename: string | null; kind: string; role: string
  status: string; bio: string | null; departmentId: string | null
  department: Unit | null; _count?: { messages: number }; createdAt: string
  permissions?: string[] | null
  createdBy?: { id: string; name: string; email: string } | null
}
type AgentInsights = {
  agentId: string; name: string; interactions: number; rated: number; good: number; bad: number
  score: number | null; guidance: string
  recentRated: { id: string; body: string; channel: string; kind: string; rating: string; ratedAt: string }[]
}

const KINDS = ['bot']
const AGENT_STATUSES = ['active', 'paused', 'archived']
// Mirrors the API's PERMISSIONS catalog — the keys an agent can be granted.
// The form only offers keys the CALLER holds; the server re-validates (§H2).
const CAPABILITY_KEYS = ['iam:manage', 'company:manage', 'finance:read', 'finance:write', 'approvals:decide', 'contracts:write', 'people:write', 'units:write', 'agent:act']

const PAGE_SIZE = 10
const field = 'w-full rounded-lg border border-empire-border bg-empire-surface/60 px-3 py-2 text-sm text-empire-text placeholder:text-empire-text-dim outline-none transition-colors focus:border-empire-gold/50'
const label = 'mb-1 block text-[10px] uppercase tracking-widest text-empire-text-muted'
const PRIORITIES = ['low', 'normal', 'high', 'critical']
const CATEGORIES = ['Operations', 'Finance', 'HR', 'Legal', 'Strategy', 'Marketing']

/**
 * /agent — the Operator Console. Lukas Beckers ("Rodiak") runs day-to-day work
 * under the Throne's approval gates. From here the operator broadcasts messages
 * to Slack/Telegram, raises approval requests, watches the live approval queue
 * (approve/reject), and replays the durable agent message log. Write actions
 * need `agent:act` (messaging / raising) or `approvals:decide` (verdicts); the
 * server enforces the same gates.
 */
export default function AgentPage() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState('console')
  const [status, setStatus] = useState<AgentStatus | null>(null)

  const canAct = userCan(user, 'agent:act') || userCan(user, '*')
  const canDecide = userCan(user, 'approvals:decide') || userCan(user, '*')

  useEffect(() => { fetcher('/api/agent/status').then(setStatus).catch(() => {}) }, [])

  if (loading) return null

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-3 animate-slide-up">
        <span className="medallion grid place-items-center" style={{ width: 46, height: 46 }}>
          <EmpireIcon name="sparkle" size={20} className="relative z-10 text-empire-gold" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-empire text-2xl tracking-wide text-empire-text">{status?.name || 'Operator'} <span className="text-empire-text-dim">· {status?.codename || 'Rodiak'}</span></h1>
          <p className="text-xs uppercase tracking-widest text-empire-text-muted">{status?.role || 'AI Operator'} — runs operations under Throne gates</p>
        </div>
        {status && <ChannelBadges channels={status.channels} />}
      </header>

      <TabBar
        tabs={[
          { id: 'console', label: 'Console', icon: 'sparkle' },
          { id: 'capabilities', label: 'Capabilities', icon: 'shield' },
          { id: 'roster', label: 'Agents', icon: 'user' },
          { id: 'approvals', label: 'Approvals', icon: 'scales' },
          { id: 'log', label: 'Message log', icon: 'document' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'console' && <ConsoleTab canAct={canAct} channels={status?.channels} />}
      {tab === 'capabilities' && <CapabilitiesTab canAct={canAct} />}
      {tab === 'roster' && <RosterTab canAct={canAct} />}
      {tab === 'approvals' && <ApprovalQueue canAct={canAct} canDecide={canDecide} />}
      {tab === 'log' && <MessageLog canAct={canAct} />}
    </main>
  )
}

/* ============================ CAPABILITIES (§19 boundaries) ============================ */
type Capability = {
  key: string; label: string; description: string
  permission: string | null; scope: 'company' | 'global'
  deptScoped: boolean; approvalGated: boolean; enabled: boolean; allowed: boolean
}
type CapabilityManifest = {
  agent: string; codename: string
  boundaries: { scope: string; gating: string; auth: string }
  capabilities: Capability[]
}
type ReportDigest = {
  company: string; headcount: number; monthlyPayroll: number; activeDeals: number
  pipelineValue: number; wonDeals: number; agentActions7d: number
  approvalsRaised: number; generatedAt: string
}

/**
 * The permission-boundary matrix (§19). Renders the agent's declared capability
 * manifest from `/api/agent/capabilities` — each action with its required
 * permission, scope, gating, and a caller-resolved Allowed/Blocked badge — so the
 * boundary is introspectable, not implicit. Operators (`agent:act`) can also run a
 * live operational report here; the digest renders inline (viewable, no dead-end)
 * and is persisted to the message log.
 */
function CapabilitiesTab({ canAct }: { canAct: boolean }) {
  const [manifest, setManifest] = useState<CapabilityManifest | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<ReportDigest | null>(null)
  const [reportErr, setReportErr] = useState<string | null>(null)
  const [broadcast, setBroadcast] = useState(false)

  useEffect(() => { fetcher('/api/agent/capabilities').then(setManifest).catch(e => setErr(e?.message || 'Failed to load capabilities')) }, [])

  async function generate() {
    setReportErr(null); setReport(null); setBusy(true)
    try {
      const res = await post('/api/agent/report', { broadcast })
      setReport(res?.report || null)
    } catch (e: any) { setReportErr(e?.message || 'Report failed') } finally { setBusy(false) }
  }

  return (
    <section className="animate-fade-in space-y-4">
      {err && <ErrBar msg={err} />}

      {manifest && (
        <GlassPanel className="p-5">
          <h2 className="font-empire text-lg text-empire-text">Permission boundaries</h2>
          <p className="mt-1 text-xs text-empire-text-muted">
            What {manifest.agent} ({manifest.codename}) may do — and the gate each action sits behind. Resolved against your role.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <BoundaryNote icon="compass" title="Scope" text={manifest.boundaries.scope} />
            <BoundaryNote icon="scales" title="Gating" text={manifest.boundaries.gating} />
            <BoundaryNote icon="lock" title="Auth" text={manifest.boundaries.auth} />
          </div>
        </GlassPanel>
      )}

      {manifest && (
        <GlassPanel className="overflow-hidden p-0">
          <div className="divide-y divide-empire-border/50">
            {manifest.capabilities.map(c => (
              <div key={c.key} className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <EmpireIcon name="shield" size={14} className="shrink-0 text-empire-gold" />
                  <p className="min-w-0 flex-1 truncate text-sm text-empire-text">{c.label}</p>
                  {!c.enabled
                    ? <CapBadge tone="muted" text="Roadmap" />
                    : c.allowed
                      ? <CapBadge tone="green" text="Allowed" />
                      : <CapBadge tone="red" text="Blocked" />}
                </div>
                <p className="mt-1 pl-6 text-xs text-empire-text-muted">{c.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
                  <CapBadge tone="border" text={c.permission ? c.permission : 'read · any user'} mono />
                  <CapBadge tone="border" text={`scope: ${c.scope}`} />
                  {c.deptScoped && <CapBadge tone="border" text="unit-scoped" />}
                  {c.approvalGated && <CapBadge tone="amber" text="Throne-gated" />}
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      <GlassPanel className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-empire text-lg text-empire-text">Operational report</h2>
          {canAct && (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-empire-text-muted">
              <input type="checkbox" checked={broadcast} onChange={() => setBroadcast(v => !v)} className="accent-empire-gold" />
              Broadcast to channels
            </label>
          )}
        </div>
        <p className="text-xs text-empire-text-muted">
          A live, company-scoped digest compiled from real data (headcount, payroll, pipeline, recent agent activity). Saved to the message log.
        </p>
        {!canAct && <div className="mt-3"><Locked perm="agent:act" verb="generate operational reports" /></div>}
        {canAct && (
          <div className="mt-4">
            <LiquidMetalButton variant="gold" size="sm" icon={<EmpireIcon name="document" size={14} />} onClick={generate} disabled={busy}>
              {busy ? 'Compiling…' : 'Generate report'}
            </LiquidMetalButton>
            {reportErr && <div className="mt-3"><ErrBar msg={reportErr} /></div>}
            {report && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ReportStat label="Headcount" value={report.headcount.toLocaleString()} />
                <ReportStat label="Monthly payroll" value={report.monthlyPayroll.toLocaleString()} />
                <ReportStat label="Open pipeline" value={`${report.activeDeals} · ${report.pipelineValue.toLocaleString()}`} />
                <ReportStat label="Won deals" value={report.wonDeals.toLocaleString()} />
                <ReportStat label="Agent actions · 7d" value={report.agentActions7d.toLocaleString()} />
                <ReportStat label="Approvals raised" value={report.approvalsRaised.toLocaleString()} />
                <ReportStat label="Scope" value={report.company} mono />
                <ReportStat label="Generated" value={new Date(report.generatedAt).toLocaleTimeString()} />
              </div>
            )}
          </div>
        )}
      </GlassPanel>
    </section>
  )
}

function BoundaryNote({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-empire-border bg-empire-surface/40 px-3 py-2.5">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-empire-text-muted">
        <EmpireIcon name={icon as any} size={12} className="text-empire-gold" />{title}
      </p>
      <p className="text-[11px] leading-relaxed text-empire-text-dim">{text}</p>
    </div>
  )
}

function CapBadge({ tone, text, mono }: { tone: 'green' | 'red' | 'amber' | 'muted' | 'border'; text: string; mono?: boolean }) {
  const cls = tone === 'green' ? 'border-rag-green/40 bg-rag-green/10 text-rag-green'
    : tone === 'red' ? 'border-empire-red/40 bg-empire-red/10 text-empire-red-bright'
      : tone === 'amber' ? 'border-rag-amber/40 bg-rag-amber/10 text-rag-amber'
        : tone === 'muted' ? 'border-empire-border bg-empire-surface/40 text-empire-text-dim'
          : 'border-empire-border text-empire-text-muted'
  return <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest ${mono ? 'font-data lowercase tracking-normal' : ''} ${cls}`}>{text}</span>
}

function ReportStat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-empire-border bg-empire-surface/40 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-widest text-empire-text-muted">{label}</p>
      <p className={`mt-1 text-sm text-empire-text ${mono ? 'font-data' : 'font-empire'}`}>{value}</p>
    </div>
  )
}

/* ============================ CONSOLE ============================ */
function ConsoleTab({ canAct, channels }: { canAct: boolean; channels?: ChannelStatus }) {
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState('normal')
  const [toSlack, setToSlack] = useState(true)
  const [toTelegram, setToTelegram] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [raiseOpen, setRaiseOpen] = useState(false)

  async function send() {
    if (!body.trim()) return
    setErr(null); setResult(null); setBusy(true)
    try {
      const sel: string[] = []
      if (toSlack) sel.push('slack'); if (toTelegram) sel.push('telegram')
      const res = await post('/api/agent/message', { body, priority, channels: sel.length === 2 ? undefined : sel })
      setResult(res?.message?.delivery || 'sent')
      setBody('')
    } catch (e: any) { setErr(e?.message || 'Send failed') } finally { setBusy(false) }
  }

  if (!canAct) return <Locked perm="agent:act" verb="message through the operator" />

  return (
    <section className="animate-fade-in space-y-4">
      <GlassPanel className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-empire text-lg text-empire-text">Broadcast a message</h2>
          <button onClick={() => setRaiseOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-empire-border px-3 py-1.5 text-xs text-empire-text-muted transition-colors hover:border-empire-gold/40 hover:text-empire-text">
            <EmpireIcon name="scales" size={14} /> Raise approval
          </button>
        </div>
        <textarea className={`${field} min-h-[96px] resize-y`} value={body} onChange={e => setBody(e.target.value)}
          placeholder="What should the operator relay to the team channels?" />
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <ChannelToggle label="Slack" on={toSlack} live={channels?.slack} onToggle={() => setToSlack(v => !v)} />
            <ChannelToggle label="Telegram" on={toTelegram} live={channels?.telegram} onToggle={() => setToTelegram(v => !v)} />
          </div>
          <div className="flex items-center gap-2">
            <span className={label.replace('mb-1 block ', '')}>Priority</span>
            <select className={`${field} w-auto py-1.5`} value={priority} onChange={e => setPriority(e.target.value)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="ml-auto">
            <LiquidMetalButton variant="gold" size="sm" icon={<EmpireIcon name="arrow-up" size={14} />} onClick={send} disabled={busy || !body.trim()}>
              {busy ? 'Sending…' : 'Send'}
            </LiquidMetalButton>
          </div>
        </div>
        {result && <DeliveryNote text={result} />}
        {err && <ErrBar msg={err} />}
        {channels && !channels.slack && !channels.telegram && (
          <p className="mt-3 rounded-lg border border-empire-border bg-empire-surface/40 px-3 py-2 text-[11px] text-empire-text-muted">
            No channels are connected yet — messages are logged but not delivered. Set <span className="font-data">SLACK_WEBHOOK_URL</span> / <span className="font-data">TELEGRAM_BOT_TOKEN</span> + <span className="font-data">TELEGRAM_CHAT_ID</span> to go live.
          </p>
        )}
      </GlassPanel>

      {raiseOpen && <RaiseApprovalModal onClose={() => setRaiseOpen(false)} onDone={() => setRaiseOpen(false)} />}
    </section>
  )
}

function RaiseApprovalModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [priority, setPriority] = useState('normal')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (!title.trim()) return
    setErr(null); setBusy(true)
    try { await post('/api/agent/request-approval', { title, description, category, priority }); onDone() }
    catch (e: any) { setErr(e?.message || 'Failed to raise approval') } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title="Raise an approval" icon={<EmpireIcon name="scales" size={18} />}>
      <div className="space-y-3.5">
        <div><label className={label}>Title</label><input className={field} value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs the Throne's sign-off?" /></div>
        <div><label className={label}>Detail</label><textarea className={`${field} min-h-[72px] resize-y`} value={description} onChange={e => setDescription(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Category</label>
            <select className={field} value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          </div>
          <div>
            <label className={label}>Priority</label>
            <select className={field} value={priority} onChange={e => setPriority(e.target.value)}>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select>
          </div>
        </div>
        <p className="text-[11px] text-empire-text-muted">This creates a pending approval and notifies the connected channels.</p>
        {err && <ErrBar msg={err} />}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg px-3.5 py-2 text-xs text-empire-text-muted transition-colors hover:text-empire-text">Cancel</button>
          <LiquidMetalButton variant="gold" size="sm" icon={<EmpireIcon name="check" size={14} />} onClick={submit} disabled={busy || !title.trim()}>
            {busy ? 'Raising…' : 'Raise'}
          </LiquidMetalButton>
        </div>
      </div>
    </Modal>
  )
}

/* ============================ APPROVAL QUEUE ============================ */
function ApprovalQueue({ canAct, canDecide }: { canAct: boolean; canDecide: boolean }) {
  const [rows, setRows] = useState<Approval[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    try { setRows((await fetcher('/api/approvals')) || []) }
    catch (e: any) { setErr(e?.message || 'Failed to load approvals') }
  }, [])
  useEffect(() => { load() }, [load])

  async function decide(id: string, status: 'approved' | 'rejected') {
    setBusyId(id)
    try { await patch(`/api/approvals/${id}/decide`, { status }); await load() }
    catch (e: any) { setErr(e?.message || 'Decision failed') } finally { setBusyId(null) }
  }

  const pending = rows.filter(r => r.status === 'pending')
  const decided = rows.filter(r => r.status !== 'pending')

  return (
    <section className="animate-fade-in space-y-4">
      {err && <ErrBar msg={err} />}
      <div className="flex items-center justify-between">
        <p className="text-sm text-empire-text-muted">{pending.length} awaiting the Throne · {decided.length} decided</p>
      </div>

      <div className="space-y-2.5">
        {pending.map(a => (
          <GlassPanel key={a.id} variant="gold" className="p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-medium text-empire-text">{a.title}</h3>
                  <PriorityTag p={a.priority} />
                </div>
                <p className="mt-0.5 text-xs text-empire-text-muted">{a.category} · by {a.requestedBy}</p>
                {a.description && <p className="mt-1.5 text-xs text-empire-text-muted">{a.description}</p>}
              </div>
              {canDecide ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => decide(a.id, 'rejected')} disabled={busyId === a.id}
                    className="rounded-lg border border-empire-red/40 px-3 py-1.5 text-xs text-empire-red-bright transition-colors hover:bg-empire-red/10 disabled:opacity-50">Reject</button>
                  <LiquidMetalButton variant="gold" size="sm" icon={<EmpireIcon name="check" size={13} />} onClick={() => decide(a.id, 'approved')} disabled={busyId === a.id}>Approve</LiquidMetalButton>
                </div>
              ) : (
                <span className="rounded-full border border-empire-border px-2.5 py-1 text-[10px] uppercase tracking-widest text-empire-text-dim">view only</span>
              )}
            </div>
          </GlassPanel>
        ))}
        {pending.length === 0 && !err && (
          <GlassPanel className="p-8 text-center text-sm text-empire-text-muted">No approvals awaiting the Throne.</GlassPanel>
        )}
      </div>

      {decided.length > 0 && (
        <div>
          <p className="mb-2 mt-2 text-[10px] uppercase tracking-widest text-empire-text-muted">Recently decided</p>
          <GlassPanel className="overflow-hidden p-0">
            <div className="divide-y divide-empire-border/50">
              {decided.slice(0, 12).map(a => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${a.status === 'approved' ? 'bg-rag-green' : 'bg-rag-red'}`} />
                  <p className="min-w-0 flex-1 truncate text-xs text-empire-text">{a.title}</p>
                  <span className="text-[10px] uppercase tracking-widest text-empire-text-dim">{a.status}</span>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      )}
      {!canAct && !canDecide && <p className="text-[11px] text-empire-text-dim">You can view the queue; deciding needs the <span className="font-data">approvals:decide</span> permission.</p>}
    </section>
  )
}

/* ============================ MESSAGE LOG ============================ */
function MessageLog({ canAct }: { canAct: boolean }) {
  const [rows, setRows] = useState<AgentMessage[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [err, setErr] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const r = await fetcher(`/api/agent/messages?page=${page + 1}&pageSize=${PAGE_SIZE}`)
      setRows(r.data || []); setTotal(r.total || 0); setTotalPages(r.totalPages || 1)
    } catch (e: any) { setErr(e?.message || 'Failed to load log') }
  }, [page])
  useEffect(() => { load() }, [load])

  // §H6 — rate an interaction good/bad (click again to clear). Feeds the
  // per-agent quality history shown in the agent viewer.
  async function rate(m: AgentMessage, rating: 'good' | 'bad') {
    setBusyId(m.id)
    try { await patch(`/api/agent/messages/${m.id}/rating`, { rating: m.rating === rating ? null : rating }); await load() }
    catch (e: any) { setErr(e?.message || 'Rating failed') } finally { setBusyId(null) }
  }

  return (
    <section className="animate-fade-in">
      {err && <ErrBar msg={err} />}
      <GlassPanel className="overflow-hidden p-0">
        <div className="divide-y divide-empire-border/50">
          {rows.map(m => (
            <div key={m.id} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <EmpireIcon name={m.kind === 'approval_request' ? 'scales' : 'sparkle'} size={14} className="shrink-0 text-empire-gold" />
                <p className="min-w-0 flex-1 truncate text-sm text-empire-text">{m.body}</p>
                {canAct && (
                  <span className="flex shrink-0 items-center gap-1">
                    <button onClick={() => rate(m, 'good')} disabled={busyId === m.id} aria-label="Rate good" title="Rate good"
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] transition-colors ${m.rating === 'good' ? 'border-rag-green/60 bg-rag-green/15 text-rag-green' : 'border-empire-border text-empire-text-dim hover:border-rag-green/40 hover:text-rag-green'}`}>👍</button>
                    <button onClick={() => rate(m, 'bad')} disabled={busyId === m.id} aria-label="Rate bad" title="Rate bad"
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] transition-colors ${m.rating === 'bad' ? 'border-empire-red/60 bg-empire-red/15 text-empire-red-bright' : 'border-empire-border text-empire-text-dim hover:border-empire-red/40 hover:text-empire-red-bright'}`}>👎</button>
                  </span>
                )}
                <StatusTag status={m.status} />
              </div>
              <p className="mt-1 pl-6 font-data text-[10px] text-empire-text-dim">
                {m.sentBy} · {m.channel} · {new Date(m.createdAt).toLocaleString()}{m.delivery ? ` · ${m.delivery}` : ''}
              </p>
            </div>
          ))}
          {rows.length === 0 && !err && <p className="px-4 py-10 text-center text-sm text-empire-text-muted">No messages sent yet.</p>}
        </div>
      </GlassPanel>
      <Pagination page={page} pageCount={totalPages} total={total} onPage={setPage} />
    </section>
  )
}

/* ============================ ROSTER (multi-agent CRUD) ============================ */
function RosterTab({ canAct }: { canAct: boolean }) {
  const [rows, setRows] = useState<Agent[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [kind, setKind] = useState<string>('')
  const [err, setErr] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Agent | null>(null)
  const [viewing, setViewing] = useState<Agent | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const qs = new URLSearchParams({ page: String(page + 1), pageSize: String(PAGE_SIZE) })
      if (kind) qs.set('kind', kind)
      const r = await fetcher(`/api/agents?${qs.toString()}`)
      setRows(r.data || []); setTotal(r.total || 0); setTotalPages(r.totalPages || 1)
    } catch (e: any) { setErr(e?.message || 'Failed to load agents') }
  }, [page, kind])
  useEffect(() => { load() }, [load])
  useEffect(() => { fetcher('/api/departments').then((d) => setUnits(d || [])).catch(() => {}) }, [])

  async function remove(id: string) {
    try { await del(`/api/agents/${id}`); await load() }
    catch (e: any) { setErr(e?.message || 'Delete failed') }
  }

  return (
    <section className="animate-fade-in space-y-4">
      {err && <ErrBar msg={err} />}
      <GlassPanel className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-empire-border p-0.5">
            {['', ...KINDS].map((k) => (
              <button key={k || 'all'} onClick={() => { setKind(k); setPage(0) }}
                className={`rounded-md px-2.5 py-1 text-[11px] uppercase tracking-widest transition-colors ${kind === k ? 'bg-empire-gold/15 text-empire-gold' : 'text-empire-text-dim hover:text-empire-text'}`}>
                {k || 'all'}
              </button>
            ))}
          </div>
          <p className="text-sm text-empire-text-muted">{total} agent{total === 1 ? '' : 's'}</p>
          {canAct && (
            <div className="ml-auto">
              <LiquidMetalButton variant="gold" size="sm" icon={<EmpireIcon name="user" size={14} />}
                onClick={() => { setEditing(null); setFormOpen(true) }}>Onboard agent</LiquidMetalButton>
            </div>
          )}
        </div>
      </GlassPanel>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {rows.map((a) => (
          <GlassPanel key={a.id} className="p-4">
            <div className="flex items-start gap-3">
              <span className="medallion grid shrink-0 place-items-center" style={{ width: 38, height: 38 }}>
                <EmpireIcon name="sparkle" size={16} className="relative z-10 text-empire-gold" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-medium text-empire-text">{a.name}</h3>
                  {a.codename && <span className="truncate text-xs text-empire-text-dim">· {a.codename}</span>}
                  <KindTag kind={a.kind} />
                </div>
                <p className="mt-0.5 truncate text-xs text-empire-text-muted">{a.role}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <AgentStatusTag status={a.status} />
                  {a.department
                    ? <span className="flex items-center gap-1 rounded-full border border-empire-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-empire-text-muted"><EmpireIcon name="link" size={11} />{a.department.name}</span>
                    : <span className="rounded-full border border-empire-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-empire-text-dim">unassigned</span>}
                  {a.createdBy && <span className="rounded-full border border-empire-border px-2 py-0.5 text-[10px] tracking-widest text-empire-text-dim">by {a.createdBy.name}</span>}
                  {typeof a._count?.messages === 'number' && <span className="font-data text-[10px] text-empire-text-dim">{a._count.messages} msgs</span>}
                </div>
              </div>
              <RowActions
                onView={() => setViewing(a)}
                onEdit={canAct ? () => { setEditing(a); setFormOpen(true) } : undefined}
                onDelete={canAct ? () => remove(a.id) : undefined}
                deleteLabel={`agent ${a.name}`}
              />
            </div>
          </GlassPanel>
        ))}
        {rows.length === 0 && !err && (
          <GlassPanel className="p-8 text-center text-sm text-empire-text-muted sm:col-span-2">No agents yet. {canAct ? 'Onboard the first operator.' : ''}</GlassPanel>
        )}
      </div>
      <Pagination page={page} pageCount={totalPages} total={total} onPage={setPage} />

      {formOpen && <AgentForm agent={editing} units={units} onClose={() => setFormOpen(false)} onDone={() => { setFormOpen(false); load() }} />}
      {viewing && <AgentViewer agent={viewing} onClose={() => setViewing(null)} />}
    </section>
  )
}

function AgentForm({ agent, units, onClose, onDone }: { agent: Agent | null; units: Unit[]; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth()
  const [name, setName] = useState(agent?.name || '')
  const [codename, setCodename] = useState(agent?.codename || '')
  const [kind, setKind] = useState(agent?.kind || 'bot')
  const [role, setRole] = useState(agent?.role || 'Operator')
  const [statusV, setStatusV] = useState(agent?.status || 'active')
  const [departmentId, setDepartmentId] = useState(agent?.departmentId || '')
  const [bio, setBio] = useState(agent?.bio || '')
  const [perms, setPerms] = useState<string[]>(Array.isArray(agent?.permissions) ? agent!.permissions! : [])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // You can only delegate capabilities you personally hold (§H2) — the server
  // enforces this too; the form simply doesn't offer what would be rejected.
  const grantable = CAPABILITY_KEYS.filter(k => userCan(user, k) || userCan(user, '*'))

  function togglePerm(k: string) {
    setPerms(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k])
  }

  async function submit() {
    if (!name.trim() || !departmentId) return
    setErr(null); setBusy(true)
    const payload = { name, codename, kind, role, status: statusV, bio, departmentId, permissions: perms }
    try {
      if (agent) await patch(`/api/agents/${agent.id}`, payload)
      else await post('/api/agents', payload)
      onDone()
    } catch (e: any) { setErr(e?.message || 'Save failed') } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={agent ? 'Edit agent' : 'Onboard an agent'} icon={<EmpireIcon name="user" size={18} />}>
      <div className="space-y-3.5">
        <div><label className={label}>Name</label><input className={field} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lukas Beckers" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Codename</label><input className={field} value={codename} onChange={e => setCodename(e.target.value)} placeholder="optional" /></div>
          <div><label className={label}>Role</label><input className={field} value={role} onChange={e => setRole(e.target.value)} placeholder="AI Operator" /></div>
        </div>
        <div>
          <label className={label}>Type</label>
          <div className="flex items-center gap-1 rounded-lg border border-empire-border p-0.5">
            {KINDS.map(k => (
              <button key={k} type="button" onClick={() => setKind(k)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs capitalize transition-colors ${kind === k ? 'bg-empire-gold/15 text-empire-gold' : 'text-empire-text-dim hover:text-empire-text'}`}>
                <EmpireIcon name="sparkle" size={13} />{k}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Assigned Unit <span className="text-empire-gold">*</span></label>
            <select className={field} value={departmentId} onChange={e => setDepartmentId(e.target.value)} required>
              <option value="" disabled>— pick a Unit —</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            {!departmentId && <p className="mt-1 text-[10px] text-empire-text-dim">Every agent operates in a specific Unit.</p>}
          </div>
          <div>
            <label className={label}>Status</label>
            <select className={field} value={statusV} onChange={e => setStatusV(e.target.value)}>{AGENT_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}</select>
          </div>
        </div>
        <div>
          <label className={label}>Granted capabilities</label>
          <p className="mb-1.5 text-[10px] text-empire-text-dim">An agent can never hold more than you do — only your own capabilities are offered.</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {grantable.map(k => (
              <label key={k} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-empire-border px-2 py-1.5 text-[11px] text-empire-text transition-colors hover:border-empire-gold/40">
                <input type="checkbox" checked={perms.includes(k)} onChange={() => togglePerm(k)} className="accent-empire-gold" />
                <span className="font-data truncate">{k}</span>
              </label>
            ))}
          </div>
          {grantable.length === 0 && <p className="text-[11px] text-empire-text-dim">Your role holds no grantable capabilities — the agent will be read-only.</p>}
        </div>
        <div><label className={label}>Bio</label><textarea className={`${field} min-h-[64px] resize-y`} value={bio} onChange={e => setBio(e.target.value)} placeholder="What does this operator own?" /></div>
        {err && <ErrBar msg={err} />}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg px-3.5 py-2 text-xs text-empire-text-muted transition-colors hover:text-empire-text">Cancel</button>
          <LiquidMetalButton variant="gold" size="sm" icon={<EmpireIcon name="check" size={14} />} onClick={submit} disabled={busy || !name.trim() || !departmentId}>
            {busy ? 'Saving…' : agent ? 'Save' : 'Onboard'}
          </LiquidMetalButton>
        </div>
      </div>
    </Modal>
  )
}

function AgentViewer({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const [insights, setInsights] = useState<AgentInsights | null>(null)
  useEffect(() => { fetcher(`/api/agents/${agent.id}/insights`).then(setInsights).catch(() => {}) }, [agent.id])
  const granted = Array.isArray(agent.permissions) ? agent.permissions : []
  return (
    <Modal open onClose={onClose} title={agent.name} icon={<EmpireIcon name={agent.kind === 'bot' ? 'sparkle' : 'user'} size={18} />}>
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2"><KindTag kind={agent.kind} /><AgentStatusTag status={agent.status} />{agent.codename && <span className="text-xs text-empire-text-dim">· {agent.codename}</span>}</div>
        <Detail label="Role" value={agent.role} />
        <Detail label="Assigned Unit" value={agent.department?.name || 'Unassigned'} />
        <Detail label="Created by" value={agent.createdBy ? agent.createdBy.name : 'System (platform template)'} />
        <div>
          <p className="text-[10px] uppercase tracking-widest text-empire-text-muted">Granted capabilities</p>
          {granted.length === 0
            ? <p className="mt-0.5 text-xs text-empire-text-dim">None — read-only agent.</p>
            : <div className="mt-1 flex flex-wrap gap-1.5">{granted.map(p => <span key={p} className="rounded-full border border-empire-gold/40 bg-empire-gold/10 px-2 py-0.5 font-data text-[10px] text-empire-gold">{p}</span>)}</div>}
        </div>
        {agent.bio && <Detail label="Bio" value={agent.bio} />}
        <Detail label="Messages logged" value={String(agent._count?.messages ?? 0)} />
        <Detail label="Onboarded" value={new Date(agent.createdAt).toLocaleString()} />

        {/* §H6 — interaction quality history: what this agent handled well */}
        <div className="rounded-lg border border-empire-border bg-empire-surface/40 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-empire-text-muted">
            <EmpireIcon name="sparkle" size={12} className="text-empire-gold" />Interaction quality
          </p>
          {!insights ? (
            <p className="text-xs text-empire-text-dim">Loading…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-empire text-lg text-empire-text">{insights.score === null ? '—' : `${insights.score}%`}</span>
                <span className="font-data text-[11px] text-empire-text-muted">{insights.good} good · {insights.bad} bad · {insights.interactions} total</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-empire-text-dim">{insights.guidance}</p>
              {insights.recentRated.length > 0 && (
                <div className="mt-2 space-y-1">
                  {insights.recentRated.slice(0, 5).map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.rating === 'good' ? 'bg-rag-green' : 'bg-rag-red'}`} />
                      <p className="min-w-0 flex-1 truncate text-[11px] text-empire-text-muted">{m.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
function Detail({ label: l, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-empire-text-muted">{l}</p>
      <p className="mt-0.5 text-empire-text">{value}</p>
    </div>
  )
}
function KindTag({ kind }: { kind: string }) {
  const isBot = kind === 'bot'
  return <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest ${isBot ? 'border-empire-gold/40 bg-empire-gold/10 text-empire-gold' : 'border-empire-border bg-empire-surface/60 text-empire-text-muted'}`}>{kind}</span>
}
function AgentStatusTag({ status }: { status: string }) {
  const cls = status === 'active' ? 'border-rag-green/40 bg-rag-green/10 text-rag-green'
    : status === 'paused' ? 'border-rag-amber/40 bg-rag-amber/10 text-rag-amber'
      : 'border-empire-border text-empire-text-dim'
  return <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest ${cls}`}>{status}</span>
}

/* ---------- shared bits ---------- */
function ChannelBadges({ channels }: { channels: ChannelStatus }) {
  return (
    <div className="flex items-center gap-2">
      <ChannelDot label="Slack" live={channels.slack} />
      <ChannelDot label="Telegram" live={channels.telegram} />
    </div>
  )
}
function ChannelDot({ label, live }: { label: string; live: boolean }) {
  return (
    <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-widest ${live ? 'border-rag-green/40 bg-rag-green/10 text-rag-green' : 'border-empire-border text-empire-text-dim'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-rag-green' : 'bg-empire-text-dim'}`} />{label}
    </span>
  )
}
function ChannelToggle({ label, on, live, onToggle }: { label: string; on: boolean; live?: boolean; onToggle: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-empire-text">
      <input type="checkbox" checked={on} onChange={onToggle} className="accent-empire-gold" />
      {label}{live === false && <span className="text-[9px] uppercase tracking-widest text-empire-text-dim">(offline)</span>}
    </label>
  )
}
function PriorityTag({ p }: { p: string }) {
  const cls = p === 'critical' ? 'border-empire-red/40 bg-empire-red/10 text-empire-red-bright'
    : p === 'high' ? 'border-rag-amber/40 bg-rag-amber/10 text-rag-amber'
      : 'border-empire-border text-empire-text-muted'
  return <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest ${cls}`}>{p}</span>
}
function StatusTag({ status }: { status: string }) {
  const cls = status === 'sent' ? 'border-rag-green/40 bg-rag-green/10 text-rag-green'
    : status === 'failed' ? 'border-empire-red/40 bg-empire-red/10 text-empire-red-bright'
      : status === 'partial' ? 'border-rag-amber/40 bg-rag-amber/10 text-rag-amber'
        : 'border-empire-border text-empire-text-dim'
  return <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest ${cls}`}>{status}</span>
}
function DeliveryNote({ text }: { text: string }) {
  return <p className="mt-3 rounded-lg border border-empire-gold/30 bg-empire-gold/5 px-3 py-2 font-data text-[11px] text-empire-text-muted">{text}</p>
}
function ErrBar({ msg }: { msg: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-lg border border-empire-red/40 bg-empire-red/10 px-3 py-2 text-xs text-empire-red-bright">
      <EmpireIcon name="alert" size={14} /> {msg}
    </div>
  )
}
function Locked({ perm, verb }: { perm: string; verb: string }) {
  return (
    <GlassPanel className="mt-2 flex flex-col items-center gap-2 p-10 text-center animate-fade-in">
      <EmpireIcon name="lock" size={22} className="text-empire-text-dim" />
      <p className="text-sm text-empire-text-muted">You don't have permission to {verb}.</p>
      <p className="font-data text-[11px] text-empire-text-dim">Requires <span className="text-empire-gold">{perm}</span></p>
    </GlassPanel>
  )
}
