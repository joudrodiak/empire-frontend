'use client'
import React from 'react'
import type { Quest } from '@/lib/game-logic'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'

export function QuestList({ quests, accent = '#c9a233' }: { quests: Quest[]; accent?: string }) {
  return (
    <ul className="space-y-1.5">
      {quests.map((q, i) => (
        <li key={i} className={[
          'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors',
          q.done ? 'border-empire-border/50 bg-empire-elevated/30' : 'border-empire-border bg-empire-surface hover:border-empire-gold/40',
        ].join(' ')}>
          <span className="grid place-items-center w-5 h-5 rounded-md border shrink-0"
            style={q.done
              ? { borderColor: accent, background: accent, color: '#0b0b10' }
              : { borderColor: '#2a2a38', color: 'transparent' }}>
            <EmpireIcon name="check" size={12} strokeWidth={2.25} />
          </span>
          <span className={['flex-1 text-sm', q.done ? 'line-through text-empire-text-muted' : 'text-empire-text'].join(' ')}>
            {q.title}
          </span>
          <span className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded shrink-0"
            style={{ color: accent, background: `${accent}14` }}>
            +{q.xp} XP
          </span>
        </li>
      ))}
    </ul>
  )
}
