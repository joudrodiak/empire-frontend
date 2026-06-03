'use client'
import React, { useState } from 'react'

/**
 * BarChart — hover shows a floating info blob with the value (and label/legend
 * when provided), per user request. Pure CSS/SVG, no chart library.
 */
export function BarChart({ data, height = 200, color = '#c9a233', labels, valueFormat, legend }: {
  data: number[]; height?: number; color?: string; labels?: string[]
  valueFormat?: (v: number) => string
  legend?: { label: string; color: string }[]
}) {
  const max = Math.max(...data, 1)
  const [hover, setHover] = useState<number | null>(null)
  const fmt = valueFormat ?? ((v: number) => String(v))

  return (
    <div>
      <div className="relative flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => (
          <div
            key={i}
            className="relative flex-1 cursor-default rounded-t transition-all hover:opacity-90"
            style={{
              height: `${Math.max(2, (d / max) * 100)}%`,
              background: `linear-gradient(180deg, ${color}, ${color}55)`,
              outline: hover === i ? `1px solid ${color}` : 'none',
            }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            {hover === i && (
              // Flip the blob down into the bar when the bar is tall, so it
              // never overflows above the chart onto the panel title.
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
        ))}
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
