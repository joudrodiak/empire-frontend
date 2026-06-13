'use client'
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** Small (?) affordance with a hover/focus tooltip. The bubble is rendered in a
 *  portal at <body> level and positioned from the trigger's bounding rect, so it
 *  can never be clipped by a card's `overflow`/stacking context (backlog A5 — the
 *  old pure-CSS absolute bubble appeared *inside* the KPI boxes). */
export function InfoTip({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const show = () => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    // Anchor above the trigger, horizontally centred; clamp to viewport so the
    // bubble never spills off-screen on edge cards.
    const width = 208 // matches w-52
    let left = r.left + r.width / 2
    left = Math.min(window.innerWidth - width / 2 - 8, Math.max(width / 2 + 8, left))
    setPos({ top: r.top, left })
    setOpen(true)
  }
  const hide = () => setOpen(false)

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <button
        ref={ref}
        type="button"
        tabIndex={0}
        aria-label={text}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="grid h-3.5 w-3.5 cursor-help place-items-center rounded-full border border-empire-border text-[9px] font-semibold leading-none text-empire-text-dim transition-colors duration-200 hover:border-empire-gold/50 hover:text-empire-gold focus:border-empire-gold/50 focus:text-empire-gold focus:outline-none"
      >
        ?
      </button>
      {mounted && open && pos && createPortal(
        <span
          role="tooltip"
          style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translate(-50%, -100%) translateY(-6px)' }}
          className="pointer-events-none z-[200] w-52 rounded-md border border-empire-border bg-empire-surface px-2.5 py-1.5 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-empire-text shadow-empire-card animate-fade-in"
        >
          {text}
        </span>,
        document.body,
      )}
    </span>
  )
}
