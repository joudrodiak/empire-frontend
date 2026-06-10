'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { fetcher, post, patch, del } from '@/lib/api'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
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
        { id: 'questions', label: 'Weekly questions', icon: 'calendar' },
        { id: 'audit', label: 'Audit', icon: 'shield' },
      ]} active={tab} onChange={setTab} />
      {tab === 'connect' && <Connection />}
      {tab === 'questions' && <Questions />}
      {tab === 'audit' && <Audit />}
    </main>
  )
}

function Connection() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [rows, setRows] = useState<Credential[]>([])
  const [secret, setSecret] = useState('')
  const [wizardSource, setWizardSource] = useState('')
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const load = useCallback(() => Promise.all([fetcher('/api/mcp/meta').then(setMeta), fetcher('/api/mcp/credentials').then(setRows)]), [])
  useEffect(() => {
    load().catch(() => {})
    try {
      const source = new URLSearchParams(window.location.search).get('connect')
      if (source && ['codex', 'claude'].includes(source.toLowerCase())) setWizardSource(source.toLowerCase())
    } catch { /* noop */ }
  }, [load])
  // After a wizard key is issued, poll until the platform actually calls the
  // endpoint (lastUsedAt flips) so the user gets a real connection confirmation.
  const confirmed = rows.some(r => !r.revokedAt && r.lastUsedAt)
  useEffect(() => {
    if (!secret || confirmed) return
    const timer = setInterval(() => { load().catch(() => {}) }, 4000)
    return () => clearInterval(timer)
  }, [secret, confirmed, load])
  async function create() {
    const name = wizardSource ? `${wizardSource === 'claude' ? 'Claude' : 'Codex'} wizard key` : 'Wizard key'
    const r = await post('/api/mcp/credentials', { name })
    setSecret(r.secret)
    await load()
  }
  async function revoke(id: string) { await del(`/api/mcp/credentials/${id}`); await load() }
  return <div className="space-y-4">
    {wizardSource && meta && <GlassPanel variant="gold" className="p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border border-empire-gold/30 bg-empire-gold/10 text-empire-gold"><EmpireIcon name="link" size={16} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-empire text-lg text-empire-text">{wizardSource === 'codex' ? 'Codex' : 'Claude'} MCP wizard</h2>
          <p className="mt-1 text-xs text-empire-text-muted">Confirm this connection for the platform that sent you here, generate a token, then paste only the token value into that platform.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Fact label="Endpoint" value={`${origin}${meta.endpoint}`} />
            <Fact label="Token" value="emp_mcp_..." />
          </div>
        </div>
      </div>
    </GlassPanel>}
    {meta && <GlassPanel className="p-5">
      <h2 className="font-empire text-lg text-empire-text">{meta.workerName}</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Fact label="Endpoint" value={`${origin}${meta.endpoint}`} />
        <Fact label="Transport" value={meta.transport} />
        <Fact label="Authentication" value={meta.authentication} />
        <Fact label="Permissions" value={meta.permissions.join(', ') || 'read-only'} />
      </div>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-empire-border bg-empire-void/70 p-3 text-[11px] text-empire-text-muted">{JSON.stringify({
        mcpServers: { empire: { url: `${origin}${meta.endpoint}`, headers: { Authorization: 'Bearer emp_mcp_YOUR_TOKEN' } } },
      }, null, 2)}</pre>
      <p className="mt-2 text-[11px] text-empire-text-dim">Paste the token value only — the worker accepts it bare or as a Bearer header. No Client-ID prefix.</p>
    </GlassPanel>}
    {secret && <GlassPanel variant="gold" className="p-4">
      <p className="text-xs font-semibold text-empire-text">Copy this key now. It is shown once.</p>
      <code className="mt-2 block break-all text-xs text-empire-gold">{secret}</code>
      <div className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${confirmed ? 'border-empire-gold/40 bg-empire-gold/10 text-empire-gold' : 'border-empire-border bg-empire-elevated/40 text-empire-text-muted'}`}>
        <EmpireIcon name={confirmed ? 'check' : 'clock'} size={14} />
        {confirmed
          ? 'Connection confirmed — the platform has reached your worker.'
          : 'Waiting for the platform to call in… paste the token there and this will confirm automatically.'}
      </div>
    </GlassPanel>}
    <GlassPanel className="p-5">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-empire text-lg text-empire-text">Credentials</h2><LiquidMetalButton size="sm" onClick={create}>Generate wizard key</LiquidMetalButton></div>
      <div className="space-y-2">{rows.map(r => <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-empire-border px-3 py-2">
        <div className="min-w-0 flex-1"><p className="text-sm text-empire-text">{r.name}</p><p className="font-data text-[10px] text-empire-text-dim">{r.keyPrefix}... · {r.revokedAt ? 'revoked' : 'active'}</p></div>
        {!r.revokedAt && <button className="text-xs text-empire-red-bright" onClick={() => revoke(r.id)}>Revoke</button>}
      </div>)}</div>
    </GlassPanel>
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
