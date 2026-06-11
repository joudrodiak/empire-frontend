'use client'
import React from 'react'

function path(data: number[], w: number, h: number, pad = 2) {
  const min = Math.min(...data), max = Math.max(...data)
  const rng = max - min || 1
  const step = w / (data.length - 1 || 1)
  return data.map((d, i) => {
    const x = i * step
    const y = pad + (h - pad * 2) * (1 - (d - min) / rng)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
}

export function Sparkline({ data, color = '#c9a233', height = 28 }: { data: number[]; color?: string; height?: number }) {
  const W = 100, id = React.useId()
  // No data yet (backlog C2): render a dim dashed baseline instead of a broken path.
  if (data.length === 0) {
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img" aria-label="No trend data yet">
        <line x1="0" y1={height / 2} x2={W} y2={height / 2} stroke={color} strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      </svg>
    )
  }
  const d = path(data, W, height)
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img" aria-label="Trend sparkline">
      <defs><filter id={`${id}-glow`} x="-20%" y="-80%" width="140%" height="220%">
        <feGaussianBlur stdDeviation="1.4" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter></defs>
      {/* Flat translucent fill — linear gradients are banned platform-wide. */}
      <path d={`${d} L${W},${height} L0,${height} Z`} fill={color} fillOpacity="0.14" />
      <path d={d} fill="none" stroke={color} strokeOpacity="0.34" strokeWidth="4" vectorEffect="non-scaling-stroke" filter={`url(#${id}-glow)`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
