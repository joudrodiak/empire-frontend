'use client'
import React from 'react'

/**
 * RangeChips (backlog C1) — preset "last N points" filter chips rendered by
 * AreaChart/BarChart above the plot. Charts receive pre-aggregated series, so
 * range filtering slices the tail of the data client-side. Chips only appear
 * when the series is long enough for filtering to mean anything (> 4 points).
 */
export function RangeChips({ length, value, onChange }: {
  length: number
  value: number | null
  onChange: (v: number | null) => void
}) {
  const presets = [3, 6, 12].filter(p => p < length)
  if (length <= 4 || presets.length === 0) return null
  const cls = (active: boolean) =>
    `rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-widest transition-colors duration-200 ${
      active
        ? 'border-empire-gold/50 bg-empire-gold/10 text-empire-gold'
        : 'border-transparent text-empire-text-dim hover:text-empire-text'
    }`
  return (
    <div className="mb-1.5 flex items-center justify-end gap-1" role="group" aria-label="Chart range filter">
      {presets.map(p => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(value === p ? null : p)}
          aria-pressed={value === p}
          title={`Show last ${p} data points`}
          className={cls(value === p)}
        >
          {p}
        </button>
      ))}
      <button type="button" onClick={() => onChange(null)} aria-pressed={value === null} title="Show all data points" className={cls(value === null)}>
        All
      </button>
    </div>
  )
}
