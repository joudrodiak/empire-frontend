'use client'
import React, { useEffect, useState } from 'react'

/**
 * BarChart — dimensional gold bars (top highlight + inner shadow + cast base
 * glow) over faint gridlines, with a mount "rise" animation. Hover shows a
 * floating glass info blob with the value (and label/legend when provided).
 * Pure CSS/SVG, no chart library. Public props unchanged.
 */
export function BarChart({ data, height = 200, color = '#c9a233', labels, valueFormat, legend }: {
  data: number[]; height?: number; color?: string; labels?: string[]
  valueFormat?: (v: number) => string
  legend?: { label: string; color: string }[]
}) {
  const max = Math.max(...data, 1)
  const [hover, setHover] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const fmt = valueFormat ?? ((v: number) => String(v))

  useEffect(() => { const t = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(t) }, [])

  return (
    <div>
      <div className="relative flex items-end gap-1.5" style={{ height }}>
        {/* faint gridlines for depth */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {Array.from({ length: 5 }).map((_, i) => <span key={i} className="h-px w-full bg-empire-border/30" />)}
        </div>
        {data.map((d, i) => {
          const on = hover === i
          return (
            <div
              key={i}
              className="relative flex-1 cursor-default rounded-t-md"
              style={{
                height: mounted ? `${Math.max(2, (d / max) * 100)}%` : '2%',
                background: `linear-gradient(180deg, ${color}f2 0%, ${color}cc 42%, ${color}66 100%)`,
                boxShadow: on
                  ? `inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -10px 18px ${color}33, 0 0 0 1px ${color}, 0 6px 18px ${color}55`
                  : `inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -8px 14px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.3)`,
                transition: 'height 0.7s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s ease, filter 0.2s ease',
                transitionDelay: `${i * 35}ms`,
                filter: on ? 'brightness(1.08)' : 'none',
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {/* glossy top cap */}
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/3 rounded-t-md" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0))' }} />
              {on && (
                <div
                  className="chart-tip left-1/2 top-0"
                  style={{ transform: d / max > 0.72 ? 'translate(-50%, 10px)' : 'translate(-50%, -118%)' }}
                >
                  <div className="glass-gold rounded-lg px-2.5 py-1.5 text-center shadow-lg">
                    <div className="font-data text-sm font-semibold tabular-nums text-empire-text">{fmt(d)}</div>
                    {labels?.[i] && <div className="text-[10px] uppercase tracking-widest text-empire-text-muted">{labels[i]}</div>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {labels && (
        <div className="mt-1.5 flex gap-1.5 text-[10px] text-empire-text-muted">
          {labels.map((l, i) => <span key={i} className="flex-1 truncate text-center">{l}</span>)}
        </div>
      )}
      {legend && legend.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {legend.map((g, i) => (
            <span key={i} className="flex items-center gap-1.5 text-[10px] text-empire-text-muted">
              <span className="h-2 w-2 rounded-sm" style={{ background: g.color }} />{g.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
