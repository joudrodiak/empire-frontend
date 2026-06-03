'use client'
import React from 'react'

export function ProgressBar({ value, max = 100, color = '#c9a233', label, right }: {
  value: number; max?: number; color?: string; label?: string; right?: string
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      {(label || right) && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-empire-text-muted">{label}</span>
          <span className="font-semibold tabular-nums">{right}</span>
        </div>
      )}
      <div className="h-2 rounded-full bg-empire-elevated overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
