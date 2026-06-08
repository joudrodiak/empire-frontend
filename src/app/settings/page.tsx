'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useAuth, userCan } from '@/lib/auth'
import { fetcher, patch, del } from '@/lib/api'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { Panel } from '@/components/molecules/Panel'
import { TabBar } from '@/components/templates/TabBar'
import { LiquidMetalButton } from '@/components/atoms/LiquidMetalButton'
import { EmptyState } from '@/components/atoms/EmptyState'

/**
 * /settings — the Empire OS configuration surface. Four lanes:
 *   · Integrations — live Slack/Telegram connection status (GET /api/agent/status)
 *   · Agent        — Rodiak operator identity + capability
 *   · Company      — edit the active company (PATCH /api/companies/:id)
 *   · Environment  — live "is this key set?" checklist (GET /api/settings/env),
 *                    never exposes secret values, only presence.
 * API keys / secrets are never entered or stored in the browser — they live in
 * the server .env (documented here). Company-level config is gated by
 * `company:manage`; everyone signed in can view integration/agent status.
 */
const KEY = 'empire-os-active-profile'

type Channels = { slack: boolean; telegram: boolean }
type AgentStatus = { name: string; codename: string; role: string; channels: Channels; note: string }
type EnvEntry = { key: string; label: string; doc?: string; set: boolean }
type EnvStatus = { groups: Record<string, EnvEntry[]>; summary: { total: number; configured: number; missing: number } }

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: 'integrations', label: 'Integrations', icon: 'link' },
  { id: 'agent', label: 'Agent', icon: 'sparkle' },
  { id: 'company', label: 'Company', icon: 'briefcase' },
  { id: 'environment', label: 'Environment', icon: 'cog' },
]

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState('integrations')
  const canManage = userCan(user, 'company:manage') || userCan(user, '*')

  if (loading) return <div className="px-6 py-10 text-sm text-empire-text-muted">Loading…</div>

  return (
    <div className="mx-auto max-w-5xl px-5 pb-28 pt-8">
      <header className="mb-6 animate-slide-up">
        <p className="text-[11px] uppercase tracking-[0.3em] text-empire-text-muted">Empire OS</p>
        <h1 className="font-empire text-3xl text-empire-text">Settings</h1>
        <p className="mt-1 text-sm text-empire-text-muted">
          Integrations, agent configuration, company identity and environment wiring.
        </p>
      </header>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'integrations' && <IntegrationsTab />}
      {tab === 'agent' && <AgentTab />}
      {tab === 'company' && <CompanyTab canManage={canManage} />}
      {tab === 'environment' && <EnvironmentTab canManage={canManage} />}
    </div>
  )
}

/* ── Integrations ─────────────────────────────────────────────── */
function IntegrationsTab() {
  const [status, setStatus] = useState<AgentStatus | null>(null)
  useEffect(() => { fetcher('/api/agent/status').then(setStatus).catch(() => setStatus(null)) }, [])

  const rows: { name: string; icon: IconName; on: boolean; hint: string; keys: string }[] = [
    { name: 'Slack', icon: 'megaphone', on: !!status?.channels?.slack, hint: 'Approval dispatch + agent broadcasts', keys: 'SLACK_WEBHOOK_URL' },
    { name: 'Telegram', icon: 'megaphone', on: !!status?.channels?.telegram, hint: 'Approval dispatch + agent broadcasts', keys: 'TELEGRAM_BOT_TOKEN · TELEGRAM_CHAT_ID' },
    { name: 'Instagram', icon: 'people', on: false, hint: 'Marketing intelligence and social metrics', keys: 'INSTAGRAM_OAUTH_CLIENT_ID · INSTAGRAM_OAUTH_CLIENT_SECRET' },
    { name: 'Facebook', icon: 'people', on: false, hint: 'Meta pages and paid-social context', keys: 'FACEBOOK_OAUTH_CLIENT_ID · FACEBOOK_OAUTH_CLIENT_SECRET' },
    { name: 'TikTok', icon: 'megaphone', on: false, hint: 'Short-form social account metrics', keys: 'TIKTOK_OAUTH_CLIENT_ID · TIKTOK_OAUTH_CLIENT_SECRET' },
    { name: 'X', icon: 'megaphone', on: false, hint: 'Public social reach and posting context', keys: 'X_OAUTH_CLIENT_ID · X_OAUTH_CLIENT_SECRET' },
    { name: 'LinkedIn', icon: 'briefcase', on: false, hint: 'Company-page and professional network metrics', keys: 'LINKEDIN_OAUTH_CLIENT_ID · LINKEDIN_OAUTH_CLIENT_SECRET' },
    { name: 'YouTube', icon: 'document', on: false, hint: 'Video channel metrics and content context', keys: 'YOUTUBE_OAUTH_CLIENT_ID · YOUTUBE_OAUTH_CLIENT_SECRET' },
    { name: 'Banking (NL / UAE)', icon: 'coins', on: false, hint: 'Open-banking aggregator (awaiting credentials)', keys: 'TINK_* · GOCARDLESS_ACCESS_TOKEN · PLAID_* · LEAN_APP_TOKEN · TARABUT_*' },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(r => (
        <GlassPanel key={r.name} variant="glass" className="animate-slide-up p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-empire-border bg-empire-elevated/50 text-empire-gold">
                <EmpireIcon name={r.icon} size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-empire-text">{r.name}</p>
                <p className="text-[11px] text-empire-text-muted">{r.hint}</p>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${r.on ? 'rag-green' : 'rag-pending'}`}>
              {r.on ? 'Connected' : 'Not set'}
            </span>
          </div>
          <p className="mt-3 border-t border-empire-border/60 pt-2 font-data text-[10px] text-empire-text-dim">{r.keys}</p>
        </GlassPanel>
      ))}
    </div>
  )
}

/* ── Agent ────────────────────────────────────────────────────── */
function AgentTab() {
  const [status, setStatus] = useState<AgentStatus | null>(null)
  useEffect(() => { fetcher('/api/agent/status').then(setStatus).catch(() => setStatus(null)) }, [])

  return (
    <Panel title="Operator agent" icon="sparkle">
      {!status ? (
        <EmptyState icon="sparkle" title="Agent status unavailable" hint="Could not reach /api/agent/status." />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="medallion grid place-items-center" style={{ width: 44, height: 44 }}>
              <EmpireIcon name="sparkle" size={20} className="relative z-10" />
            </span>
            <div>
              <p className="text-base font-semibold text-empire-text">{status.name} <span className="text-empire-text-muted">· {status.codename}</span></p>
              <p className="text-xs uppercase tracking-widest text-empire-gold">{status.role}</p>
            </div>
          </div>
          <p className="text-sm text-empire-text-muted">{status.note}</p>
          <div className="grid grid-cols-2 gap-2">
            {(['slack', 'telegram'] as const).map(c => (
              <div key={c} className="flex items-center justify-between rounded-lg border border-empire-border bg-empire-elevated/40 px-3 py-2">
                <span className="text-xs capitalize text-empire-text">{c}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${status.channels?.[c] ? 'rag-green' : 'rag-pending'}`}>
                  {status.channels?.[c] ? 'Live' : 'Off'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-empire-text-dim">
            Manage broadcasts, approvals and the message log from the <a href="/agent" className="text-empire-gold hover:underline">Operator console</a>.
          </p>
        </div>
      )}
    </Panel>
  )
}

/* ── Company ──────────────────────────────────────────────────── */
type Company = { id: string; slug: string; name: string; short: string; tagline: string; type: string; hq: string; founded: string }
const field = 'w-full rounded-lg border border-empire-border bg-empire-surface/60 px-3 py-2 text-sm text-empire-text placeholder:text-empire-text-dim outline-none transition-colors focus:border-empire-gold/50'
const label = 'mb-1 block text-[10px] uppercase tracking-widest text-empire-text-muted'

function CompanyTab({ canManage }: { canManage: boolean }) {
  const [company, setCompany] = useState<Company | null>(null)
  const [form, setForm] = useState<Partial<Company>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)

  const load = useCallback(async () => {
    try {
      const rows: Company[] = (await fetcher('/api/companies')) || []
      let slug: string | null = null
      try { slug = localStorage.getItem(KEY) } catch { /* noop */ }
      const c = rows.find(x => x.slug === slug) ?? rows[0] ?? null
      setCompany(c); if (c) setForm(c)
    } catch { setCompany(null) }
  }, [])
  useEffect(() => { load() }, [load])

  async function save() {
    if (!company) return
    setErr(null); setMsg(null); setBusy(true)
    try {
      await patch(`/api/companies/${company.id}`, {
        name: form.name, short: form.short, tagline: form.tagline, type: form.type, hq: form.hq, founded: form.founded,
      })
      setMsg('Company updated.'); await load()
    } catch (e: any) { setErr(e?.message || 'Failed to update company') } finally { setBusy(false) }
  }

  // Delete the active tenant. The backend guards the flagship, the last company,
  // and any tenant that still owns data (409 with a clear reason — surfaced here).
  async function remove() {
    if (!company) return
    setErr(null); setMsg(null); setBusy(true)
    try {
      await del(`/api/companies/${company.id}`)
      try { localStorage.removeItem(KEY) } catch { /* noop */ }
      // Drop back to the default tenant; the switcher re-reads /api/companies.
      window.location.href = '/'
    } catch (e: any) {
      setErr(e?.message || 'Failed to delete company'); setConfirmDel(false)
    } finally { setBusy(false) }
  }

  if (!company) return <EmptyState icon="briefcase" title="No active company" hint="Pick a company from the switcher first." />

  return (
    <Panel title={`Company · ${company.name}`} icon="briefcase">
      <div className="space-y-3.5">
        {!canManage && (
          <div className="rounded-lg border border-empire-border bg-empire-elevated/40 px-3 py-2 text-[11px] text-empire-text-muted">
            Read-only — you need <span className="text-empire-gold">company:manage</span> to edit company identity.
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={label}>Name</label><input disabled={!canManage} className={field} value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className={label}>Short</label><input disabled={!canManage} className={field} value={form.short ?? ''} onChange={e => setForm(f => ({ ...f, short: e.target.value }))} /></div>
        </div>
        <div><label className={label}>Tagline</label><input disabled={!canManage} className={field} value={form.tagline ?? ''} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className={label}>Type</label><input disabled={!canManage} className={field} value={form.type ?? ''} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} /></div>
          <div><label className={label}>HQ</label><input disabled={!canManage} className={field} value={form.hq ?? ''} onChange={e => setForm(f => ({ ...f, hq: e.target.value }))} /></div>
          <div><label className={label}>Founded</label><input disabled={!canManage} className={field} value={form.founded ?? ''} onChange={e => setForm(f => ({ ...f, founded: e.target.value }))} /></div>
        </div>
        <div className="font-data text-[10px] text-empire-text-dim">slug: {company.slug} · id: {company.id}</div>
        {err && <div className="flex items-center gap-2 rounded-lg border border-empire-red/40 bg-empire-red/10 px-3 py-2 text-xs text-empire-red-bright"><EmpireIcon name="alert" size={14} /> {err}</div>}
        {msg && <div className="flex items-center gap-2 rounded-lg border border-empire-green/40 bg-empire-green-bg px-3 py-2 text-xs text-empire-green-bright"><EmpireIcon name="check" size={14} /> {msg}</div>}
        {canManage && (
          <div className="flex items-center justify-between gap-3 pt-1">
            {company.slug !== 'cregen' ? (
              confirmDel ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-empire-text-muted">Delete this company?</span>
                  <button onClick={remove} disabled={busy} className="rounded-lg border border-empire-red/50 bg-empire-red/10 px-3 py-1.5 text-xs text-empire-red-bright transition-colors hover:bg-empire-red/20 disabled:opacity-50">
                    {busy ? 'Deleting…' : 'Confirm delete'}
                  </button>
                  <button onClick={() => setConfirmDel(false)} disabled={busy} className="px-2 py-1.5 text-xs text-empire-text-muted hover:text-empire-text">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(true)} className="flex items-center gap-1.5 rounded-lg border border-empire-border px-3 py-1.5 text-xs text-empire-text-muted transition-colors hover:border-empire-red/50 hover:text-empire-red-bright">
                  <EmpireIcon name="trash" size={13} /> Delete company
                </button>
              )
            ) : (
              <span className="font-data text-[10px] text-empire-text-dim">flagship — cannot be deleted</span>
            )}
            <LiquidMetalButton variant="gold" size="sm" icon={<EmpireIcon name="check" size={14} />} onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </LiquidMetalButton>
          </div>
        )}
      </div>
    </Panel>
  )
}

/* ── Environment ──────────────────────────────────────────────── */
function EnvironmentTab({ canManage }: { canManage: boolean }) {
  const [env, setEnv] = useState<EnvStatus | null>(null)
  const [denied, setDenied] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const load = useCallback(() => fetcher('/api/settings/env').then(setEnv).catch(() => setDenied(true)), [])
  useEffect(() => {
    if (!canManage) { setDenied(true); return }
    load()
  }, [canManage, load])

  async function saveKey(key: string) {
    const value = drafts[key]?.trim()
    if (!value) return
    setBusy(key); setErr(null)
    try {
      await patch(`/api/settings/env/${key}`, { value })
      setDrafts(d => ({ ...d, [key]: '' }))
      await load()
    } catch (e: any) { setErr(e?.message || 'Failed to save key') } finally { setBusy(null) }
  }

  async function deleteKey(key: string) {
    setBusy(key); setErr(null)
    try {
      await del(`/api/settings/env/${key}`)
      setDrafts(d => ({ ...d, [key]: '' }))
      await load()
    } catch (e: any) { setErr(e?.message || 'Failed to delete key') } finally { setBusy(null) }
  }

  if (denied) return <EmptyState icon="lock" title="Owner only" hint="Environment configuration requires company:manage." />
  if (!env) return <div className="py-8 text-sm text-empire-text-muted">Loading environment…</div>

  return (
    <div className="space-y-4">
      <GlassPanel variant="gold" className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-semibold text-empire-text">Configuration</p>
          <p className="text-[11px] text-empire-text-muted">Live presence check — secret values are never shown.</p>
        </div>
        <div className="text-right">
          <p className="font-empire text-2xl tabular-nums text-empire-text">{env.summary.configured}<span className="text-empire-text-muted">/{env.summary.total}</span></p>
          <p className="text-[10px] uppercase tracking-widest text-empire-text-muted">{env.summary.missing} missing</p>
        </div>
      </GlassPanel>
      {Object.entries(env.groups).map(([group, items]) => (
        <Panel key={group} title={group} icon="cog">
          <div className="space-y-1.5">
            {items.map(it => (
              <div key={it.key} className="rounded-lg border border-empire-border/60 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-empire-text">{it.label}</p>
                  <p className="truncate font-data text-[10px] text-empire-text-dim">{it.key}{it.doc ? ` — ${it.doc}` : ''}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${it.set ? 'rag-green' : 'rag-pending'}`}>
                  {it.set ? 'Set' : 'Missing'}
                </span>
                </div>
                {['Integrations', 'Marketing'].includes(group) && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <div className="relative">
                      <input
                        className={`${field} pr-9 font-data text-xs`}
                        type={visible[it.key] ? 'text' : 'password'}
                        value={drafts[it.key] ?? ''}
                        onChange={e => setDrafts(d => ({ ...d, [it.key]: e.target.value }))}
                        placeholder={it.set ? 'Enter replacement value' : 'Enter key value'}
                      />
                      <button
                        type="button"
                        onClick={() => setVisible(v => ({ ...v, [it.key]: !v[it.key] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-empire-text-muted hover:text-empire-gold"
                        aria-label={visible[it.key] ? 'Hide value' : 'Show value'}
                      >
                        <EmpireIcon name="eye" size={15} />
                      </button>
                    </div>
                    <button
                      onClick={() => saveKey(it.key)}
                      disabled={busy === it.key || !(drafts[it.key] ?? '').trim()}
                      className="rounded-lg border border-empire-gold/40 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-empire-gold transition-colors hover:bg-empire-gold/10 disabled:opacity-40"
                    >
                      {busy === it.key ? 'Saving…' : it.set ? 'Modify' : 'Add key'}
                    </button>
                    <button
                      onClick={() => deleteKey(it.key)}
                      disabled={busy === it.key || !it.set}
                      className="rounded-lg border border-empire-red/40 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-empire-red-bright transition-colors hover:bg-empire-red/10 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      ))}
      {err && <p className="rounded-lg border border-empire-red/40 bg-empire-red/10 px-3 py-2 text-xs text-empire-red-bright">{err}</p>}
      <p className="text-[11px] text-empire-text-dim">
        Core, agent, email, banking and deploy keys are server-managed. Integrations and Marketing keys can be added, modified or deleted here for the running API process; existing secret values are never displayed.
      </p>
    </div>
  )
}
