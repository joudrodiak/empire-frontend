'use client'
import React from 'react'
import { currencySymbol } from '@/lib/currency'

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Fixed text rendered inside the field, before the value (e.g. "€", "@"). */
  prefix?: string
  /** Fixed text rendered inside the field, after the value (e.g. "%"). */
  suffix?: string
  /** Shorthand: prefix with the system currency symbol (Settings → Currency). */
  money?: boolean
  /** Shorthand: suffix with "%". */
  pct?: boolean
}

/**
 * AffixInput (backlog A14) — an input with a symbol fixed inside the field:
 * "%" for percentages, the system currency symbol for money amounts, "@" for
 * social handles. The affix is absolutely positioned and the input only gains
 * padding, so each call site's own input classes keep working unchanged.
 */
export function AffixInput({ prefix, suffix, money, pct, className, ...props }: Props) {
  const pre = prefix ?? (money ? currencySymbol() : undefined)
  const suf = suffix ?? (pct ? '%' : undefined)
  return (
    <span className="relative block min-w-0 flex-1">
      {pre && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-xs text-empire-text-dim">
          {pre}
        </span>
      )}
      <input
        {...props}
        className={`${className ?? ''} ${pre ? 'pl-7' : ''} ${suf ? 'pr-7 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none' : ''} w-full`}
      />
      {suf && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 z-[1] -translate-y-1/2 text-xs text-empire-text-dim">
          {suf}
        </span>
      )}
    </span>
  )
}
