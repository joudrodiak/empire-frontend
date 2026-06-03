'use client'
import React from 'react'
import { rankFor } from '@/lib/game-logic'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { rankIcon } from '@/lib/rank-icons'

export function LevelBadge({ level, accent = '#c9a233' }: { level: number; accent?: string }) {
  const rank = rankFor(level)
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <div className="relative w-12 h-12 rounded-xl grid place-items-center font-bold tabular-nums text-lg border"
        style={{ borderColor: `${accent}66`, background: `linear-gradient(155deg, ${accent}22, ${accent}08)`, color: accent, boxShadow: `0 0 12px ${accent}22 inset` }}>
        {level}
        <span className="absolute -top-1.5 -right-1.5 grid place-items-center w-5 h-5 rounded-full border drop-shadow" style={{ borderColor: `${accent}66`, background: '#0D0D1A', color: accent }}><EmpireIcon name={rankIcon(rank.name)} size={11} /></span>
      </div>
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-[0.18em] text-empire-text-muted">Rank</div>
        <div className="text-sm font-semibold text-empire-text">{rank.name}</div>
      </div>
    </div>
  )
}
