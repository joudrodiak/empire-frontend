'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useAuth, userCan } from '@/lib/auth'
import { fetcher, patch, del, post } from '@/lib/api'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { Panel } from '@/components/molecules/Panel'
import { TabBar } from '@/components/templates/TabBar'
import { LiquidMetalButton } from '@/components/atoms/LiquidMetalButton'
import { EmptyState } from '@/components/atoms/EmptyState'
import { FileDrop } from '@/components/molecules/FileDrop'
import { CURRENCIES, CURRENCY_KEY, currencyCode, type CurrencyCode } from '@/lib/currency'
import { LOCALES, useI18n, type MsgKey } from '@/lib/i18n'

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

const TAB_DEFS: { id: string; label: MsgKey; icon: IconName }[] = [
  { id: 'integrations', label: 'settings.tabIntegrations', icon: 'link' },
  { id: 'agent', label: 'settings.tabAgent', icon: 'sparkle' },
  { id: 'company', label: 'settings.tabCompany', icon: 'briefcase' },
  { id: 'appearance', label: 'settings.tabAppearance', icon: 'eye' },
  { id: 'environment', label: 'settings.tabEnvironment', icon: 'cog' },
]

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const { t } = useI18n()
  const [tab, setTab] = useState('integrations')
  const canManage = userCan(user, 'company:manage') || userCan(user, '*')

  if (loading) return <div className="px-6 py-10 text-sm text-empire-text-muted">{t('common.loading')}</div>

  return (
    <div className="mx-auto max-w-5xl px-5 pb-28 pt-8">
      <header className="mb-6 animate-slide-up">
        <p className="text-[11px] uppercase tracking-[0.3em] text-empire-text-muted">Empire OS</p>
        <h1 className="font-empire text-3xl text-empire-text">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-empire-text-muted">
          {t('settings.subtitle')}
        </p>
      </header>

      <TabBar tabs={TAB_DEFS.map(d => ({ ...d, label: t(d.label) }))} active={tab} onChange={setTab} />

      {tab === 'integrations' && <IntegrationsTab />}
      {tab === 'agent' && <AgentTab />}
      {tab === 'company' && <CompanyTab canManage={canManage} />}
      {tab === 'appearance' && <AppearanceTab />}
      {tab === 'environment' && <EnvironmentTab canManage={canManage} />}
    </div>
  )
}

/* ── Integrations ─────────────────────────────────────────────── */
// Social providers handled by the Empire-managed OAuth app. Each lights up for
// real the moment its CLIENT_ID/SECRET are set in env; until then "Connect" runs
// a demo (simulate) handshake so the flow is exercisable on dummy data.
type SocialProvider = { id: string; name: string; icon: IconName; hint: string; keys: string }
const SOCIAL_PROVIDERS: SocialProvider[] = [
  { id: 'instagram', name: 'Instagram', icon: 'people', hint: 'Social metrics & content context', keys: 'INSTAGRAM_OAUTH_CLIENT_ID · _CLIENT_SECRET' },
  { id: 'facebook', name: 'Facebook', icon: 'people', hint: 'Meta pages & paid-social context', keys: 'FACEBOOK_OAUTH_CLIENT_ID · _CLIENT_SECRET' },
  { id: 'tiktok', name: 'TikTok', icon: 'megaphone', hint: 'Short-form account metrics', keys: 'TIKTOK_OAUTH_CLIENT_ID · _CLIENT_SECRET' },
  { id: 'x', name: 'X', icon: 'megaphone', hint: 'Public reach & posting context', keys: 'X_OAUTH_CLIENT_ID · _CLIENT_SECRET' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'briefcase', hint: 'Company-page & network metrics', keys: 'LINKEDIN_OAUTH_CLIENT_ID · _CLIENT_SECRET' },
  { id: 'youtube', name: 'YouTube', icon: 'document', hint: 'Channel metrics & content context', keys: 'YOUTUBE_OAUTH_CLIENT_ID · _CLIENT_SECRET' },
]
type SocialAcct = { id: string; platform: string; handle: string; status: string; connection: string }

function IntegrationsTab() {
  const { user } = useAuth()
  const canConnect = userCan(user, 'company:manage') || userCan(user, '*')
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [providers, setProviders] = useState<Record<string, boolean>>({})
  const [accounts, setAccounts] = useState<SocialAcct[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string>('')

  const loadAccounts = useCallback(() => {
    fetcher('/api/marketing/social/accounts?pageSize=100').then(r => setAccounts(r?.data || [])).catch(() => setAccounts([]))
  }, [])
  useEffect(() => {
    fetcher('/api/agent/status').then(setStatus).catch(() => setStatus(null))
    fetcher('/api/marketing/social/oauth/providers').then(setProviders).catch(() => setProviders({}))
    loadAccounts()
  }, [loadAccounts])

  const acctFor = (pid: string) => accounts.find(a => a.platform === pid)

  // Empire-managed OAuth: ensure a SocialAccount exists for the platform, then
  // either send the operator to the provider (live keys) or run the demo
  // handshake. The connected account also appears in Marketing → Accounts.
  async function connect(p: SocialProvider) {
    if (!canConnect) return
    setBusy(p.id); setMsg('')
    try {
      let acct = acctFor(p.id)
      if (!acct) {
        acct = await post('/api/marketing/social/accounts', { platform: p.id, handle: `@${p.id}`, displayName: p.name, connection: 'oauth' }) as SocialAcct
      }
      const au = await fetcher(`/api/marketing/social/oauth/${p.id}/authorize-url?accountId=${acct.id}`).catch(() => null)
      if (au?.configured && au?.url) { window.location.href = au.url; return }
      await post(`/api/marketing/social/accounts/${acct.id}/oauth/simulate`, {})
      await post(`/api/marketing/social/accounts/${acct.id}/sync`, {})
      setMsg(`${p.name} connected in demo mode — add live keys in env for real metrics. It now appears in Marketing → Accounts.`)
      loadAccounts()
    } catch { setMsg(`Could not connect ${p.name}.`) }
    finally { setBusy(null) }
  }

  async function syncNow(p: SocialProvider) {
    const acct = acctFor(p.id); if (!acct || !canConnect) return
    setBusy(p.id)
    try { const r = await post(`/api/marketing/social/accounts/${acct.id}/sync`, {}) as any; setMsg(`${p.name} synced (${r?.mode || 'ok'}).`); loadAccounts() }
    catch { setMsg(`Sync failed for ${p.name}.`) }
    finally { setBusy(null) }
  }

  const comms = [
    { name: 'Slack', icon: 'megaphone' as IconName, on: !!status?.channels?.slack, hint: 'Approval dispatch + agent broadcasts', keys: 'SLACK_WEBHOOK_URL' },
    { name: 'Telegram', icon: 'megaphone' as IconName, on: !!status?.channels?.telegram, hint: 'Approval dispatch + agent broadcasts', keys: 'TELEGRAM_BOT_TOKEN · TELEGRAM_CHAT_ID' },
  ]
  const finance = [
    { name: 'Banking (NL)', icon: 'coins' as IconName, hint: 'Tink / GoCardless / Plaid aggregator', keys: 'TINK_* · GOCARDLESS_ACCESS_TOKEN · PLAID_*' },
    { name: 'Banking (UAE)', icon: 'coins' as IconName, hint: 'Lean / Tarabut aggregator', keys: 'LEAN_APP_TOKEN · TARABUT_*' },
  ]

  return (
    <div className="space-y-6">
      {msg && <p className="rounded-lg border border-empire-border bg-empire-elevated/40 px-3 py-2 text-[12px] text-empire-text-muted animate-fade-in">{msg}</p>}

      {/* Communication */}
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-empire-text-muted"><EmpireIcon name="megaphone" size={13} /> Communication</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {comms.map(r => (
            <GlassPanel key={r.name} variant="glass" className="animate-slide-up p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-empire-border bg-empire-elevated/50 text-empire-gold"><EmpireIcon name={r.icon} size={16} /></span>
                  <div><p className="text-sm font-semibold text-empire-text">{r.name}</p><p className="text-[11px] text-empire-text-muted">{r.hint}</p></div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${r.on ? 'rag-green' : 'rag-pending'}`}>{r.on ? 'Connected' : 'Not set'}</span>
              </div>
              <p className="mt-3 border-t border-empire-border/60 pt-2 font-data text-[10px] text-empire-text-dim">{r.keys}</p>
            </GlassPanel>
          ))}
        </div>
      </section>

      {/* Social — Empire-managed OAuth */}
      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-empire-text-muted"><EmpireIcon name="people" size={13} /> Social — Empire-managed OAuth</h3>
          <span className="text-[10px] text-empire-text-dim">Connected accounts also appear in Marketing → Accounts</span>
        </div>
        {!canConnect && <p className="mb-2 text-[11px] text-empire-text-dim">You need company-manage permission to connect accounts.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_PROVIDERS.map(p => {
            const acct = acctFor(p.id)
            const connected = acct?.status === 'connected'
            const live = providers[p.id]
            return (
              <GlassPanel key={p.id} variant="glass" className="animate-slide-up p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-lg border border-empire-border bg-empire-elevated/50 text-empire-gold"><EmpireIcon name={p.icon} size={16} /></span>
                    <div><p className="text-sm font-semibold text-empire-text">{p.name}</p><p className="text-[11px] text-empire-text-muted">{p.hint}</p></div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${connected ? 'rag-green' : 'rag-pending'}`}>{connected ? 'Connected' : 'Not set'}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-empire-border/60 pt-2">
                  <span className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${live ? 'rag-green' : 'rag-pending'}`}>{live ? 'Live keys' : 'Demo (simulate)'}</span>
                  {canConnect && (
                    connected
                      ? <button onClick={() => syncNow(p)} disabled={busy === p.id} className="rounded-lg border border-empire-border bg-empire-surface px-3 py-1 text-[11px] text-empire-text transition-colors hover:border-empire-gold/30 disabled:opacity-50">{busy === p.id ? '…' : 'Sync now'}</button>
                      : <button onClick={() => connect(p)} disabled={busy === p.id} className="empire-btn-primary text-[11px] disabled:opacity-50">{busy === p.id ? 'Connecting…' : (live ? `Authorize ${p.name}` : 'Connect (demo)')}</button>
                  )}
                </div>
                <p className="mt-2 font-data text-[10px] text-empire-text-dim">{p.keys}</p>
              </GlassPanel>
            )
          })}
        </div>
      </section>

      {/* Finance */}
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-empire-text-muted"><EmpireIcon name="coins" size={13} /> Finance — open banking</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {finance.map(r => (
            <GlassPanel key={r.name} variant="glass" className="animate-slide-up p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-empire-border bg-empire-elevated/50 text-empire-gold"><EmpireIcon name={r.icon} size={16} /></span>
                  <div><p className="text-sm font-semibold text-empire-text">{r.name}</p><p className="text-[11px] text-empire-text-muted">{r.hint}</p></div>
                </div>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest rag-pending">Awaiting keys</span>
              </div>
              <p className="mt-3 border-t border-empire-border/60 pt-2 font-data text-[10px] text-empire-text-dim">{r.keys}</p>
            </GlassPanel>
          ))}
        </div>
      </section>
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
type BoardMember = { name: string; role: string; since?: string | null; email?: string | null }
type Company = {
  id: string; slug: string; name: string; short: string; tagline: string; type: string; hq: string; founded: string
  stampImageUrl?: string | null; stampEnabled?: boolean; confidentialWatermark?: boolean
  boardMembers?: BoardMember[] | null
}
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
        stampImageUrl: form.stampImageUrl || null,
        stampEnabled: Boolean(form.stampEnabled),
        confidentialWatermark: Boolean(form.confidentialWatermark),
        boardMembers: (form.boardMembers || []).filter(m => (m.name || '').trim()),
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
          <div><label className={label}>Name</label><input disabled={!canManage} className={field} value={form.name ?? ''} placeholder="Company name" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className={label}>Short</label><input disabled={!canManage} className={field} value={form.short ?? ''} placeholder="e.g. CGN" onChange={e => setForm(f => ({ ...f, short: e.target.value }))} /></div>
        </div>
        <div><label className={label}>Tagline</label><input disabled={!canManage} className={field} value={form.tagline ?? ''} placeholder="One line of identity" onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className={label}>Type</label><input disabled={!canManage} className={field} value={form.type ?? ''} placeholder="Subsidiary" onChange={e => setForm(f => ({ ...f, type: e.target.value }))} /></div>
          <div><label className={label}>HQ</label><input disabled={!canManage} className={field} value={form.hq ?? ''} placeholder="Amsterdam" onChange={e => setForm(f => ({ ...f, hq: e.target.value }))} /></div>
          <div><label className={label}>Founded</label><input disabled={!canManage} className={field} value={form.founded ?? ''} placeholder="2024" onChange={e => setForm(f => ({ ...f, founded: e.target.value }))} /></div>
        </div>
        <div className="rounded-xl border border-empire-border bg-empire-surface/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-empire-text">Legal document marks</p>
              <p className="text-[11px] text-empire-text-muted">Use a greyscale-style stamp image and optional confidential page background.</p>
            </div>
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-empire-text-muted">
              <input disabled={!canManage} type="checkbox" checked={Boolean(form.confidentialWatermark)}
                onChange={e => setForm(f => ({ ...f, confidentialWatermark: e.target.checked }))} className="accent-empire-gold" />
              Confidential
            </label>
          </div>
          <FileDrop value={form.stampImageUrl || ''} onChange={v => setForm(f => ({ ...f, stampImageUrl: v, stampEnabled: Boolean(v) }))} label="Company stamp PNG" allowUrl={false} />
          <label className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-empire-text-muted">
            <input disabled={!canManage || !form.stampImageUrl} type="checkbox" checked={Boolean(form.stampEnabled)}
              onChange={e => setForm(f => ({ ...f, stampEnabled: e.target.checked }))} className="accent-empire-gold" />
            Add stamp to legal PDFs
          </label>
        </div>
        <div className="rounded-xl border border-empire-border bg-empire-surface/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-empire-text"><EmpireIcon name="people" size={13} /> Board of Directors</p>
              <p className="text-[11px] text-empire-text-muted">Recorded on the company profile and available to legal documents.</p>
            </div>
            {canManage && (
              <button
                onClick={() => setForm(f => ({ ...f, boardMembers: [...(f.boardMembers || []), { name: '', role: 'Director', since: '', email: '' }] }))}
                className="flex items-center gap-1.5 rounded-lg border border-empire-border px-2.5 py-1.5 text-[11px] text-empire-text-muted transition-colors hover:border-empire-gold/50 hover:text-empire-gold">
                <EmpireIcon name="plus" size={12} /> Add member
              </button>
            )}
          </div>
          {(form.boardMembers || []).length === 0 ? (
            <p className="px-1 py-2 text-[11px] text-empire-text-dim">No board members recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {(form.boardMembers || []).map((m, i) => {
                const upd = (patchM: Partial<BoardMember>) => setForm(f => ({ ...f, boardMembers: (f.boardMembers || []).map((x, j) => j === i ? { ...x, ...patchM } : x) }))
                return (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-empire-border/60 bg-empire-elevated/30 p-2">
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <input disabled={!canManage} className={field} value={m.name ?? ''} placeholder="Full name" onChange={e => upd({ name: e.target.value })} />
                      <input disabled={!canManage} className={field} value={m.role ?? ''} placeholder="Role (e.g. Chairman)" onChange={e => upd({ role: e.target.value })} />
                      <input disabled={!canManage} className={field} value={m.since ?? ''} placeholder="Since (e.g. 2024)" onChange={e => upd({ since: e.target.value })} />
                      <input disabled={!canManage} className={field} value={m.email ?? ''} placeholder="Email (optional)" onChange={e => upd({ email: e.target.value })} />
                    </div>
                    {canManage && (
                      <button onClick={() => setForm(f => ({ ...f, boardMembers: (f.boardMembers || []).filter((_, j) => j !== i) }))}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-empire-border text-empire-text-muted transition-colors hover:border-empire-red/50 hover:text-empire-red-bright" title="Remove member">
                        <EmpireIcon name="trash" size={13} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
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

/* ── Appearance ───────────────────────────────────────────────── */
type TextScale = 'small' | 'medium' | 'large'
const SCALE_KEY = 'empire-os-text-scale'
const SCALES: { id: TextScale; label: MsgKey; px: string; hint: MsgKey }[] = [
  { id: 'small', label: 'settings.scaleSmall', px: '15px', hint: 'settings.scaleSmallHint' },
  { id: 'medium', label: 'settings.scaleMedium', px: '16.5px', hint: 'settings.scaleMediumHint' },
  { id: 'large', label: 'settings.scaleLarge', px: '18px', hint: 'settings.scaleLargeHint' },
]

function AppearanceTab() {
  const { t, locale, setLocale } = useI18n()
  const [scale, setScale] = useState<TextScale>('medium')
  const [currency, setCurrency] = useState<CurrencyCode>('EUR')
  useEffect(() => {
    try {
      const s = localStorage.getItem(SCALE_KEY)
      if (s === 'small' || s === 'large') setScale(s)
    } catch { /* noop */ }
    setCurrency(currencyCode())
  }, [])

  function applyCurrency(code: CurrencyCode) {
    setCurrency(code)
    try { localStorage.setItem(CURRENCY_KEY, code) } catch { /* noop */ }
  }

  // The whole UI is rem-based, so swapping the root font-size class rescales
  // every surface at once (classes defined in globals.css).
  function apply(s: TextScale) {
    setScale(s)
    const r = document.documentElement
    r.classList.remove('text-scale-small', 'text-scale-medium', 'text-scale-large')
    r.classList.add(`text-scale-${s}`)
    try { localStorage.setItem(SCALE_KEY, s) } catch { /* noop */ }
  }

  return (
    <Panel title={t('settings.tabAppearance')} icon="eye">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-empire-text">{t('settings.language')}</p>
          <p className="text-[11px] text-empire-text-muted">{t('settings.languageHint')}</p>
        </div>
        {/* Language selector (B1) — native names so each language is findable
            even when the UI is in a script the user can't read. */}
        <div className="grid gap-2 sm:grid-cols-5">
          {LOCALES.map(l => (
            <button
              key={l.code}
              onClick={() => setLocale(l.code)}
              aria-pressed={locale === l.code}
              className={`rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 ${locale === l.code ? 'border-empire-gold/60 bg-empire-gold/10 shadow-gold-glow' : 'border-empire-border bg-empire-elevated/40 hover:border-empire-gold/40'}`}
            >
              <span className="font-empire text-base text-empire-text">{l.label}</span>
              <p className="mt-1 text-[11px] text-empire-text-muted">{l.english}{l.dir === 'rtl' ? ' · RTL' : ''}</p>
            </button>
          ))}
        </div>
        <div className="border-t border-empire-border pt-4">
          <p className="text-sm font-semibold text-empire-text">{t('settings.textSize')}</p>
          <p className="text-[11px] text-empire-text-muted">{t('settings.textSizeHint')}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {SCALES.map(s => (
            <button
              key={s.id}
              onClick={() => apply(s.id)}
              aria-pressed={scale === s.id}
              className={`rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 ${scale === s.id ? 'border-empire-gold/60 bg-empire-gold/10 shadow-gold-glow' : 'border-empire-border bg-empire-elevated/40 hover:border-empire-gold/40'}`}
            >
              <span className={`font-empire text-empire-text ${s.id === 'small' ? 'text-sm' : s.id === 'medium' ? 'text-base' : 'text-lg'}`}>Aa</span>
              <p className="mt-1 text-xs font-semibold text-empire-text">{t(s.label)} <span className="font-data text-[10px] text-empire-text-dim">{s.px}</span></p>
              <p className="text-[11px] text-empire-text-muted">{t(s.hint)}</p>
            </button>
          ))}
        </div>
        <div className="border-t border-empire-border pt-4">
          <p className="text-sm font-semibold text-empire-text">{t('settings.currency')}</p>
          <p className="text-[11px] text-empire-text-muted">{t('settings.currencyHint')}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {CURRENCIES.map(c => (
            <button
              key={c.code}
              onClick={() => applyCurrency(c.code)}
              aria-pressed={currency === c.code}
              className={`rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 ${currency === c.code ? 'border-empire-gold/60 bg-empire-gold/10 shadow-gold-glow' : 'border-empire-border bg-empire-elevated/40 hover:border-empire-gold/40'}`}
            >
              <span className="font-empire text-base text-empire-text">{c.symbol}</span>
              <p className="mt-1 text-xs font-semibold text-empire-text">{c.label}</p>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-empire-text-dim">{t('settings.themeNote')}</p>
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
