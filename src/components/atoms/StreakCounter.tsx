'use client'
import React from 'react'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'

export function StreakCounter({ days, accent = '#c9a233' }: { days: number; accent?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-empire-elevated/60"
      style={{ borderColor: `${accent}33` }} title={`${days}-day streak`}>
      <EmpireIcon name="flame" size={14} style={{ color: accent }} />
      <span className="font-data text-sm font-bold tabular-nums" style={{ color: accent }}>{days}</span>
      <span className="text-[11px] text-empire-text-muted">day streak</span>
    </div>
  )
}
