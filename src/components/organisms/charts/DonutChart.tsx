'use client'
import React, { useEffect, useState } from 'react'
import { ChartEmpty } from './ChartEmpty'

/**
 * DonutChart — dimensional ring with a soft inner shadow, glossy segment caps,
 * an animated sweep-in, a center total readout, and a hover state that lifts the
 * active segment and dims the rest. Pure SVG, no chart library. Original props
 * `{segments, size}` unchanged; the rest are optional/additive.
 */
export function DonutChart({
  segments, size = 160, thickness = 16, centerLabel, valueFormat, gap = 2,
}: {
  segments: { label: string; value: number; color: string }[]; size?: number
  thickness?: number; centerLabel?: string
  valueFormat?: (total: number) => string
  gap?: number
}) {
  const empty = segments.length === 0 || segments.every(s => !s.value)
  // Segment filter (backlog C1): clicking a legend row excludes/includes that
  // segment; arcs stay index-aligned by treating excluded values as 0.
  const [off, setOff] = useState<Set<number>>(new Set())
  const eff = segments.map((s, i) => (off.has(i) ? { ...s, value: 0 } : s))
  const total = eff.reduce((s, x) => s + x.value, 0) || 1
  const id = React.useId()
  const r = size / 2 - thickness / 2 - 2, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r
  const [drawn, setDrawn] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const fmt = valueFormat ?? ((t: number) => String(Math.round(t)))

  useEffect(() => { const t = requestAnimationFrame(() => setDrawn(true)); return () => cancelAnimationFrame(t) }, [])

  let offset = 0
  const arcs = eff.map((s, i) => {
    const frac = s.value / total
    const len = frac * C
    const seg = { ...s, i, frac, len, dash: offset }
    offset += len
    return seg
  })

  if (empty) return <ChartEmpty height={size} icon="chart-bar" />

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <defs>
            <filter id={`${id}sh`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#000" floodOpacity="0.45" />
            </filter>
          </defs>
          {/* track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgb(var(--e-elevated))" strokeWidth={thickness}
            style={{ filter: `url(#${id}sh)` }} />
          {arcs.map((s) => {
            const on = hover === s.i
            const dim = hover !== null && !on
            const visible = drawn ? s.len : 0
            return (
              <circle
                key={s.i}
                cx={cx} cy={cy} r={r} fill="none"
                stroke={s.color}
                strokeWidth={on ? thickness + 3 : thickness}
                strokeDasharray={`${Math.max(0, visible - gap)} ${C - Math.max(0, visible - gap)}`}
                strokeDashoffset={-s.dash}
                strokeLinecap="round"
                onMouseEnter={() => setHover(s.i)}
                onMouseLeave={() => setHover(null)}
                style={{
                  opacity: dim ? 0.32 : 1,
                  cursor: 'default',
                  transition: 'stroke-dasharray 0.9s cubic-bezier(0.22,1,0.36,1), stroke-width 0.2s ease, opacity 0.2s ease',
                  transitionDelay: `${s.i * 120}ms`,
                }}
              />
            )
          })}
        </svg>
        {/* center readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-empire text-2xl leading-none tabular-nums text-empire-text">
            {hover !== null ? `${Math.round(arcs[hover].frac * 100)}%` : fmt(total)}
          </span>
          <span className="mt-1 max-w-[80%] truncate text-[9px] uppercase tracking-widest text-empire-text-muted">
            {hover !== null ? segments[hover].label : centerLabel ?? 'Total'}
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        {segments.map((s, i) => {
          const isOff = off.has(i)
          return (
            <button
              key={i}
              type="button"
              aria-pressed={!isOff}
              title={isOff ? `Include ${s.label}` : `Exclude ${s.label}`}
              className="flex w-full cursor-pointer items-center gap-2 text-left text-xs transition-opacity"
              style={{ opacity: isOff ? 0.35 : hover !== null && hover !== i ? 0.4 : 1 }}
              onClick={() => setOff(prev => {
                const next = new Set(prev)
                if (next.has(i)) next.delete(i); else next.add(i)
                return next
              })}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color, boxShadow: isOff ? 'none' : `0 0 6px ${s.color}66` }} />
              <span className={`text-empire-text-muted ${isOff ? 'line-through' : ''}`}>{s.label}</span>
              <span className="ml-auto font-semibold tabular-nums text-empire-text">{Math.round((eff[i].value / total) * 100)}%</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
