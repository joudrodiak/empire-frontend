'use client'
import React from 'react'
import { LiquidMetalFrame, type MetalConfig } from '@/components/atoms/LiquidMetalFrame'

/**
 * LiquidMetalButton — a glass-bodied CTA wrapped in a molten liquid-metal BORDER.
 * Thin wrapper over the shared `LiquidMetalFrame` (the real paper.design WebGL
 * shader rim); this just adds the centered icon+label layout and size scale. The
 * prop shape mirrors the reference component (icon / size / borderWidth /
 * metalConfig) so call sites are drop-in. Empire palette (gold / steel).
 *
 * NOTE (bucket list): the user wants the lib swapped for a self-owned shader
 * later — see memory `bucket-liquid-metal-own-impl`.
 */
export type { MetalConfig }

const SIZES = {
  sm: 'text-[11px] px-3 py-1.5 gap-1.5',
  md: 'text-xs px-4 py-2 gap-2',
  lg: 'text-sm px-6 py-3 gap-2.5',
} as const

export function LiquidMetalButton({
  children,
  icon,
  size = 'md',
  borderWidth = 4,
  variant = 'gold',
  className = '',
  metalConfig = {},
  ...rest
}: {
  children: React.ReactNode
  icon?: React.ReactNode
  size?: keyof typeof SIZES
  borderWidth?: number
  variant?: 'gold' | 'steel'
  className?: string
  metalConfig?: MetalConfig
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <LiquidMetalFrame
      {...rest}
      variant={variant}
      borderWidth={borderWidth}
      radius={12}
      metalConfig={metalConfig}
      className={`font-semibold uppercase tracking-widest text-empire-text transition-transform hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 ${className}`}
      innerClassName={`items-center justify-center ${SIZES[size]}`}
    >
      {icon && <span className="grid place-items-center">{icon}</span>}
      <span>{children}</span>
    </LiquidMetalFrame>
  )
}
