'use client'
import React from 'react'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'

// Honest empty state — shown wherever there is no real data source connected yet.
//
// `icon` is an EmpireIcon name (default 'circle'). For backward compatibility we
// also tolerate legacy emoji strings that older call sites may still pass; any
// value that isn't a known IconName falls back to 'circle' so no emoji renders.
const KNOWN: ReadonlySet<string> = new Set<IconName>([
  'finance', 'engineering', 'legal', 'marketing', 'client-success', 'partnerships',
  'hr', 'operations', 'creative', 'executive', 'advisory', 'overview', 'plus',
  'search', 'close', 'check', 'alert', 'chevron-down', 'chevron-right', 'external',
  'document', 'calendar', 'chart-bar', 'chart-line', 'trophy', 'star', 'shield',
  'flag', 'clock', 'arrow-up', 'arrow-down', 'sparkle', 'crown', 'scales', 'gavel',
  'people', 'user', 'lock', 'book', 'gauge', 'rocket', 'megaphone', 'handshake',
  'lifebuoy', 'pen-nib', 'compass', 'coins', 'cog', 'medal', 'flame', 'briefcase',
  'pin', 'card', 'circle',
])

export function EmptyState({ icon = 'circle', title, hint, action }: {
  icon?: IconName | string; title: string; hint?: string; action?: React.ReactNode
}) {
  const name: IconName = KNOWN.has(icon as string) ? (icon as IconName) : 'circle'
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl border border-empire-gold/25 bg-empire-gold/10 text-empire-gold shadow-[0_12px_34px_rgba(201,162,51,0.12)]">
        <EmpireIcon name={name} size={22} />
      </div>
      <p className="text-sm font-medium text-empire-text">{title}</p>
      {hint && <p className="text-xs text-empire-text-muted mt-1 max-w-xs leading-relaxed">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
