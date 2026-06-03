'use client'
import React from 'react'
import { LiquidMetal } from '@paper-design/shaders-react'

/**
 * LiquidMetalButton — a glass-bodied CTA wrapped in a molten liquid-metal
 * BORDER. The paper.design `LiquidMetal` WebGL shader renders only in the rim
 * (the button is padded by `borderWidth`, the shader fills the frame, and a
 * `.glass` inner panel masks the centre so metal shows just as the border).
 * The prop shape mirrors the reference component (icon / size / borderWidth /
 * metalConfig) so call sites are drop-in. Empire palette (gold / steel).
 *
 * NOTE (bucket list): the user wants this lib swapped for a self-owned
 * implementation later — see memory `bucket-liquid-metal-own-impl`.
 */
export type MetalConfig = {
  colorBack?: string
  colorTint?: string
  distortion?: number
  speed?: number
  repetition?: number
  softness?: number
  contour?: number
  shiftRed?: number
  shiftBlue?: number
}

const SIZES = {
  sm: 'text-[11px] px-3 py-1.5 gap-1.5',
  md: 'text-xs px-4 py-2 gap-2',
  lg: 'text-sm px-6 py-3 gap-2.5',
} as const

// Metal tint per variant — this is the BORDER colour now, not the body.
const VARIANTS: Record<'gold' | 'steel', { colorBack: string; colorTint: string }> = {
  gold:  { colorBack: '#2a1e07', colorTint: '#f4e39b' },
  steel: { colorBack: '#0c0c12', colorTint: '#dfe3ee' },
}

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
  const v = VARIANTS[variant]
  // Gate the shader to client mount to avoid SSR/hydration canvas mismatch.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const cfg = {
    colorBack: v.colorBack,
    colorTint: v.colorTint,
    repetition: 4,
    softness: 0.3,
    shiftRed: 0.3,
    shiftBlue: 0.3,
    distortion: 0.15,
    contour: 1,
    speed: 0.4,
    ...metalConfig,
  }

  return (
    <button
      {...rest}
      className={`group relative isolate inline-flex items-center justify-center overflow-hidden rounded-xl font-semibold uppercase tracking-widest text-empire-text transition-transform active:scale-[0.98] ${className}`}
      style={{ padding: borderWidth, boxShadow: '0 6px 18px rgba(0,0,0,0.4)' }}
    >
      {/* Liquid-metal BORDER — fills the frame; the glass body masks the centre. */}
      {mounted ? (
        <LiquidMetal
          className="absolute inset-0 -z-10 h-full w-full"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          colorBack={cfg.colorBack}
          colorTint={cfg.colorTint}
          repetition={cfg.repetition}
          softness={cfg.softness}
          shiftRed={cfg.shiftRed}
          shiftBlue={cfg.shiftBlue}
          distortion={cfg.distortion}
          contour={cfg.contour}
          speed={cfg.speed}
        />
      ) : (
        <span
          className="absolute inset-0 -z-10"
          style={{ background: `linear-gradient(100deg, ${cfg.colorBack}, ${cfg.colorTint} 50%, ${cfg.colorBack})` }}
          aria-hidden
        />
      )}
      {/* Glass BODY — the actual button background; metal only shows as the rim. */}
      <span
        className={`glass relative z-0 inline-flex w-full items-center justify-center rounded-[9px] ${SIZES[size]}`}
        style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.18)' }}
      >
        {icon && <span className="grid place-items-center">{icon}</span>}
        <span>{children}</span>
      </span>
    </button>
  )
}
