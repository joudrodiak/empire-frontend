'use client'
import React, { useEffect, useState } from 'react'
import { ChartEmpty } from './ChartEmpty'
import { RangeChips } from './RangeChips'

/**
 * AreaChart — smoothed (bezier) line with a soft luminous glow and a draw-in
 * animation over a layered fill. Hovering reveals a crosshair + glass
 * info blob with the value (and compare value when present) plus an optional
 * legend. Pure SVG, no chart library. Public props unchanged.
 */
export function AreaChart({
  series: fullSeries, height = 200, color = '#c9a233', labels: fullLabels, compare: fullCompare, compareColor = '#F4EFE3',
  valueFormat, seriesLabel = 'Value', compareLabel = 'Compare', filterable = true,
}: {
  series: number[]; height?: number; color?: string; labels?: string[]
  compare?: number[]; compareColor?: string
  valueFormat?: (v: number) => string
  seriesLabel?: string; compareLabel?: string
  /** Show the "last N points" range filter chips (backlog C1). */
  filterable?: boolean
}) {
  const W = 100, id = React.useId()
  // Range filter (backlog C1): slice the tail of the pre-aggregated series.
  const [range, setRange] = useState<number | null>(null)
  const n = range !== null && range < fullSeries.length ? range : null
  const series = n ? fullSeries.slice(-n) : fullSeries
  const labels = n && fullLabels ? fullLabels.slice(-n) : fullLabels
  const compare = n && fullCompare ? fullCompare.slice(-n) : fullCompare
  const allFull = fullCompare ? [...fullSeries, ...fullCompare] : fullSeries
  const empty = fullSeries.length === 0 || allFull.every(v => !v)
  const all = compare ? [...series, ...compare] : series
  const min = Math.min(...all), max = Math.max(...all), rng = max - min || 1
  const fmt = valueFormat ?? ((v: number) => String(Math.round(v * 100) / 100))
  const [hover, setHover] = useState<number | null>(null)
  const [drawn, setDrawn] = useState(false)

  useEffect(() => { const t = requestAnimationFrame(() => setDrawn(true)); return () => cancelAnimationFrame(t) }, [])

  const x = (i: number) => i * (W / (series.length - 1 || 1))
  const y = (v: number) => 8 + (height - 16) * (1 - (v - min) / rng)

  // Smooth the polyline with a Catmull-Rom → cubic-bezier conversion so the
  // curve reads premium instead of jagged.
  const smooth = (data: number[]) => {
    const pts = data.map((v, i) => [x(i), y(v)] as const)
    if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : ''
    let path = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6
      path += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
    }
    return path
  }
  const d = smooth(series)
  const ticks = 4

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    setHover(Math.max(0, Math.min(series.length - 1, Math.round(ratio * (series.length - 1)))))
  }

  if (empty) return <ChartEmpty height={height} icon="chart-line" />

  return (
    <div>
      {filterable && <RangeChips length={fullSeries.length} value={range} onChange={v => { setHover(null); setRange(v) }} />}
      <div className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="overflow-visible">
          <defs>
            <filter id={`${id}g`} x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {Array.from({ length: ticks + 1 }).map((_, i) => (
            <line key={i} x1="0" x2={W} y1={(height / ticks) * i} y2={(height / ticks) * i}
              stroke="#2a2a38" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          ))}
          {/* Flat translucent fill — linear gradients are banned platform-wide. */}
          <path d={`${d} L${W},${height} L0,${height} Z`} fill={color} fillOpacity="0.12"
            style={{ opacity: drawn ? 1 : 0, transition: 'opacity 0.8s ease 0.2s' }} />
          {compare && <path d={smooth(compare)} fill="none" stroke={compareColor} strokeWidth="1.5" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" opacity="0.85" />}
          <path d={d} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" vectorEffect="non-scaling-stroke"
            filter={`url(#${id}g)`} pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: drawn ? 0 : 1, transition: 'stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)' }} />
          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1="0" y2={height} stroke={color} strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {/* Hover dots live in HTML, not SVG: preserveAspectRatio="none" stretches
            the x-axis, so viewBox-unit <circle>s render as ovals. */}
        {hover !== null && (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${(x(hover) / W) * 100}%`,
                top: y(series[hover]),
                background: color,
                border: '1px solid #fff',
                boxShadow: `0 0 0 4px color-mix(in srgb, ${color} 25%, transparent)`,
              }}
            />
            {compare && (
              <span
                aria-hidden
                className="pointer-events-none absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${(x(hover) / W) * 100}%`,
                  top: y(compare[hover]),
                  background: compareColor,
                  border: '1px solid #fff',
                }}
              />
            )}
          </>
        )}
        {hover !== null && (
          <div
            className="chart-tip"
            style={{
              left: `${Math.max(7, Math.min(93, (x(hover) / W) * 100))}%`,
              top: y(series[hover]),
              transform: y(series[hover]) < height * 0.34 ? 'translate(-50%, 18px)' : 'translate(-50%, -120%)',
            }}
          >
            <div className="glass-gold rounded-lg px-2.5 py-1.5 shadow-lg">
              {labels?.[hover] && <div className="text-[10px] uppercase tracking-widest text-empire-text-muted">{labels[hover]}</div>}
              <div className="flex items-center gap-1.5 font-data text-xs tabular-nums text-empire-text">
                <span className="h-2 w-2 rounded-sm" style={{ background: color }} />{fmt(series[hover])}
              </div>
              {compare && (
                <div className="mt-0.5 flex items-center gap-1.5 font-data text-xs tabular-nums text-empire-text-muted">
                  <span className="h-2 w-2 rounded-sm" style={{ background: compareColor }} />{fmt(compare[hover])}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        {labels && (
          <div className="flex flex-1 justify-between text-[10px] text-empire-text-muted">
            {labels.map((l, i) => <span key={i}>{l}</span>)}
          </div>
        )}
      </div>
      {compare && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5 text-[10px] text-empire-text-muted"><span className="h-2 w-2 rounded-sm" style={{ background: color }} />{seriesLabel}</span>
          <span className="flex items-center gap-1.5 text-[10px] text-empire-text-muted"><span className="h-2 w-2 rounded-sm" style={{ background: compareColor }} />{compareLabel}</span>
        </div>
      )}
    </div>
  )
}
