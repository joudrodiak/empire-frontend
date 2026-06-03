'use client'
import React from 'react'
import { rankFor } from '@/lib/game-logic'
import { rankIcon } from '@/lib/rank-icons'
import { EmpireIcon, asIconName } from '@/components/atoms/EmpireIcon'

export interface LeaderboardRow { name: string; icon: string; level: number; xp: number; accent: string }

export function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  const ranked = [...rows].sort((a, b) => b.xp - a.xp)
  return (
    <ol className="space-y-1.5">
      {ranked.map((r, i) => {
        const rank = rankFor(r.level)
        return (
          <li key={r.name + i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-empire-border bg-empire-surface hover:border-empire-gold/30 transition-colors">
            <span className="w-7 grid place-items-center text-sm font-bold tabular-nums shrink-0">
              {i < 3
                ? <EmpireIcon name="trophy" size={16} className="text-empire-gold" />
                : <span className="text-empire-text-muted font-data">{i + 1}</span>}
            </span>
            <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0 border"
              style={{ borderColor: `${r.accent}55`, background: `${r.accent}12`, color: r.accent }}>
              <EmpireIcon name={asIconName(r.icon, 'shield')} size={16} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-empire-text truncate">{r.name}</div>
              <div className="flex items-center gap-1 text-[11px] text-empire-text-muted">
                <EmpireIcon name={rankIcon(rank.name)} size={11} /> {rank.name} · Lv {r.level}
              </div>
            </div>
            <span className="font-data text-sm font-semibold tabular-nums shrink-0" style={{ color: r.accent }}>{r.xp.toLocaleString()} XP</span>
          </li>
        )
      })}
    </ol>
  )
}
