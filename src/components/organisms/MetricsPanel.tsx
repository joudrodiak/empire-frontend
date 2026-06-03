'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetcher } from '@/lib/api'
import { KpiCard, Panel, AreaChart, ProgressBar, EmptyState } from '@/lib/ui'
import { XpBar } from '@/lib/game'
import { rankFor } from '@/lib/game-logic'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { rankIcon } from '@/lib/rank-icons'

type Rank = { name: string; icon: string }
type PerUser = { id: string; name: string; role: string; xp: number; level: number; rank: Rank; share: number; contractType: string }
type Metrics = {
  department: { slug: string; name: string; color: string | null; framework: string; managedByAI: boolean; aiManagerName: string | null }
  health: {
    compositeScore: number | null; rag: string; zScore: number
    empireMean: number; empireStd: number; interpretation: string
    history: { period: string; score: number | null; rag: string }[]
  }
  team: {
    deptXp: number; deptLevel: number; deptRank: Rank; nextLevelXp: number; thisLevelXp: number
    memberCount: number; totalMemberXp: number; avgLevel: number; topPerformer: PerUser | null; perUser: PerUser[]
  }
  kpis: { slug: string; name: string; unit: string | null; weight: number; higherIsBetter: boolean; targetValue: number | null; latest: number | null; trend: { period: string; value: number | null }[] }[]
}

const RAG_STYLE: Record<string, { color: string; label: string }> = {
  GREEN: { color: '#3a9d5c', label: 'Healthy' },
  AMBER: { color: '#c9a233', label: 'Watch' },
  RED: { color: '#c94f4f', label: 'Needs action' },
  PENDING: { color: '#6b7280', label: 'No data yet' },
}

export function MetricsPanel({ departmentSlug, accent = '#c9a233' }: { departmentSlug: string; accent?: string }) {
  const [m, setM] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    try { setM(await fetcher(`/api/metrics/${departmentSlug}`)) } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [departmentSlug])
  useEffect(() => { load() }, [load])

  if (loading) return <div className="py-16 text-center text-empire-text-dim text-sm animate-pulse">Computing metrics…</div>
  if (!m) return <EmptyState icon="chart-bar" title="Metrics unavailable" hint="Could not load department metrics." />

  const rag = RAG_STYLE[m.health.rag] ?? RAG_STYLE.PENDING
  const zTxt = m.health.zScore > 0 ? `+${m.health.zScore}σ` : `${m.health.zScore}σ`
  const scoreHistory = m.health.history.filter(h => h.score != null).map(h => h.score as number)

  return (
    <div className="space-y-6">
      {/* Headline metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Health Score"
          value={m.health.compositeScore != null ? `${m.health.compositeScore}` : '—'}
          sub={rag.label}
          spark={scoreHistory.length > 1 ? scoreHistory : undefined}
          accent={rag.color}
        />
        <KpiCard
          label="Z-Score vs Empire"
          value={m.health.compositeScore != null ? zTxt : '—'}
          sub={m.health.compositeScore != null ? m.health.interpretation : 'needs KPI data'}
          accent={m.health.zScore >= 0 ? '#3a9d5c' : '#c94f4f'}
        />
        <KpiCard label="Team Level" icon={rankIcon(m.team.deptRank.name)} value={`L${m.team.deptLevel}`} sub={`${m.team.deptRank.name} · ${m.team.deptXp.toLocaleString()} XP`} accent={accent} />
        <KpiCard label="Members" value={`${m.team.memberCount}`} sub={`avg level ${m.team.avgLevel}`} accent={accent} />
      </div>

      {/* Health + Z-score context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Composite Health Trend" className="lg:col-span-2">
          {scoreHistory.length > 1 ? (
            <AreaChart series={scoreHistory} labels={m.health.history.filter(h => h.score != null).map(h => h.period)} color={rag.color} height={200} />
          ) : (
            <div className="py-10 text-center">
              <div className="text-3xl font-bold" style={{ color: rag.color }}>{m.health.compositeScore ?? '—'}</div>
              <p className="text-xs text-empire-text-muted mt-2 max-w-sm mx-auto">
                Record KPIs over multiple periods (KPIs tab) to chart the health trend. The score weights each KPI against its target.
              </p>
            </div>
          )}
        </Panel>
        <Panel title="Standing in the Empire">
          <div className="space-y-3 py-2">
            <Row label="This dept" value={m.health.compositeScore != null ? `${m.health.compositeScore}` : '—'} accent={rag.color} />
            <Row label="Empire average" value={`${m.health.empireMean}`} />
            <Row label="Spread (σ)" value={`${m.health.empireStd}`} />
            <Row label="Z-score" value={m.health.compositeScore != null ? zTxt : '—'} accent={m.health.zScore >= 0 ? '#3a9d5c' : '#c94f4f'} />
            <p className="text-[11px] text-empire-text-muted leading-snug pt-1">
              Z-score = standard deviations above/below the Empire-wide average composite. +1σ is clearly ahead; −1σ clearly behind.
            </p>
          </div>
        </Panel>
      </div>

      {/* Collective team score + independent per-user XP */}
      <Panel title="Team Score & Member Standings" actions={<span className="text-[11px] text-empire-text-dim">collective + independent XP</span>}>
        <div className="mb-5"><XpBar xp={m.team.deptXp} level={m.team.deptLevel} accent={accent} /></div>
        {m.team.perUser.length === 0 ? (
          <div className="text-center py-6 text-empire-text-muted text-sm">No members assigned yet.</div>
        ) : (
          <div className="space-y-2">
            {m.team.perUser.map((u, i) => {
              const rk = rankFor(u.level)
              return (
                <div key={u.id} className="flex items-center gap-3 p-2.5 bg-empire-surface border border-empire-border rounded-lg">
                  <span className="text-xs text-empire-text-dim w-5 text-center tabular-nums">{i + 1}</span>
                  <div className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: accent + '22', color: accent }}>
                    {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-empire-text text-xs font-medium truncate">{u.name}</div>
                    <div className="text-empire-text-dim text-[11px] truncate">{u.role}</div>
                  </div>
                  <div className="w-28 hidden sm:block">
                    <ProgressBar value={u.share} max={100} color={accent} right={`${u.share}%`} />
                  </div>
                  <div className="text-right flex-shrink-0 w-24">
                    <div className="inline-flex items-center gap-1 text-[11px] text-empire-text-muted"><EmpireIcon name={rankIcon(rk.name)} size={11} /> L{u.level} · {rk.name}</div>
                    <div className="text-empire-gold-muted text-[11px] tabular-nums">{u.xp.toLocaleString()} XP</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      {/* KPI trend cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-empire text-empire-gold text-sm tracking-widest uppercase">{m.department.framework} KPIs</h3>
          <span className="text-[11px] text-empire-text-dim">{m.kpis.length} tracked</span>
        </div>
        {m.kpis.length === 0 ? (
          <EmptyState icon="gauge" title="No KPIs defined" hint="Define KPIs for this department to track performance." />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {m.kpis.map(k => {
              const vals = k.trend.map(t => t.value).filter((v): v is number => v != null)
              return (
                <KpiCard
                  key={k.slug}
                  label={k.name}
                  value={k.latest != null ? `${k.latest}${k.unit ? ` ${k.unit}` : ''}` : '—'}
                  sub={k.targetValue != null ? `target ${k.targetValue}${k.unit ? ` ${k.unit}` : ''}` : `weight ${(k.weight * 100).toFixed(0)}%`}
                  spark={vals.length > 1 ? vals : undefined}
                  accent={accent}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-empire-text-muted text-xs">{label}</span>
      <span className="font-semibold tabular-nums" style={accent ? { color: accent } : undefined}>{value}</span>
    </div>
  )
}
