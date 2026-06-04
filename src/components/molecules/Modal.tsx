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
  useEffect(() => { setMounted(true) }, [])

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
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-[8vh] backdrop-blur-sm animate-fade-in" onMouseDown={onClose}>
      <div className={`glass-gold w-full ${width} animate-slide-up p-5`} onMouseDown={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2.5">
          {icon && <span className="text-empire-gold">{icon}</span>}
          <h3 className="font-empire text-base tracking-wide text-empire-text">{title}</h3>
          <button onClick={onClose} className="ml-auto rounded-md p-1 text-empire-text-muted transition-colors hover:bg-empire-elevated/60 hover:text-empire-text">
            <EmpireIcon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
