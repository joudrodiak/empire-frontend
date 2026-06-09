'use client'
import React from 'react'
import { rankFor } from '@/lib/game-logic'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { rankIcon } from '@/lib/rank-icons'

export function LevelBadge({ level, accent = '#c9a233' }: { level: number; accent?: string }) {
  const rank = rankFor(level)
  return (
    <div className="group flex shrink-0 items-center gap-2.5">
      <div className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-xl border font-bold tabular-nums text-lg transition-all duration-200 group-hover:-translate-y-0.5"
        style={{ borderColor: `${accent}66`, background: `radial-gradient(circle at 30% 22%, ${accent}38, transparent 46%), linear-gradient(155deg, ${accent}24, ${accent}08)`, color: accent, boxShadow: `0 12px 28px ${accent}18, 0 0 18px ${accent}24 inset` }}>
        <span className="absolute inset-x-2 top-0 h-px bg-white/30" aria-hidden />
        {level}
        <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border drop-shadow" style={{ borderColor: `${accent}66`, background: '#0D0D1A', color: accent }}><EmpireIcon name={rankIcon(rank.name)} size={11} /></span>
      </div>
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-[0.18em] text-empire-text-muted">Rank</div>
        <div className="text-sm font-semibold text-empire-text">{rank.name}</div>
      </div>
    </div>
  )
}
