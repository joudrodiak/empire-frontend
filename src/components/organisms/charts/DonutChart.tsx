'use client'
import React, { useEffect, useState } from 'react'

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
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const id = React.useId()
  const r = size / 2 - thickness / 2 - 2, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r
  const [drawn, setDrawn] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const fmt = valueFormat ?? ((t: number) => String(Math.round(t)))

  useEffect(() => { const t = requestAnimationFrame(() => setDrawn(true)); return () => cancelAnimationFrame(t) }, [])

  let offset = 0
  const arcs = segments.map((s, i) => {
    const frac = s.value / total
    const len = frac * C
    const seg = { ...s, i, frac, len, dash: offset }
    offset += len
    return seg
  })

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <defs>
            <filter id={`${id}sh`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#000" floodOpacity="0.45" />
            </filter>
            {arcs.map((s) => (
              <linearGradient key={s.i} id={`${id}g${s.i}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="1" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.72" />
              </linearGradient>
            ))}
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
                stroke={`url(#${id}g${s.i})`}
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
        {segments.map((s, i) => (
          <div
            key={i}
            className="flex cursor-default items-center gap-2 text-xs transition-opacity"
            style={{ opacity: hover !== null && hover !== i ? 0.4 : 1 }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}66` }} />
            <span className="text-empire-text-muted">{s.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-empire-text">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
