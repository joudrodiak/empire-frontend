'use client'
import React from 'react'
import { cn } from '@/components/atoms/cn'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'

export function SectionTitle({ children, className, icon }: { children: React.ReactNode; className?: string; icon?: IconName }) {
  return (
    <h2 className={cn('mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-empire-gold/85', className)}>
      {icon
        ? <span className="grid h-6 w-6 place-items-center rounded-lg border border-empire-gold/20 bg-empire-gold/10 text-empire-gold"><EmpireIcon name={icon} size={13} /></span>
        : <span aria-hidden className="inline-block h-px w-5 bg-empire-gold/70" />}
      <span className="min-w-0 truncate">{children}</span>
    </h2>
  )
}
