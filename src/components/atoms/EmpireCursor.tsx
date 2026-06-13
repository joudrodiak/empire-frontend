'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * EmpireCursor (backlog A4) — a custom obsidian-gold cursor for fine-pointer
 * devices. A trailing gold ring + a precise centre dot. Over anything clickable
 * (button / link / role=button / select / input / .cursor-pointer / [data-clickable])
 * the ring tightens and fills (the "active / clickable" affordance); elsewhere it
 * stays open (the default). No-ops on touch devices and when the user prefers
 * reduced motion, so the native cursor is never hidden where this would hurt.
 */
const CLICKABLE = 'a,button,[role="button"],select,input[type="checkbox"],input[type="radio"],label[for],summary,.cursor-pointer,[data-clickable]'

export function EmpireCursor() {
  const [enabled, setEnabled] = useState(false)
  const ringRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: -100, y: -100 })
  const ring = useRef({ x: -100, y: -100 })
  const raf = useRef<number | undefined>(undefined)

  useEffect(() => {
    // Only on devices with a precise pointer that don't prefer reduced motion.
    const fine = window.matchMedia('(pointer: fine)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduce) return
    setEnabled(true)
    document.documentElement.classList.add('empire-cursor-on')

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY }
      const dot = dotRef.current
      if (dot) { dot.style.left = `${e.clientX}px`; dot.style.top = `${e.clientY}px` }
      const target = e.target as Element | null
      const clickable = !!target?.closest?.(CLICKABLE)
      ringRef.current?.classList.toggle('is-active', clickable)
    }
    const onDown = () => ringRef.current?.classList.add('is-press')
    const onUp = () => ringRef.current?.classList.remove('is-press')
    const onLeave = () => { if (ringRef.current) ringRef.current.style.opacity = '0'; if (dotRef.current) dotRef.current.style.opacity = '0' }
    const onEnter = () => { if (ringRef.current) ringRef.current.style.opacity = '1'; if (dotRef.current) dotRef.current.style.opacity = '1' }

    // Ring eases toward the pointer for a subtle trailing feel.
    const tick = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.2
      ring.current.y += (pos.current.y - ring.current.y) * 0.2
      const r = ringRef.current
      if (r) { r.style.left = `${ring.current.x}px`; r.style.top = `${ring.current.y}px` }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)
    return () => {
      document.documentElement.classList.remove('empire-cursor-on')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [])

  if (!enabled) return null
  return (
    <>
      <div ref={ringRef} aria-hidden className="empire-cursor-ring" />
      <div ref={dotRef} aria-hidden className="empire-cursor-dot" />
    </>
  )
}
