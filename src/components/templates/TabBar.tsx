'use client'
import React from 'react'
import { cn } from '@/components/atoms/cn'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'

export function TabBar({ tabs, active, onChange, accent = '#c9a233' }: {
  // `icon` is optional per tab — additive, existing call sites work unchanged.
  tabs: { id: string; label: string; icon?: IconName }[]; active: string
  onChange: (id: string) => void; accent?: string
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-empire-border mb-6">
      {tabs.map((t) => {
        const on = t.id === active
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors relative -mb-px',
              on ? 'text-empire-text' : 'text-empire-text-muted hover:text-empire-text'
            )}>
            {t.icon && (
              <EmpireIcon name={t.icon} size={14}
                className={on ? 'text-empire-gold' : 'text-empire-text-dim'} />
            )}
            {t.label}
            {on && <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full" style={{ background: accent }} />}
          </button>
        )
      })}
    </div>
  )
}
