'use client'
import React from 'react'
import { progressFor } from '@/lib/game-logic'

export function XpBar({ xp, level, accent = '#c9a233' }: { xp: number; level: number; accent?: string }) {
  const p = progressFor(xp, level)
  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline text-[11px] mb-1">
        <span className="text-empire-text-muted">
          Lv <span className="text-empire-text font-semibold tabular-nums">{level}</span>
          <span className="text-empire-dim"> → </span>
          <span className="text-empire-text font-semibold tabular-nums">{level + 1}</span>
        </span>
        <span className="text-empire-text-muted tabular-nums">
          <span className="text-empire-gold font-semibold">{p.intoLevel.toLocaleString()}</span> / {p.span.toLocaleString()} XP
        </span>
      </div>
      <div className="h-2 rounded-full bg-empire-elevated overflow-hidden border border-empire-border/60">
        <div className="h-full rounded-full transition-all"
          style={{ width: `${p.pct}%`, background: `linear-gradient(90deg, ${accent}99, ${accent})`, boxShadow: `0 0 8px ${accent}66` }} />
      </div>
    </div>
  )
}
