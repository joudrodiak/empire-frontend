'use client'
import React from 'react'
import { LiquidMetal } from '@paper-design/shaders-react'

/**
 * LiquidMetalFrame — the shared liquid-metal BORDER primitive. Renders the
 * paper.design `LiquidMetal` WebGL shader in the rim only: the element is padded
 * by `borderWidth`, the shader fills the frame, and a `.glass` inner panel masks
 * the centre so metal shows purely as the border around arbitrary content.
 *
 * This is the single source of truth for the molten rim — both `LiquidMetalButton`
 * (centered CTA) and the company switcher trigger (left-aligned row) consume it,
 * so there is exactly one real shader implementation, never a CSS fake.
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

// Metal tint per variant — colorBack = molten base, colorTint = specular sweep.
export const METAL_VARIANTS: Record<'gold' | 'steel', { colorBack: string; colorTint: string }> = {
  gold:  { colorBack: '#6b4f12', colorTint: '#ffe9a3' }, // luminous molten gold
  steel: { colorBack: '#888888', colorTint: '#ffffff' }, // brushed chrome
}

type FrameProps = {
  children: React.ReactNode
  /** Rim thickness in px. */
  borderWidth?: number
  variant?: 'gold' | 'steel'
  /** Outer corner radius in px; inner glass body = radius − borderWidth. */
  radius?: number
  className?: string
  /** Layout classes for the inner glass body (e.g. items / gap / padding). */
  innerClassName?: string
  metalConfig?: MetalConfig
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export function LiquidMetalFrame({
  children,
  borderWidth = 4,
  variant = 'gold',
  radius = 12,
  className = '',
  innerClassName = '',
  metalConfig = {},
  ...rest
}: FrameProps) {
  const v = METAL_VARIANTS[variant]
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
      className={`group relative isolate inline-flex overflow-hidden ${className}`}
      style={{ padding: borderWidth, borderRadius: radius, boxShadow: '0 6px 18px rgba(0,0,0,0.4)' }}
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
          style={{ background: cfg.colorTint, boxShadow: `inset 0 0 0 1px ${cfg.colorBack}` }}
          aria-hidden
        />
      )}
      {/* Glass BODY — the real surface; metal shows only as the rim. */}
      <span
        className={`glass relative z-0 flex w-full ${innerClassName}`}
        style={{ borderRadius: Math.max(radius - borderWidth, 4), boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.18)' }}
      >
        {children}
      </span>
    </button>
  )
}
