'use client'
import React from 'react'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'

/**
 * UnitMedallion — the 3D treatment for a UNIT's glyph (per user request:
 * "make some of them 3D ... no need for them to be moving just look 3d, only
 * for the units"). The EmpireIcon line glyph sits on a layered gold coin
 * (radial light + beveled rim + cast shadow). Static — no animation.
 *
 * Pass either an explicit `name` (IconName) or a unit `slug` (resolved via
 * deptIcon). `tone="steel"` renders the neutral metal coin for inactive units.
 */
export function UnitMedallion({
  slug,
  name,
  size = 44,
  tone = 'gold',
  className = '',
}: {
  slug?: string
  name?: IconName
  size?: number
  tone?: 'gold' | 'steel'
  className?: string
}) {
  const glyph: IconName = name ?? (slug ? deptIcon(slug) : 'shield')
  const inner = Math.round(size * 0.5)
  return (
    <span
      className={`medallion ${tone === 'steel' ? 'medallion-steel' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="relative z-10" style={{ filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.4))' }}>
        <EmpireIcon name={glyph} size={inner} />
      </span>
    </span>
  )
}
