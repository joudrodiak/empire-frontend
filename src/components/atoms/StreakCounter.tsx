'use client'
import React from 'react'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'

export function StreakCounter({ days, accent = '#c9a233' }: { days: number; accent?: string }) {
  return (
    <div className="group flex items-center gap-1.5 rounded-lg border bg-empire-elevated/70 px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5"
      style={{ borderColor: `${accent}3d`, boxShadow: `0 10px 24px ${accent}12, inset 0 1px 0 rgba(255,255,255,0.07)` }} title={`${days}-day streak`}>
      <EmpireIcon name="flame" size={14} style={{ color: accent }} />
      <span className="font-data text-sm font-bold tabular-nums" style={{ color: accent }}>{days}</span>
      <span className="text-[11px] text-empire-text-muted">day streak</span>
    </div>
  )
}
