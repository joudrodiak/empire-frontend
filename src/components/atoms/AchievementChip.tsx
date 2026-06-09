'use client'
import React from 'react'
import type { Achievement } from '@/lib/game-logic'
import { EmpireIcon, asIconName } from '@/components/atoms/EmpireIcon'

export function AchievementChip({ label, icon, locked = false }: Achievement) {
  return (
    <span className={[
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5',
      locked
        ? 'border-empire-border bg-empire-elevated/40 text-empire-text-dim opacity-55 hover:translate-y-0'
        : 'border-empire-gold/30 bg-empire-gold/10 text-empire-gold hover:border-empire-gold/55 hover:bg-empire-gold/15',
    ].join(' ')} title={locked ? `Locked — ${label}` : label}>
      <EmpireIcon name={locked ? 'lock' : asIconName(icon, 'medal')} size={12} />
      {label}
    </span>
  )
}
