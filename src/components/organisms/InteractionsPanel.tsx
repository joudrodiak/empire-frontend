'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetcher, post } from '@/lib/api'
import { KpiCard, Panel, DonutChart, BarChart, EmptyState } from '@/lib/ui'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { donutPalette } from '@/lib/theme'

type IxMetrics = {
  department: { slug: string; name: string; managedByAI: boolean; aiManagerName: string | null }
  volume: number; resolutionRate: number; escalationRate: number; aiHandledRate: number
  avgResponseTimeSec: number | null; avgResolutionTimeSec: number | null; csat: number | null; openCount: number
  byChannel: { channel: string; count: number }[]
  bySentiment: { sentiment: string; count: number }[]
  trend: { date: string; count: number }[]
}

const CHANNEL_COLOR: Record<string, string> = { chat: '#C9A233', email: '#C9A233', ticket: '#c9a233', call: '#C9A233', api: '#C9A233' }
const SENT_COLOR: Record<string, string> = { positive: '#C9A233', neutral: '#c9a233', negative: '#F4EFE3' }
const CHANNELS = ['chat', 'email', 'ticket', 'call', 'api']

function dur(sec: number | null): string {
  if (sec == null) return '—'
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.round(sec / 60)}m`
  return `${(sec / 3600).toFixed(1)}h`
}

export function InteractionsPanel({ departmentSlug, accent = '#C9A233' }: { departmentSlug: string; accent?: string }) {
  const [m, setM] = useState<IxMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ channel: 'chat', subject: '', status: 'resolved', satisfaction: '', responseTimeSec: '', resolutionTimeSec: '', sentiment: 'positive', escalatedToHuman: false })

  const load = useCallback(async () => {
    try { setM(await fetcher(`/api/interactions/metrics/${departmentSlug}`)) } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [departmentSlug])
  useEffect(() => { load() }, [load])

  async function submit() {
    await post('/api/interactions', {
      departmentSlug,
      channel: form.channel,
      subject: form.subject || undefined,
      status: form.status,
      sentiment: form.sentiment,
      escalatedToHuman: form.escalatedToHuman,
      satisfaction: form.satisfaction ? Number(form.satisfaction) : undefined,
      responseTimeSec: form.responseTimeSec ? Number(form.responseTimeSec) : undefined,
      resolutionTimeSec: form.resolutionTimeSec ? Number(form.resolutionTimeSec) : undefined,
    })
    setForm({ channel: 'chat', subject: '', status: 'resolved', satisfaction: '', responseTimeSec: '', resolutionTimeSec: '', sentiment: 'positive', escalatedToHuman: false })
    setShowForm(false)
    load()
  }

  if (loading) return <div className="py-16 text-center text-empire-text-dim text-sm animate-pulse">Loading interaction metrics…</div>
  if (!m) return <EmptyState icon="lifebuoy" title="No interaction data" hint="Could not load metrics." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-empire text-empire-gold text-sm tracking-widest uppercase">Interaction Metrics</h3>
          <p className="text-empire-text-muted text-xs mt-0.5">
            {m.department.managedByAI ? (
              <span className="inline-flex items-center gap-1.5">
                <EmpireIcon name="cog" size={12} className="text-empire-gold/70" />
                Automation handles inbound and escalates to a human only when needed.
              </span>
            ) : 'Customer & ops interactions.'}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-empire-gold-dim border border-empire-gold/30 text-empire-gold text-xs uppercase tracking-widest rounded hover:bg-empire-gold/20 transition-colors">
          + Log Interaction
        </button>
      </div>

      {showForm && (
        <div className="bg-empire-surface border border-empire-gold/20 rounded-lg p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Subject (optional)" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="col-span-2 empire-input" />
            <div>
              <label className="empire-label">Channel</label>
              <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} className="empire-input w-full mt-1">
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="empire-label">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="empire-input w-full mt-1">
                {['open', 'resolved', 'escalated', 'abandoned'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="empire-label">Sentiment</label>
              <select value={form.sentiment} onChange={e => setForm({ ...form, sentiment: e.target.value })} className="empire-input w-full mt-1">
                {['positive', 'neutral', 'negative'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="empire-label">CSAT (1–5)</label>
              <input type="number" min={1} max={5} value={form.satisfaction} placeholder="4" onChange={e => setForm({ ...form, satisfaction: e.target.value })} className="empire-input w-full mt-1" />
            </div>
            <div>
              <label className="empire-label">Response (sec)</label>
              <input type="number" value={form.responseTimeSec} placeholder="300" onChange={e => setForm({ ...form, responseTimeSec: e.target.value })} className="empire-input w-full mt-1" />
            </div>
            <div>
              <label className="empire-label">Resolution (sec)</label>
              <input type="number" value={form.resolutionTimeSec} placeholder="3600" onChange={e => setForm({ ...form, resolutionTimeSec: e.target.value })} className="empire-input w-full mt-1" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-empire-text-muted">
            <input type="checkbox" checked={form.escalatedToHuman} onChange={e => setForm({ ...form, escalatedToHuman: e.target.checked })} />
            Escalated to a human
          </label>
          <button onClick={submit} className="empire-btn-primary">Log Interaction</button>
        </div>
      )}

      {m.volume === 0 ? (
        <EmptyState icon="lifebuoy" title="No interactions logged yet" hint="Log interactions or pipe them from support tools to see volume, response time, resolution rate and CSAT." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Volume" value={`${m.volume}`} sub={`${m.openCount} open`} accent={accent} />
            <KpiCard label="Resolution Rate" value={`${m.resolutionRate}%`} sub={`${m.aiHandledRate}% AI-handled`} accent="#C9A233" />
            <KpiCard label="Avg Response" value={dur(m.avgResponseTimeSec)} sub={`resolve ${dur(m.avgResolutionTimeSec)}`} accent={accent} />
            <KpiCard label="CSAT" value={m.csat != null ? `${m.csat}/5` : '—'} sub={`${m.escalationRate}% escalated`} accent={m.csat != null && m.csat >= 4 ? '#C9A233' : '#c9a233'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Daily Volume" className="lg:col-span-2">
              {m.trend.length > 0 ? (
                <BarChart data={m.trend.map(t => t.count)} labels={m.trend.map(t => t.date.slice(5))} color={accent} height={180} />
              ) : <div className="py-10 text-center text-empire-text-dim text-sm">No trend yet.</div>}
            </Panel>
            <Panel title="Channel Mix">
              {m.byChannel.length > 0 ? (
                <DonutChart segments={(() => { const pal = donutPalette(m.byChannel.length); return m.byChannel.map((c, i) => ({ label: c.channel, value: c.count, color: pal[i] })) })()} />
              ) : <div className="py-10 text-center text-empire-text-dim text-sm">—</div>}
            </Panel>
          </div>

          {m.bySentiment.length > 0 && (
            <Panel title="Sentiment">
              <DonutChart segments={m.bySentiment.map(s => ({ label: s.sentiment, value: s.count, color: SENT_COLOR[s.sentiment] || accent }))} />
            </Panel>
          )}
        </>
      )}
    </div>
  )
}
