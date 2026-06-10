'use client'
import React from 'react'

/** Small (?) affordance with a hover/focus tooltip. Pure CSS — no portal needed
 *  for short metric explanations. Place inline next to a label. */
export function InfoTip({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`group/info relative inline-flex shrink-0 ${className}`}>
      <button
        type="button"
        tabIndex={0}
        aria-label={text}
        className="grid h-3.5 w-3.5 cursor-help place-items-center rounded-full border border-empire-border text-[9px] font-semibold leading-none text-empire-text-dim transition-colors duration-200 hover:border-empire-gold/50 hover:text-empire-gold focus:border-empire-gold/50 focus:text-empire-gold focus:outline-none"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-[60] mb-1.5 w-52 -translate-x-1/2 translate-y-1 rounded-md border border-empire-border bg-empire-surface px-2.5 py-1.5 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-empire-text opacity-0 shadow-empire-card transition-all duration-200 group-hover/info:translate-y-0 group-hover/info:opacity-100 group-focus-within/info:translate-y-0 group-focus-within/info:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
