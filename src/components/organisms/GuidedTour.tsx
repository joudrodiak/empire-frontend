'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'

/**
 * GuidedTour — C3 · the "Start tutorial" guided overlay.
 *
 * Dims the screen, cuts a spotlight hole over the live target element, and
 * floats a bubble (title + description + Skip / Back / Next) beside it. The
 * caller drives WHAT is highlighted; this component owns the highlight, the
 * positioning, and the navigation. Steps may run a side-effect first
 * (`onBeforeStep`, e.g. switch a tab) so the target is mounted before we point
 * at it — the overlay polls for the selector for up to ~2s, then falls back to
 * a centred card so a tour never dead-ends on a missing anchor.
 *
 * Motion: the spotlight + bubble transition smoothly between steps, so a screen
 * recording of a run is presentation-ready (web CLAUDE.md "motion-video-ready").
 */
export type TourStep = {
  /** CSS selector for the element to highlight. Omit for a centred, anchorless step. */
  selector?: string
  title: string
  body: string
}

const PAD = 8

export function GuidedTour({ steps, title, onClose, onBeforeStep }: {
  steps: TourStep[]
  title: string
  onClose: () => void
  /** Run before a step renders (e.g. switch tabs). May be async. */
  onBeforeStep?: (index: number) => void | Promise<void>
}) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const last = steps.length - 1
  const step = steps[i]

  const measure = useCallback(() => {
    if (!step?.selector) { setRect(null); return false }
    const el = document.querySelector(step.selector) as HTMLElement | null
    if (!el) { setRect(null); return false }
    setRect(el.getBoundingClientRect())
    return true
  }, [step])

  // On each step: run the side-effect, then poll for the anchor (it may mount
  // after a tab switch) and scroll it into view before measuring.
  useEffect(() => {
    let cancelled = false
    let raf = 0
    const start = performance.now()
    ;(async () => {
      await onBeforeStep?.(i)
      const tick = () => {
        if (cancelled) return
        const el = step?.selector ? (document.querySelector(step.selector) as HTMLElement | null) : null
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' })
          // let the smooth scroll settle, then lock the rect
          setTimeout(() => { if (!cancelled) measure() }, 220)
          return
        }
        if (!step?.selector) { setRect(null); return }
        if (performance.now() - start < 2000) { raf = requestAnimationFrame(tick); return }
        setRect(null) // give up → centred fallback
      }
      tick()
    })()
    return () => { cancelled = true; cancelAnimationFrame(raf) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  // Keep the spotlight glued to the target while the page scrolls/resizes.
  useLayoutEffect(() => {
    const onMove = () => measure()
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => { window.removeEventListener('resize', onMove); window.removeEventListener('scroll', onMove, true) }
  }, [measure])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setI(v => Math.min(last, v + 1))
      else if (e.key === 'ArrowLeft') setI(v => Math.max(0, v - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last, onClose])

  if (!step) return null

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const hole = rect ? { x: rect.left - PAD, y: rect.top - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 } : null

  // Bubble placement: below the target if there's room, else above; centred when anchorless.
  const bubbleW = 320
  let bubbleStyle: React.CSSProperties
  if (hole) {
    const below = hole.y + hole.h + 320 < vh
    const top = below ? hole.y + hole.h + 14 : Math.max(14, hole.y - 14 - 200)
    const left = Math.min(Math.max(14, hole.x + hole.w / 2 - bubbleW / 2), vw - bubbleW - 14)
    bubbleStyle = { top, left, width: bubbleW }
  } else {
    bubbleStyle = { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: bubbleW }
  }

  return (
    <div className="fixed inset-0 z-[120]" aria-modal="true" role="dialog">
      {/* dim layer with a spotlight cutout */}
      <svg className="absolute inset-0 h-full w-full transition-opacity duration-300" width={vw} height={vh}>
        <defs>
          <mask id="empire-tour-mask">
            <rect x={0} y={0} width={vw} height={vh} fill="white" />
            {hole && <rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={12} fill="black" />}
          </mask>
        </defs>
        <rect x={0} y={0} width={vw} height={vh} fill="rgba(8,8,11,0.78)" mask="url(#empire-tour-mask)" onClick={onClose} />
      </svg>

      {/* spotlight ring */}
      {hole && (
        <div
          className="pointer-events-none absolute rounded-xl border-2 border-empire-gold/80 transition-all duration-300"
          style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h, boxShadow: '0 0 0 2px rgba(201,162,51,0.25), 0 0 28px 4px rgba(201,162,51,0.35)' }}
        />
      )}

      {/* bubble */}
      <div className="absolute rounded-xl border border-empire-gold/30 bg-empire-elevated/95 p-4 shadow-2xl backdrop-blur-sm transition-all duration-300" style={bubbleStyle}>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-empire-gold">{title} · {i + 1}/{steps.length}</span>
          <button onClick={onClose} className="text-empire-text-dim transition-colors hover:text-empire-text" title="End tutorial">
            <EmpireIcon name="close" size={14} />
          </button>
        </div>
        <h4 className="text-sm font-medium text-empire-text">{step.title}</h4>
        <p className="mt-1.5 text-xs leading-relaxed text-empire-text-muted">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={onClose} className="text-[10px] uppercase tracking-widest text-empire-text-dim transition-colors hover:text-empire-text">Skip tour</button>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button onClick={() => setI(v => Math.max(0, v - 1))} className="rounded-lg border border-empire-border px-3 py-1.5 text-[10px] uppercase tracking-widest text-empire-text-muted transition-colors hover:text-empire-text">Back</button>
            )}
            {i < last ? (
              <button onClick={() => setI(v => Math.min(last, v + 1))} className="empire-btn-primary text-[10px]">Next</button>
            ) : (
              <button onClick={onClose} className="empire-btn-primary text-[10px]">Done</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
