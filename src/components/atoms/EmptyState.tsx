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
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-xl grid place-items-center border border-empire-border bg-empire-elevated/40 text-empire-text-muted mb-3">
        <EmpireIcon name={name} size={22} />
      </div>
      <p className="text-sm font-medium text-empire-text">{title}</p>
      {hint && <p className="text-xs text-empire-text-muted mt-1 max-w-xs leading-relaxed">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
