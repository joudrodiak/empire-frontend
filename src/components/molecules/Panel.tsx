'use client'
import React from 'react'
import { cn } from '@/components/atoms/cn'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'

export function Panel({ title, actions, children, className, pad = true, icon }: {
  title?: React.ReactNode; actions?: React.ReactNode
  children: React.ReactNode; className?: string; pad?: boolean
  // Optional leading EmpireIcon for the header — purely additive.
  icon?: IconName
}) {
  return (
    <div className={cn('glass overflow-hidden shadow-gold-border', className)}>
      {title && (
        <div className="relative flex items-center justify-between gap-3 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-empire-text min-w-0">
            {icon && <EmpireIcon name={icon} size={15} className="text-empire-gold/80 shrink-0" />}
            <span className="truncate tracking-[0.01em]">{title}</span>
          </h3>
          {actions}
          {/* gold hairline divider under the header */}
          <span className="pointer-events-none absolute left-0 right-0 bottom-0 h-px bg-empire-border/80" />
        </div>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </div>
  )
}
