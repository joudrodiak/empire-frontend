'use client'
import React, { useEffect } from 'react'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'

/**
 * Modal — frosted-glass dialog shell used by view/edit forms and confirms.
 * Closes on Escape and backdrop click. Empire-styled.
 */
export function Modal({ open, onClose, title, icon, children, width = 'max-w-lg' }: {
  open: boolean; onClose: () => void; title: string
  icon?: React.ReactNode; children: React.ReactNode; width?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-[8vh] backdrop-blur-sm animate-fade-in" onMouseDown={onClose}>
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
    </div>
  )
}
