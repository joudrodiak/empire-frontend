'use client'
import React from 'react'
import { cn } from '@/components/atoms/cn'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'

export function SectionTitle({ children, className, icon }: { children: React.ReactNode; className?: string; icon?: IconName }) {
  return (
    <h2 className={cn('flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-empire-gold/80 mb-3', className)}>
      {icon
        ? <EmpireIcon name={icon} size={13} className="text-empire-gold/70" />
        : <span aria-hidden className="inline-block w-3 h-px bg-empire-gold/50" />}
      {children}
    </h2>
  )
}
