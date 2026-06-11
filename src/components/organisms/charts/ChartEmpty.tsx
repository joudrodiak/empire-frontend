'use client'
import React from 'react'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'

/**
 * ChartEmpty (backlog C2) — centered placeholder rendered by every chart when
 * it has no data: subtle icon medallion + "No data available yet". Keeps the
 * chart's footprint (same height) so layouts don't jump when data arrives.
 */
export function ChartEmpty({ height = 200, icon = 'chart-line', message = 'No data available yet' }: {
  height?: number
  icon?: IconName
  message?: string
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-empire-border/60"
      style={{ height }}
      role="img"
      aria-label={message}
    >
      <span className="grid h-9 w-9 place-items-center rounded-full border border-empire-border bg-empire-elevated/50">
        <EmpireIcon name={icon} size={16} className="text-empire-text-dim" />
      </span>
      <span className="text-[11px] uppercase tracking-widest text-empire-text-muted">{message}</span>
      <span className="text-[10px] text-empire-text-dim">Data appears here as soon as it is recorded</span>
    </div>
  )
}
