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
  async function create() { const r = await post('/api/mcp/credentials', { name: 'Personal worker key' }); setSecret(r.secret); await load() }
  async function regenerate(id: string) { const r = await post(`/api/mcp/credentials/${id}/regenerate`, {}); setSecret(r.secret); await load() }
  async function revoke(id: string) { await del(`/api/mcp/credentials/${id}`); await load() }
  return <div className="space-y-4">
    {wizardSource && meta && <GlassPanel variant="gold" className="p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border border-empire-gold/30 bg-empire-gold/10 text-empire-gold"><EmpireIcon name="link" size={16} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-empire text-lg text-empire-text">{wizardSource === 'codex' ? 'Codex' : 'Claude'} MCP wizard</h2>
          <p className="mt-1 text-xs text-empire-text-muted">Confirm the endpoint below, generate a client-id token, then paste the token into your MCP client configuration.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Fact label="Endpoint" value={`${origin}${meta.endpoint}`} />
            <Fact label="Header" value="Authorization: Client-ID emp_mcp_..." />
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
        mcpServers: { empire: { url: `${origin}${meta.endpoint}`, headers: { Authorization: 'Client-ID YOUR_CLIENT_ID_TOKEN' } } },
      }, null, 2)}</pre>
    </GlassPanel>}
    {secret && <GlassPanel variant="gold" className="p-4">
      <p className="text-xs font-semibold text-empire-text">Copy this key now. It is shown once.</p>
      <code className="mt-2 block break-all text-xs text-empire-gold">{secret}</code>
    </GlassPanel>}
    <GlassPanel className="p-5">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-empire text-lg text-empire-text">Credentials</h2><LiquidMetalButton size="sm" onClick={create}>Generate key</LiquidMetalButton></div>
      <div className="space-y-2">{rows.map(r => <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-empire-border px-3 py-2">
        <div className="min-w-0 flex-1"><p className="text-sm text-empire-text">{r.name}</p><p className="font-data text-[10px] text-empire-text-dim">{r.keyPrefix}... · {r.revokedAt ? 'revoked' : 'active'}</p></div>
        {!r.revokedAt && <><button className="text-xs text-empire-gold" onClick={() => regenerate(r.id)}>Regenerate</button><button className="text-xs text-empire-red-bright" onClick={() => revoke(r.id)}>Revoke</button></>}
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
  async function add() { await post('/api/mcp/questions', { title, prompt, responsibilityArea: 'Operations', frequency: 'weekly', weekday, scheduleTime, requiredEvidence: ['links', 'attachments'] }); await load() }
  async function toggle(row: Question) { await patch(`/api/mcp/questions/${row.id}`, { enabled: !row.enabled }); await load() }
  return <div className="space-y-4">
    <GlassPanel className="p-5"><h2 className="font-empire text-lg text-empire-text">Configure recurring question</h2><div className="mt-3 grid gap-3"><input className={field} value={title} onChange={e => setTitle(e.target.value)} /><textarea className={field} value={prompt} onChange={e => setPrompt(e.target.value)} /><div className="grid gap-3 sm:grid-cols-2"><select className={field} value={weekday} onChange={e => setWeekday(Number(e.target.value))}>{WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select><input className={field} type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} /></div><div><LiquidMetalButton size="sm" onClick={add}>Add question</LiquidMetalButton></div></div></GlassPanel>
    {rows.map(row => <GlassPanel key={row.id} className="flex items-center gap-3 p-4"><div className="flex-1"><p className="text-sm font-semibold text-empire-text">{row.title}</p><p className="text-xs text-empire-text-muted">{row.prompt}</p><p className="mt-1 text-[11px] uppercase tracking-widest text-empire-gold">{WEEKDAYS[row.weekday] ?? 'Monday'} · {row.scheduleTime || '09:00'}</p></div><button onClick={() => toggle(row)} className={`rounded-full px-2 py-1 text-[10px] uppercase ${row.enabled ? 'rag-green' : 'rag-pending'}`}>{row.enabled ? 'Enabled' : 'Disabled'}</button></GlassPanel>)}
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
