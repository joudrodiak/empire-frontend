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
  const d = path(data, W, height)
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.35" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <path d={`${d} L${W},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
