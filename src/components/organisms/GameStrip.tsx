'use client'
import React from 'react'
import type { Achievement } from '@/lib/game-logic'
import { rankFor } from '@/lib/game-logic'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { rankIcon } from '@/lib/rank-icons'
import { LevelBadge } from '@/components/atoms/LevelBadge'
import { StreakCounter } from '@/components/atoms/StreakCounter'
import { AchievementChip } from '@/components/atoms/AchievementChip'
import { XpBar } from '@/components/molecules/XpBar'

export function GameStrip({ xp, level, streakDays, achievements, accent = '#c9a233' }: {
  xp: number; level: number; streakDays: number; achievements: Achievement[]; accent?: string
}) {
  const rank = rankFor(level)
  return (
    <div className="rounded-xl border border-empire-border bg-empire-surface/80 p-4"
      style={{ boxShadow: `0 0 0 1px ${accent}10` }}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <LevelBadge level={level} accent={accent} />
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] uppercase tracking-[0.18em] text-empire-gold/80">Progression</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-empire-text-muted"><EmpireIcon name={rankIcon(rank.name)} size={11} /> {rank.name}</span>
          </div>
          <XpBar xp={xp} level={level} accent={accent} />
        </div>
        <StreakCounter days={streakDays} accent={accent} />
      </div>
      {achievements.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-empire-border/60">
          {achievements.map((a, i) => <AchievementChip key={i} {...a} />)}
        </div>
      )}
    </div>
  )
}
