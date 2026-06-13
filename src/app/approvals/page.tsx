'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth, userCan } from '@/lib/auth'
import { fetcher, post, patch, del } from '@/lib/api'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { LiquidMetalButton } from '@/components/atoms/LiquidMetalButton'
import { Modal } from '@/components/molecules/Modal'
import { Pagination } from '@/components/molecules/Pagination'
import { TabBar } from '@/components/templates/TabBar'
import { formatDistanceToNow } from 'date-fns'

/**
 * /approvals — the Approval Hub. The single throne-room queue where every
 * consequential action across the empire lands for Joud's decision. Lukas
 * Beckers (and any Unit) raises requests here; the Throne approves / rejects,
 * adds a discussion thread, and escalates a stalled request up the priority
 * ladder — each action re-broadcast to the operator's Slack/Telegram channels.
 *
 * Decisions need `approvals:decide`; raising needs `approvals:create` (or the
 * operator's `agent:act`). The server enforces the same gates.
 */
type Approval = {
  id: string; requestedBy: string; title: string; description: string | null
  category: string; priority: string; status: string; joudDecision: string | null
  dueBy: string | null; createdAt: string; metadata?: Record<string, unknown> | null
}
type ChannelStatus = { slack: boolean; telegram: boolean }
type Department = { id: string; name: string; slug: string }

const PAGE_SIZE = 8
const PRIORITIES = ['low', 'normal', 'high', 'critical']
const ACCENT = '#c9a233'
const field = 'w-full rounded-lg border border-empire-border bg-empire-surface/60 px-3 py-2 text-sm text-empire-text placeholder:text-empire-text-dim outline-none transition-colors focus:border-empire-gold/50'
const label = 'mb-1 block text-[10px] uppercase tracking-widest text-empire-text-muted'

const priorityColor: Record<string, string> = {
  low: 'text-empire-text-muted',
  normal: 'text-empire-text',
  high: 'text-empire-amber-bright',
  critical: 'text-empire-red-bright',
}

export default function ApprovalsPage() {
  const { user, loading } = useAuth()
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [channels, setChannels] = useState<ChannelStatus | null>(null)
  const [tab, setTab] = useState('pending')
  const [page, setPage] = useState(0)
  const [raiseOpen, setRaiseOpen] = useState(false)

  const canDecide = userCan(user, 'approvals:decide') || userCan(user, '*')
  const canRaise = !!user

  const reload = useCallback(async () => {
    const list = await fetcher('/api/approvals').catch(() => [])
    setApprovals(Array.isArray(list) ? list : [])
  }, [])

  useEffect(() => { reload() }, [reload])
  useEffect(() => { fetcher('/api/agent/status').then((s) => setChannels(s?.channels ?? null)).catch(() => {}) }, [])
  useEffect(() => { setPage(0) }, [tab])

  const counts = useMemo(() => {
    const pending = approvals.filter((a) => a.status === 'pending')
    return {
      pending: pending.length,
      urgent: pending.filter((a) => a.priority === 'high' || a.priority === 'critical').length,
      decided: approvals.filter((a) => a.status !== 'pending').length,
      total: approvals.length,
    }
  }, [approvals])

  const filtered = useMemo(() => {
    if (tab === 'all') return approvals
    return approvals.filter((a) => a.status === tab)
  }, [approvals, tab])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  if (loading) return null

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-3 animate-slide-up">
        <span className="medallion grid place-items-center" style={{ width: 46, height: 46 }}>
          <EmpireIcon name="scales" size={20} className="relative z-10 text-empire-gold" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-empire text-2xl tracking-wide text-empire-text">Approval Hub</h1>
          <p className="text-xs uppercase tracking-widest text-empire-text-muted">The Throne — every consequential action, one queue</p>
        </div>
        {channels && <ChannelBadges channels={channels} />}
        {canRaise && (
          <LiquidMetalButton onClick={() => setRaiseOpen(true)} icon={<EmpireIcon name="plus" size={14} />} className="text-xs">
            Raise request
          </LiquidMetalButton>
        )}
      </header>

      <div className="mb-6 grid grid-cols-3 gap-3 animate-slide-up">
        <HubMetric label="Pending" value={counts.pending} icon="clock" tone="amber" />
        <HubMetric label="High / Critical" value={counts.urgent} icon="flame" tone="red" />
        <HubMetric label="Decided" value={counts.decided} icon="check" tone="green" />
      </div>

      <TabBar
        tabs={[
          { id: 'pending', label: `Pending (${counts.pending})`, icon: 'clock' },
          { id: 'approved', label: 'Approved', icon: 'check' },
          { id: 'rejected', label: 'Rejected', icon: 'close' },
          { id: 'deferred', label: 'Deferred', icon: 'pin' },
          { id: 'all', label: `All (${counts.total})`, icon: 'scales' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <section className="mt-5 space-y-3 animate-fade-in">
        {pageRows.length === 0 && (
          <GlassPanel className="p-10 text-center">
            <div className="mb-2 flex justify-center text-empire-green-bright"><EmpireIcon name="check" size={26} /></div>
            <p className="text-sm text-empire-text-muted">
              {tab === 'pending' ? 'All decisions made. The empire runs smooth.' : 'Nothing here yet.'}
            </p>
          </GlassPanel>
        )}
        {pageRows.map((a) => (
          <ApprovalRow
            key={a.id}
            approval={a}
            canDecide={canDecide}
            canComment={!!user}
            channels={channels}
            onChanged={reload}
          />
        ))}
        <Pagination page={page} pageCount={pageCount} total={filtered.length} onPage={setPage} accent={ACCENT} />
      </section>

      {raiseOpen && (
        <RaiseModal
          onClose={() => setRaiseOpen(false)}
          onCreated={() => { setRaiseOpen(false); setTab('pending'); reload() }}
        />
      )}
    </main>
  )
}

/* ---------------------------------------------------------------- */

function ApprovalRow({ approval, canDecide, canComment, channels, onChanged }: {
  approval: Approval
  canDecide: boolean
  canComment: boolean
  channels: ChannelStatus | null
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const pending = approval.status === 'pending'
  const escalations = Number((approval.metadata as Record<string, unknown> | null)?.escalations) || 0
  // C13 — payroll runs surface here but are SIGNED in the Payroll panel by the
  // HR + Finance units; they auto-resolve when both sides sign, so we show the
  // signature progress and route the action there instead of a desyncing decide.
  const meta = (approval.metadata as Record<string, unknown> | null) || {}
  const isPayroll = meta.kind === 'payroll_run'
  const signed = (meta.signed as Record<string, string> | undefined) || {}

  async function decide(status: 'approved' | 'rejected' | 'deferred') {
    setBusy(true); setErr(null)
    try { await patch(`/api/approvals/${approval.id}/decide`, { status, joudDecision: note || undefined }); onChanged() }
    catch (e: any) { setErr(e?.message || 'Action failed') } finally { setBusy(false) }
  }
  async function escalate() {
    setBusy(true); setErr(null)
    try { await patch(`/api/approvals/${approval.id}/escalate`, { reason: note || undefined }); setNote(''); onChanged() }
    catch (e: any) { setErr(e?.message || 'Escalate failed') } finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true); setErr(null)
    try { await del(`/api/approvals/${approval.id}`); onChanged() }
    catch (e: any) { setErr(e?.message || 'Delete failed') } finally { setBusy(false) }
  }

  const statusTone = approval.status === 'approved' ? 'text-empire-green-bright'
    : approval.status === 'rejected' ? 'text-empire-red-bright'
    : approval.status === 'deferred' ? 'text-empire-text-muted' : 'text-empire-amber-bright'

  return (
    <GlassPanel className={`p-4 ${pending ? 'border-empire-amber/20' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-medium text-empire-text">{approval.title}</h4>
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${priorityColor[approval.priority] || ''}`}>{approval.priority}</span>
            {escalations > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-empire-red/30 bg-empire-red-bg px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-empire-red-bright">
                <EmpireIcon name="arrow-up" size={9} /> ×{escalations}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-empire-text-dim">
            <span className="text-empire-text-muted">{approval.category}</span>
            {typeof approval.metadata?.targetDepartmentName === 'string' && approval.metadata.targetDepartmentName !== approval.category && (
              <span>to {approval.metadata.targetDepartmentName}</span>
            )}
            {typeof approval.metadata?.sourceDepartmentName === 'string' && (
              <span>from {approval.metadata.sourceDepartmentName}</span>
            )}
            <span>by {approval.requestedBy}</span>
            <span>{formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true })}</span>
            {!pending && <span className={`uppercase tracking-widest ${statusTone}`}>{approval.status}</span>}
            {isPayroll && (
              <span className="inline-flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-widest ${signed.hr ? 'border-empire-green/30 bg-empire-green-bg text-empire-green-bright' : 'border-empire-border text-empire-text-muted'}`}>
                  <EmpireIcon name={signed.hr ? 'check' : 'clock'} size={9} /> HR
                </span>
                <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-widest ${signed.finance ? 'border-empire-green/30 bg-empire-green-bg text-empire-green-bright' : 'border-empire-border text-empire-text-muted'}`}>
                  <EmpireIcon name={signed.finance ? 'check' : 'clock'} size={9} /> Finance
                </span>
              </span>
            )}
          </div>
          {approval.description && <p className="mt-2 text-xs leading-relaxed text-empire-text-muted">{approval.description}</p>}
          {approval.joudDecision && (
            <p className="mt-2 rounded-md border border-empire-border/60 bg-empire-elevated/40 px-2.5 py-1.5 text-xs text-empire-text-muted">
              <span className="text-empire-gold-muted">Throne:</span> {approval.joudDecision}
            </p>
          )}
        </div>
        <button onClick={() => setOpen((o) => !o)} title="Discussion" className="shrink-0 rounded-lg border border-empire-border px-2 py-1 text-empire-text-muted transition-colors hover:border-empire-gold/40 hover:text-empire-text">
          <EmpireIcon name={open ? 'chevron-down' : 'document'} size={14} />
        </button>
      </div>

      {pending && isPayroll && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-empire-border/60 bg-empire-elevated/30 px-3 py-2 text-xs text-empire-text-muted">
          <span className="flex items-center gap-1.5"><EmpireIcon name="coins" size={13} /> Signed by the HR &amp; Finance units in the Payroll panel — resolves here automatically.</span>
          <a href="/departments/hr?tab=hr" className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-empire-border px-2.5 py-1 text-empire-text-muted transition-colors hover:border-empire-gold/50 hover:text-empire-gold">
            Payroll <EmpireIcon name="arrow-up" size={11} className="rotate-90" />
          </a>
        </div>
      )}

      {pending && !isPayroll && canDecide && (
        <div className="mt-3 space-y-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Decision / escalation note (optional)…"
            className={field}
          />
          <div className="flex flex-wrap gap-2">
            <ActBtn tone="green" icon="check" onClick={() => decide('approved')} disabled={busy}>Approve</ActBtn>
            <ActBtn tone="red" icon="close" onClick={() => decide('rejected')} disabled={busy}>Reject</ActBtn>
            <ActBtn tone="muted" icon="pin" onClick={() => decide('deferred')} disabled={busy}>Defer</ActBtn>
            <ActBtn tone="amber" icon="arrow-up" onClick={escalate} disabled={busy || approval.priority === 'critical'}>Escalate</ActBtn>
          </div>
          {channels && (
            <p className="text-[10px] uppercase tracking-widest text-empire-text-dim">
              Notifies: {channels.slack ? 'Slack' : 'Slack (off)'} · {channels.telegram ? 'Telegram' : 'Telegram (off)'}
            </p>
          )}
        </div>
      )}

      {!pending && canDecide && (
        <div className="mt-3">
          <ActBtn tone="red" icon="trash" onClick={remove} disabled={busy}>Delete</ActBtn>
        </div>
      )}

      {err && <p className="mt-2 text-xs text-empire-red-bright">{err}</p>}

      {open && <CommentThread approvalId={approval.id} canComment={canComment} />}
    </GlassPanel>
  )
}

/* ---------------------------------------------------------------- */

type Comment = { id: string; author: string; body: string; createdAt: string }

function CommentThread({ approvalId, canComment }: { approvalId: string; canComment: boolean }) {
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    fetcher(`/api/approvals/${approvalId}/comments`).then((c) => setComments(Array.isArray(c) ? c : [])).catch(() => setComments([]))
  }, [approvalId])
  useEffect(() => { load() }, [load])

  async function add() {
    if (!body.trim()) return
    setBusy(true)
    try { await post(`/api/approvals/${approvalId}/comments`, { body }); setBody(''); load() }
    finally { setBusy(false) }
  }
  async function remove(id: string) {
    await del(`/api/approvals/comments/${id}`).catch(() => {}); load()
  }

  return (
    <div className="mt-3 border-t border-empire-border/60 pt-3">
      <p className={label}>Discussion</p>
      <div className="space-y-2">
        {comments === null && <p className="text-xs text-empire-text-dim">Loading…</p>}
        {comments?.length === 0 && <p className="text-xs text-empire-text-dim">No comments yet.</p>}
        {comments?.map((c) => (
          <div key={c.id} className="group flex items-start gap-2 rounded-md bg-empire-elevated/30 px-2.5 py-1.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-empire-text">{c.author}</span>
                <span className="text-[10px] text-empire-text-dim">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
              </div>
              <p className="text-xs leading-relaxed text-empire-text-muted">{c.body}</p>
            </div>
            {canComment && (
              <button onClick={() => remove(c.id)} className="opacity-0 transition-opacity group-hover:opacity-100 text-empire-text-dim hover:text-empire-red-bright" title="Delete">
                <EmpireIcon name="trash" size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
      {canComment && (
        <div className="mt-2 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add() }}
            placeholder="Add a comment…"
            className={field}
          />
          <button onClick={add} disabled={busy || !body.trim()} className="shrink-0 rounded-lg border border-empire-gold/40 bg-empire-gold/10 px-3 text-xs uppercase tracking-widest text-empire-gold transition-colors hover:bg-empire-gold/20 disabled:opacity-40">
            Post
          </button>
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- */

function RaiseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [sourceDepartmentId, setSourceDepartmentId] = useState('')
  const [targetDepartmentId, setTargetDepartmentId] = useState('')
  const [priority, setPriority] = useState('normal')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    fetcher('/api/departments').then((d: Department[]) => {
      const rows = Array.isArray(d) ? d : []
      setDepartments(rows)
      setTargetDepartmentId(rows[0]?.id || '')
    }).catch(() => setDepartments([]))
  }, [])

  async function submit() {
    if (!title.trim()) { setErr('A title is required'); return }
    if (!targetDepartmentId) { setErr('Choose the department that should approve this'); return }
    setBusy(true); setErr(null)
    try {
      const target = departments.find(d => d.id === targetDepartmentId)
      await post('/api/approvals', { title, description, category: target?.name || 'Approval', priority, sourceDepartmentId: sourceDepartmentId || null, targetDepartmentId })
      onCreated()
    }
    catch (e: any) { setErr(e?.message || 'Could not raise request') } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title="Raise an approval">
      <div className="space-y-3">
        <div>
          <label className={label}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="What needs the Throne's decision?" />
        </div>
        <div>
          <label className={label}>Detail</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={field} placeholder="Context, amount, risk…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>From department</label>
            <select value={sourceDepartmentId} onChange={(e) => setSourceDepartmentId(e.target.value)} className={field}>
              <option value="">No specific source</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Approval department</label>
            <select value={targetDepartmentId} onChange={(e) => setTargetDepartmentId(e.target.value)} className={field}>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={label}>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={field}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {err && <p className="text-xs text-empire-red-bright">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg border border-empire-border px-4 py-2 text-xs uppercase tracking-widest text-empire-text-muted transition-colors hover:text-empire-text">Cancel</button>
          <LiquidMetalButton onClick={submit} disabled={busy} className="text-xs">Raise to the Throne</LiquidMetalButton>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------------------------------------------------------- */

function HubMetric({ label, value, icon, tone }: { label: string; value: number; icon: Parameters<typeof EmpireIcon>[0]['name']; tone: 'amber' | 'red' | 'green' }) {
  const toneColor = tone === 'red' ? 'text-empire-red-bright' : tone === 'green' ? 'text-empire-green-bright' : 'text-empire-amber-bright'
  return (
    <GlassPanel className="p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-empire-text-muted">{label}</span>
        <EmpireIcon name={icon} size={16} className={toneColor} />
      </div>
      <div className="font-empire text-2xl font-bold tracking-wide text-empire-text tabular-nums">{value}</div>
    </GlassPanel>
  )
}

function ChannelBadges({ channels }: { channels: ChannelStatus }) {
  const Badge = ({ on, name }: { on: boolean; name: string }) => (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${on ? 'border-empire-green/30 bg-empire-green-bg text-empire-green-bright' : 'border-empire-border text-empire-text-dim'}`}>
      <EmpireIcon name={on ? 'check' : 'close'} size={10} /> {name}
    </span>
  )
  return (
    <div className="flex items-center gap-1.5">
      <Badge on={channels.slack} name="Slack" />
      <Badge on={channels.telegram} name="Telegram" />
    </div>
  )
}

function ActBtn({ tone, icon, onClick, disabled, children }: {
  tone: 'green' | 'red' | 'amber' | 'muted'
  icon: Parameters<typeof EmpireIcon>[0]['name']
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  const tones: Record<string, string> = {
    green: 'border-empire-green/40 bg-empire-green-bg text-empire-green-bright hover:bg-empire-green/20',
    red: 'border-empire-red/40 bg-empire-red-bg text-empire-red-bright hover:bg-empire-red/20',
    amber: 'border-empire-amber/40 bg-empire-amber-bg text-empire-amber-bright hover:bg-empire-amber/20',
    muted: 'border-empire-border text-empire-text-muted hover:bg-empire-elevated/60 hover:text-empire-text',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs uppercase tracking-widest transition-colors disabled:opacity-40 ${tones[tone]}`}>
      <EmpireIcon name={icon} size={13} /> {children}
    </button>
  )
}
