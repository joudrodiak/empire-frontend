'use client'
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'

/**
 * Modal — frosted-glass dialog shell used by view/edit forms and confirms.
 * Closes on Escape and backdrop click. Empire-styled.
 *
 * Rendered through a portal into <body>. This is load-bearing: the `fixed`
 * overlay only anchors to the viewport if no ancestor establishes a containing
 * block. Several mount points (the sticky `backdrop-blur` header, the glass
 * dock) DO create one via backdrop-filter/transform, which would otherwise trap
 * the dialog inside that ancestor's box (the "create-company card" glitch).
 * Portaling to body sidesteps every such ancestor.
 */
export function Modal({ open, onClose, title, icon, children, width = 'max-w-lg' }: {
  open: boolean; onClose: () => void; title: string
  icon?: React.ReactNode; children: React.ReactNode; width?: string
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    // Lock body scroll while open so the dialog doesn't fight the page.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  if (!open || !mounted) return null
  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onMouseDown={onClose}
    >
      <div
        className={`glass-gold w-full max-h-[min(760px,calc(100vh-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden ${width} p-4 transition-all duration-240 sm:p-5 ${visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'}`}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="mb-4 flex min-w-0 items-center gap-2.5">
          {icon && <span className="text-empire-gold">{icon}</span>}
          <h3 className="min-w-0 truncate font-empire text-base tracking-wide text-empire-text">{title}</h3>
          <button onClick={onClose} className="ml-auto rounded-md p-1 text-empire-text-muted transition-all duration-200 hover:-translate-y-0.5 hover:bg-empire-elevated/60 hover:text-empire-text disabled:pointer-events-none disabled:opacity-55">
            <EmpireIcon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
