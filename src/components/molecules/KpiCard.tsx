'use client'
import React from 'react'
import { cn } from '@/components/atoms/cn'
import { Sparkline } from '@/components/atoms/Sparkline'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'
import { InfoTip } from '@/components/atoms/InfoTip'
import { metricInfo } from '@/lib/metric-info'

export function KpiCard({ label, value, sub, delta, deltaGood = true, spark, accent = '#c9a233', icon, info }: {
  label: string; value: string; sub?: string
  delta?: string; deltaGood?: boolean; spark?: number[]; accent?: string
  // Optional leading EmpireIcon — purely additive; existing call sites omit it.
  icon?: IconName
  // Optional (?) hover explanation of what this metric means.
  info?: string
}) {
  // Explicit info wins; otherwise fall back to the central metric dictionary
  // so every known metric ships an explanation (backlog A17).
  const tip = info ?? metricInfo(label)
  // A7: replace bare direction words ("loss"/"gain"/"profit"/"up"/"down") with a
  // single coloured arrow; keep a quantified delta ("+12%") but lead it with the
  // matching arrow. Green ▲ when good, red ▼ when not.
  const directionWord = delta ? /^(loss|gain|profit|up|down|rise|drop|positive|negative)$/i.test(delta.trim()) : false
  const arrow = deltaGood ? '▲' : '▼'
  return (
    <div className="glass group relative flex min-h-[112px] flex-col rounded-lg p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-gold-glow">
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-empire-gold/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-empire-text-muted min-w-0">
          {icon && <EmpireIcon name={icon} size={13} className="text-empire-text-dim group-hover:text-empire-gold/70 transition-colors shrink-0" />}
          <span className="truncate tracking-[0.12em]">{label}</span>
          {tip && <InfoTip text={tip} />}
        </span>
        {delta && (
          <span className={cn('shrink-0 inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded',
            deltaGood ? 'text-rag-green bg-rag-green/10' : 'text-rag-red bg-rag-red/10')}>
            <span aria-hidden className="text-[10px] leading-none">{arrow}</span>
            {!directionWord && <span>{delta}</span>}
            <span className="sr-only">{deltaGood ? 'up' : 'down'}{directionWord ? '' : ` ${delta}`}</span>
          </span>
        )}
      </div>
      {/* Anchor the value at a fixed offset (mt-auto pins the block to the
          bottom) and always reserve the sub line so values stay aligned across
          a row whether or not a card has subtext (backlog A5). */}
      <div className="mt-auto pt-2">
        <div className="font-data text-2xl font-semibold tracking-tight tabular-nums text-empire-text leading-none drop-shadow-[0_0_12px_rgba(201,162,51,0.08)]">{value}</div>
        <div className="text-[11px] text-empire-text-muted mt-1.5 min-h-[14px]">{sub}</div>
      </div>
      {spark && <div className="mt-2 -mb-1"><Sparkline data={spark} color={accent} height={26} /></div>}
    </div>
  )
}
