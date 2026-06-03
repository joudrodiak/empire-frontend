'use client'
import React from 'react'
import type { Achievement } from '@/lib/game-logic'
import { EmpireIcon, asIconName } from '@/components/atoms/EmpireIcon'

export function AchievementChip({ label, icon, locked = false }: Achievement) {
  return (
    <span className={[
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap transition-colors',
      locked
        ? 'border-empire-border bg-empire-elevated/40 text-empire-dim opacity-55'
        : 'border-empire-gold/30 bg-empire-gold/10 text-empire-gold',
    ].join(' ')} title={locked ? `Locked — ${label}` : label}>
      <EmpireIcon name={locked ? 'lock' : asIconName(icon, 'medal')} size={12} />
      {label}
    </span>
  )
}
