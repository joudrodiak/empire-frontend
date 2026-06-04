'use client'
import React, { useEffect, useState } from 'react'

/**
 * AreaChart — smoothed (bezier) line with a soft luminous glow and a draw-in
 * animation over a layered gradient fill. Hovering reveals a crosshair + glass
 * info blob with the value (and compare value when present) plus an optional
 * legend. Pure SVG, no chart library. Public props unchanged.
 */
export function AreaChart({
  series, height = 200, color = '#c9a233', labels, compare, compareColor = '#c94f4f',
  valueFormat, seriesLabel = 'Value', compareLabel = 'Compare',
}: {
  series: number[]; height?: number; color?: string; labels?: string[]
  compare?: number[]; compareColor?: string
  valueFormat?: (v: number) => string
  seriesLabel?: string; compareLabel?: string
}) {
  const W = 100, id = React.useId()
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

  return (
    <div>
      <div className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="overflow-visible">
          <defs>
            <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="55%" stopColor={color} stopOpacity="0.12" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
            <filter id={`${id}g`} x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {Array.from({ length: ticks + 1 }).map((_, i) => (
            <line key={i} x1="0" x2={W} y1={(height / ticks) * i} y2={(height / ticks) * i}
              stroke="#2a2a38" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={`${d} L${W},${height} L0,${height} Z`} fill={`url(#${id}f)`}
            style={{ opacity: drawn ? 1 : 0, transition: 'opacity 0.8s ease 0.2s' }} />
          {compare && <path d={smooth(compare)} fill="none" stroke={compareColor} strokeWidth="1.5" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" opacity="0.85" />}
          <path d={d} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" vectorEffect="non-scaling-stroke"
            filter={`url(#${id}g)`} pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: drawn ? 0 : 1, transition: 'stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)' }} />
          {hover !== null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1="0" y2={height} stroke={color} strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <circle cx={x(hover)} cy={y(series[hover])} r="4.5" fill={color} fillOpacity="0.25" vectorEffect="non-scaling-stroke" />
              <circle cx={x(hover)} cy={y(series[hover])} r="3" fill={color} stroke="#fff" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              {compare && <circle cx={x(hover)} cy={y(compare[hover])} r="3" fill={compareColor} stroke="#fff" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
            </>
          )}
        </svg>
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
