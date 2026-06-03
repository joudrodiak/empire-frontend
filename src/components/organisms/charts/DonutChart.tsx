'use client'
import React from 'react'

export function DonutChart({ segments, size = 160 }: {
  segments: { label: string; value: number; color: string }[]; size?: number
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = size / 2 - 12, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a24" strokeWidth="14" />
        {segments.map((s, i) => {
          const len = (s.value / total) * C
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="14"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="space-y-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="text-empire-text-muted">{s.label}</span>
            <span className="ml-auto font-semibold tabular-nums">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
