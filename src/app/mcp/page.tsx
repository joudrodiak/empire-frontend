'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { fetcher, post, patch, del } from '@/lib/api'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { EmpireIcon, asIconName } from '@/components/atoms/EmpireIcon'
import { LiquidMetalButton } from '@/components/atoms/LiquidMetalButton'
import { TabBar } from '@/components/templates/TabBar'

const field = 'w-full rounded-lg border border-empire-border bg-empire-surface/60 px-3 py-2 text-sm text-empire-text outline-none focus:border-empire-gold/50'
type Meta = { endpoint: string; workerName: string; transport: string; authentication: string; permissions: string[] }
type Credential = { id: string; name: string; keyPrefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null }
type Question = { id: string; title: string; prompt: string; responsibilityArea: string | null; frequency: string; weekday: number; scheduleTime: string; enabled: boolean; autoSubmit: boolean }
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function McpPage() {
  const [tab, setTab] = useState('connect')
  return (
    <main className="mx-auto max-w-5xl px-5 pb-28 pt-8">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-empire-text-muted">Model Context Protocol</p>
        <h1 className="font-empire text-3xl text-empire-text">MCP Worker</h1>
        <p className="mt-1 text-sm text-empire-text-muted">Connect your personal worker with exactly your profile permissions.</p>
      </header>
      <TabBar tabs={[
        { id: 'connect', label: 'Connection', icon: 'link' },
        { id: 'tools', label: 'Tools', icon: 'cog' },
        { id: 'questions', label: 'Weekly questions', icon: 'calendar' },
        { id: 'audit', label: 'Audit', icon: 'shield' },
      ]} active={tab} onChange={setTab} />
      {tab === 'connect' && <Connection />}
      {tab === 'tools' && <Tools />}
      {tab === 'questions' && <Questions />}
      {tab === 'audit' && <Audit />}
    </main>
  )
}

// OAuth clients (claude.ai, Claude Desktop) authorize via /authorize and never
// see a token; manual clients (Cursor, Codex, custom) paste a generated key.
const CLIENTS = [
  { id: 'claude-web', label: 'claude.ai', mode: 'oauth' as const, hint: 'Web connectors — OAuth, no token pasting' },
  { id: 'claude-desktop', label: 'Claude Desktop', mode: 'oauth' as const, hint: 'Settings → Connectors — OAuth, no token pasting' },
  { id: 'cursor', label: 'Cursor', mode: 'token' as const, hint: 'mcp.json with a Bearer token' },
  { id: 'codex', label: 'Codex / other', mode: 'token' as const, hint: 'Any client that sends an Authorization header' },
]

function Connection() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [rows, setRows] = useState<Credential[]>([])
  const [secret, setSecret] = useState('')
  const [step, setStep] = useState(1)
  const [clientId, setClientId] = useState('')
  const [testResult, setTestResult] = useState('')
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const client = CLIENTS.find(c => c.id === clientId)
  const load = useCallback(() => Promise.all([fetcher('/api/mcp/meta').then(setMeta), fetcher('/api/mcp/credentials').then(setRows)]), [])
  useEffect(() => {
    load().catch(() => {})
    try {
      const source = String(new URLSearchParams(window.location.search).get('connect') || '').toLowerCase()
      if (source === 'claude') { setClientId('claude-web'); setStep(2) }
      else if (source === 'codex') { setClientId('codex'); setStep(2) }
    } catch { /* noop */ }
  }, [load])
  // Step 3 polls until the platform actually calls the worker (lastUsedAt
  // flips on the first authenticated /connect) — a REAL confirmation, not a
  // guess. Works for both OAuth and pasted-token paths.
  const confirmed = rows.some(r => !r.revokedAt && r.lastUsedAt)
  useEffect(() => {
    if (step !== 3 || confirmed) return
    const timer = setInterval(() => { load().catch(() => {}) }, 4000)
    return () => clearInterval(timer)
  }, [step, confirmed, load])
  async function create() {
    const r = await post('/api/mcp/credentials', { name: `${client?.label || 'Wizard'} key` })
    setSecret(r.secret)
    await load()
  }
  // End-to-end self-test: a JSON-RPC ping through the public endpoint with the
  // freshly issued key — exactly what the external client will do.
  async function testCall() {
    setTestResult('…')
    try {
      const res = await fetch(`${origin}/api/mcp/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
      })
      setTestResult(res.ok ? 'PASS — endpoint answered the authenticated ping.' : `FAIL — HTTP ${res.status}`)
      await load()
    } catch (e: any) { setTestResult(`FAIL — ${e?.message || 'network error'}`) }
  }
  async function revoke(id: string) { await del(`/api/mcp/credentials/${id}`); await load() }
  const stepChip = (n: number, label: string) => (
    <button key={n} onClick={() => { if (n < step || (n === 2 && clientId)) setStep(n) }}
      className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest transition-all duration-200 ${step === n ? 'border-empire-gold/50 bg-empire-gold/10 text-empire-gold' : n < step ? 'border-empire-border text-empire-text-muted hover:border-empire-gold/30' : 'border-empire-border text-empire-text-dim'}`}>
      {n}. {label}
    </button>
  )
  return <div className="space-y-4">
    <GlassPanel variant="gold" className="p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border border-empire-gold/30 bg-empire-gold/10 text-empire-gold"><EmpireIcon name="link" size={16} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-empire text-lg text-empire-text">Connection wizard</h2>
          <p className="mt-1 text-xs text-empire-text-muted">Three steps: pick the client, connect it, then watch this page confirm the first real call from the platform.</p>
          <div className="mt-3 flex flex-wrap gap-2">{stepChip(1, 'Client')}{stepChip(2, 'Connect')}{stepChip(3, 'Verify')}</div>
        </div>
      </div>
      {step === 1 && <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {CLIENTS.map(c => <button key={c.id} onClick={() => { setClientId(c.id); setStep(2) }}
          className={`rounded-lg border px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-empire-gold/40 ${clientId === c.id ? 'border-empire-gold/50 bg-empire-gold/5' : 'border-empire-border'}`}>
          <p className="text-sm text-empire-text">{c.label}</p>
          <p className="mt-0.5 text-[11px] text-empire-text-muted">{c.hint}</p>
        </button>)}
      </div>}
      {step === 2 && client?.mode === 'oauth' && <div className="mt-4 space-y-3">
        <p className="text-xs text-empire-text-muted">
          In {client.label}, open <span className="text-empire-text">Settings → Connectors → Add custom connector</span> and paste this URL. {client.label} discovers the OAuth flow automatically and sends you back here to approve — no token is ever pasted.
        </p>
        <Fact label="Connector URL" value={`${origin}/api/mcp/connect`} />
        <p className="text-[11px] text-empire-text-dim">When the consent screen appears, hit Approve. If it ever says unauthorized, remove the connector there and add it again — approving always rotates a fresh key.</p>
        <LiquidMetalButton size="sm" onClick={() => setStep(3)}>I added the connector — verify</LiquidMetalButton>
      </div>}
      {step === 2 && client?.mode === 'token' && <div className="mt-4 space-y-3">
        <p className="text-xs text-empire-text-muted">Generate a key (shown once), then paste it into {client.label} as a Bearer Authorization header.</p>
        {!secret && <LiquidMetalButton size="sm" onClick={create}>Generate key</LiquidMetalButton>}
        {secret && <>
          <div className="rounded-lg border border-empire-gold/40 bg-empire-gold/10 p-3">
            <p className="text-xs font-semibold text-empire-text">Copy this key now. It is shown once.</p>
            <code className="mt-1 block break-all text-xs text-empire-gold">{secret}</code>
          </div>
          <pre className="overflow-x-auto rounded-lg border border-empire-border bg-empire-void/70 p-3 text-[11px] text-empire-text-muted">{JSON.stringify({
            mcpServers: { empire: { url: `${origin}/api/mcp/connect`, headers: { Authorization: `Bearer ${secret}` } } },
          }, null, 2)}</pre>
          <LiquidMetalButton size="sm" onClick={() => setStep(3)}>I pasted it — verify</LiquidMetalButton>
        </>}
      </div>}
      {step === 2 && !client && <p className="mt-4 text-xs text-empire-text-muted">Pick a client in step 1 first.</p>}
      {step === 3 && <div className="mt-4 space-y-3">
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${confirmed ? 'border-empire-gold/40 bg-empire-gold/10 text-empire-gold' : 'border-empire-border bg-empire-elevated/40 text-empire-text-muted'}`}>
          <EmpireIcon name={confirmed ? 'check' : 'clock'} size={14} />
          {confirmed
            ? 'Connection confirmed — the platform has made an authenticated call to your worker.'
            : 'Waiting for the platform to call in… finish the connect step there and this flips automatically (checking every 4s).'}
        </div>
        {secret && <div className="flex items-center gap-3">
          <LiquidMetalButton size="sm" onClick={testCall}>Run test call</LiquidMetalButton>
          {testResult && <span className={`text-xs ${testResult.startsWith('PASS') ? 'text-empire-gold' : 'text-empire-text-muted'}`}>{testResult}</span>}
        </div>}
        {!confirmed && client?.mode === 'oauth' && <p className="text-[11px] text-empire-text-dim">Still unauthorized in {client.label}? Remove the connector there, re-add the URL, and approve again on the consent screen — each approval issues a fresh key.</p>}
      </div>}
    </GlassPanel>
    {meta && <GlassPanel className="p-5">
      <h2 className="font-empire text-lg text-empire-text">{meta.workerName}</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Fact label="Endpoint" value={`${origin}${meta.endpoint}`} />
        <Fact label="Transport" value={meta.transport} />
        <Fact label="Authentication" value="OAuth 2.1 (claude.ai) or Bearer key" />
        <Fact label="Permissions" value={meta.permissions.join(', ') || 'read-only'} />
      </div>
    </GlassPanel>}
    <GlassPanel className="p-5">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-empire text-lg text-empire-text">Credentials</h2><LiquidMetalButton size="sm" onClick={create}>Generate key</LiquidMetalButton></div>
      <div className="space-y-2">{rows.map(r => <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-empire-border px-3 py-2">
        <div className="min-w-0 flex-1"><p className="text-sm text-empire-text">{r.name}</p><p className="font-data text-[10px] text-empire-text-dim">{r.keyPrefix}... · {r.revokedAt ? 'revoked' : r.lastUsedAt ? `active · last used ${new Date(r.lastUsedAt).toLocaleString()}` : 'active · never used'}</p></div>
        {!r.revokedAt && <button className="text-xs text-empire-red-bright" onClick={() => revoke(r.id)}>Revoke</button>}
      </div>)}</div>
    </GlassPanel>
  </div>
}

// C11 — the tool catalogue, grouped so an operator instantly sees which tools
// only READ vs which WRITE or DELETE (the risk lens), and which Unit each tool
// belongs to (the org lens). Fed by /api/mcp/tools — the same MCP_TOOLS list the
// worker exposes over JSON-RPC, so it can never drift from reality.
type McpTool = { name: string; description: string; access: 'read' | 'write' | 'delete'; domain: string }
const ACCESS_META: Record<McpTool['access'], { label: string; chip: string; icon: string; blurb: string }> = {
  read: { label: 'Read-only', chip: 'rag-green', icon: 'eye', blurb: 'Safe — only fetch data, never change it.' },
  write: { label: 'Write', chip: 'rag-amber', icon: 'pen', blurb: 'Create or update records. Needs the matching write permission.' },
  delete: { label: 'Delete', chip: 'rag-red', icon: 'trash', blurb: 'Destructive — removes or offboards records. Highest-trust permission.' },
}
function Tools() {
  const [rows, setRows] = useState<McpTool[]>([])
  const [view, setView] = useState<'access' | 'unit'>('access')
  useEffect(() => { fetcher('/api/mcp/tools').then((r: { tools: McpTool[] }) => setRows(r.tools || [])).catch(() => {}) }, [])
  const order: McpTool['access'][] = ['read', 'write', 'delete']
  const byAccess = order.map(a => [a, rows.filter(t => t.access === a)] as const).filter(([, t]) => t.length)
  const units = Array.from(new Set(rows.map(t => t.domain))).sort()
  const byUnit = units.map(u => [u, rows.filter(t => t.domain === u)] as const)
  const card = (t: McpTool) => (
    <div key={t.name} className="rounded-lg border border-empire-border bg-empire-surface/40 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <code className="font-data text-xs text-empire-text">{t.name}</code>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-widest ${ACCESS_META[t.access].chip}`}>{ACCESS_META[t.access].label}</span>
      </div>
      <p className="mt-1 text-[11px] text-empire-text-muted">{t.description}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-widest text-empire-text-dim">{t.domain}</p>
    </div>
  )
  return <div className="space-y-4">
    <GlassPanel variant="gold" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-empire text-lg text-empire-text">Tool catalogue</h2>
          <p className="mt-1 text-xs text-empire-text-muted">{rows.length} tools your worker exposes — exactly what an MCP client can call, grouped by risk and by Unit.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('access')} className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest transition-all duration-200 ${view === 'access' ? 'border-empire-gold/50 bg-empire-gold/10 text-empire-gold' : 'border-empire-border text-empire-text-muted hover:border-empire-gold/30'}`}>By access</button>
          <button onClick={() => setView('unit')} className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest transition-all duration-200 ${view === 'unit' ? 'border-empire-gold/50 bg-empire-gold/10 text-empire-gold' : 'border-empire-border text-empire-text-muted hover:border-empire-gold/30'}`}>By unit</button>
        </div>
      </div>
    </GlassPanel>
    {view === 'access' && byAccess.map(([access, tools]) => (
      <GlassPanel key={access} className="p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className={`grid h-7 w-7 place-items-center rounded-lg ${ACCESS_META[access].chip}`}><EmpireIcon name={asIconName(ACCESS_META[access].icon)} size={13} /></span>
          <h3 className="font-empire text-base text-empire-text">{ACCESS_META[access].label}</h3>
          <span className="text-[11px] text-empire-text-dim">· {tools.length}</span>
        </div>
        <p className="mb-3 text-[11px] text-empire-text-muted">{ACCESS_META[access].blurb}</p>
        <div className="grid gap-2 sm:grid-cols-2">{tools.map(card)}</div>
      </GlassPanel>
    ))}
    {view === 'unit' && byUnit.map(([unit, tools]) => (
      <GlassPanel key={unit} className="p-5">
        <div className="mb-3 flex items-center gap-2"><h3 className="font-empire text-base text-empire-text">{unit}</h3><span className="text-[11px] text-empire-text-dim">· {tools.length}</span></div>
        <div className="grid gap-2 sm:grid-cols-2">{tools.map(card)}</div>
      </GlassPanel>
    ))}
  </div>
}

function Questions() {
  const [rows, setRows] = useState<Question[]>([])
  const [title, setTitle] = useState('Weekly progress update')
  const [prompt, setPrompt] = useState('What did you complete this week, and what evidence supports it?')
  const [weekday, setWeekday] = useState(1)
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const load = useCallback(() => fetcher('/api/mcp/questions').then(setRows), [])
  useEffect(() => { load().catch(() => {}) }, [load])
  const [busyId, setBusyId] = useState<string | null>(null)
  async function add() {
    setBusyId('new')
    try { await post('/api/mcp/questions', { title, prompt, responsibilityArea: 'Operations', frequency: 'weekly', weekday, scheduleTime, requiredEvidence: ['links', 'attachments'] }); await load() }
    finally { setBusyId(null) }
  }
  async function toggle(row: Question) {
    setBusyId(row.id)
    try { await patch(`/api/mcp/questions/${row.id}`, { enabled: !row.enabled }); await load() }
    finally { setBusyId(null) }
  }
  async function remove(row: Question) {
    if (!window.confirm(`Delete weekly request "${row.title}"?`)) return
    setBusyId(row.id)
    try { await del(`/api/mcp/questions/${row.id}`); await load() }
    finally { setBusyId(null) }
  }
  return <div className="space-y-4">
    <GlassPanel className="p-5"><h2 className="font-empire text-lg text-empire-text">Configure recurring question</h2><div className="mt-3 grid gap-3"><input className={field} value={title} onChange={e => setTitle(e.target.value)} placeholder="Weekly progress update" /><textarea className={field} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="What should the worker ask every week?" /><div className="grid gap-3 sm:grid-cols-2"><select className={field} value={weekday} onChange={e => setWeekday(Number(e.target.value))}>{WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select><input className={field} type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} /></div><div><LiquidMetalButton size="sm" onClick={add} disabled={busyId === 'new'}>{busyId === 'new' ? 'Adding...' : 'Add question'}</LiquidMetalButton></div></div></GlassPanel>
    {rows.map(row => <GlassPanel key={row.id} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-[14rem] flex-1"><p className="text-sm font-semibold text-empire-text">{row.title}</p><p className="text-xs text-empire-text-muted">{row.prompt}</p><p className="mt-1 text-[11px] uppercase tracking-widest text-empire-gold">{WEEKDAYS[row.weekday] ?? 'Monday'} · {row.scheduleTime || '09:00'}</p></div><div className="flex items-center gap-2"><button onClick={() => toggle(row)} disabled={busyId === row.id} className={`rounded-full px-2 py-1 text-[10px] uppercase transition-all duration-200 hover:-translate-y-0.5 ${row.enabled ? 'rag-green' : 'rag-pending'}`}>{busyId === row.id ? 'Saving...' : row.enabled ? 'Enabled' : 'Disabled'}</button><button onClick={() => remove(row)} disabled={busyId === row.id} className="rounded-full border border-empire-border px-2 py-1 text-[10px] uppercase text-empire-text-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-empire-gold/40 hover:text-empire-text">Delete</button></div></GlassPanel>)}
    <GenerateReport />
  </div>
}

function GenerateReport() {
  const [result, setResult] = useState<any>(null)
  return <GlassPanel className="p-5"><div className="flex items-center justify-between"><div><h2 className="font-empire text-lg text-empire-text">Weekly report</h2><p className="text-xs text-empire-text-muted">Collects completed tickets and processed documents for review.</p></div><LiquidMetalButton size="sm" onClick={async () => setResult(await post('/api/mcp/reports/generate', {}))}>Generate</LiquidMetalButton></div>{result && <pre className="mt-3 max-h-64 overflow-auto text-[10px] text-empire-text-muted">{JSON.stringify(result.answers, null, 2)}</pre>}</GlassPanel>
}

function Audit() {
  const [rows, setRows] = useState<any[]>([])
  useEffect(() => { fetcher('/api/mcp/audit').then(setRows).catch(() => {}) }, [])
  return <GlassPanel className="p-5"><h2 className="font-empire text-lg text-empire-text">Complete agent audit trail</h2><div className="mt-3 space-y-2">{rows.map(r => <div key={r.id} className="rounded-lg border border-empire-border px-3 py-2 text-xs"><div className="flex justify-between"><span className="text-empire-text">{r.action} · {r.resource}</span><span className="text-empire-text-dim">{new Date(r.createdAt).toLocaleString()}</span></div><p className="font-data text-[10px] text-empire-text-muted">{r.mode} · {r.source} · {r.resourceId || 'n/a'}</p></div>)}</div></GlassPanel>
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-empire-border px-3 py-2"><p className="text-[10px] uppercase tracking-widest text-empire-text-dim">{label}</p><p className="mt-1 break-all font-data text-xs text-empire-text">{value}</p></div>
}
