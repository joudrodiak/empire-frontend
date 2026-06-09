'use client'
import React from 'react'

/**
 * GlassPanel — faded "liquid glass" surface (user spec), re-tinted for the
 * empire's dark gold palette so cream text stays readable. Use for floating
 * chrome and feature cards that should read as frosted glass, not flat cards.
 *
 * variant:
 *   - 'glass'      dark frost, subtle gold edge (default)
 *   - 'gold'       brighter gold-frost for emphasis chrome
 *   - 'edgeless'   pill, no hard edge — for the bottom dock
 */
export function GlassPanel({
  children,
  variant = 'glass',
  as: Tag = 'div',
  className = '',
  ...rest
}: {
  children: React.ReactNode
  variant?: 'glass' | 'gold' | 'edgeless'
  as?: React.ElementType
  className?: string
} & React.HTMLAttributes<HTMLElement>) {
  const cls = variant === 'gold' ? 'glass-gold' : variant === 'edgeless' ? 'glass-edgeless' : 'glass'
  return (
    <Tag className={`${cls} motion-safe:duration-200 ${className}`} {...rest}>
      {children}
    </Tag>
  )
}
