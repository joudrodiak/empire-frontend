'use client'
import React, { useEffect, useRef, useState } from 'react'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { useActiveCompany, COMPANIES } from '@/lib/profiles'

/**
 * EMPIRE OS wordmark + company switcher. Profiles are COMPANIES (Cregen Inc.
 * as a whole, Studio, Labs, Advisory) — each with its own identity and data
 * kept separate from the others. Switching changes the active company context
 * app-wide. Frosted-glass menu.
 */
export function ProfileSwitcher({ compact = false }: { compact?: boolean }) {
  const [active, select] = useActiveCompany()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div ref={ref} className="relative select-none">
      {!compact && (
        <div className="flex items-center gap-2 mb-1.5">
          <EmpireIcon name="crown" size={16} className="text-empire-gold" />
          <span className="font-empire text-sm tracking-[0.25em] text-empire-text uppercase">Empire OS</span>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="group flex items-center gap-2.5 rounded-xl border border-empire-border bg-empire-surface/70 px-3 py-2 text-left transition-colors hover:border-empire-gold/40"
      >
        <span className="medallion" style={{ width: 30, height: 30 }}>
          <EmpireIcon name={active.icon} size={15} className="relative z-10" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-empire-text">{active.name}</span>
          <span className="block truncate text-[10px] uppercase tracking-widest text-empire-text-muted">{active.type}</span>
        </span>
        <EmpireIcon name="chevron-down" size={14} className={`ml-1 text-empire-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <GlassPanel variant="gold" className="absolute left-0 z-50 mt-2 w-80 overflow-hidden p-1.5">
          <p className="px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-empire-text-muted">Switch company</p>
          {COMPANIES.map(c => {
            const on = c.id === active.id
            return (
              <button
                key={c.id}
                onClick={() => { select(c.id); setOpen(false) }}
                className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${on ? 'bg-empire-gold/15' : 'hover:bg-empire-elevated/60'}`}
              >
                <span className="medallion mt-0.5 shrink-0" style={{ width: 30, height: 30 }}>
                  <EmpireIcon name={c.icon} size={15} className="relative z-10" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-empire-text">{c.name}</span>
                    {on && <EmpireIcon name="check" size={14} className="shrink-0 text-empire-gold" />}
                  </span>
                  <span className="block truncate text-[10px] text-empire-text-muted">{c.tagline}</span>
                  <span className="mt-0.5 block truncate text-[10px] uppercase tracking-widest text-empire-text-muted/80">{c.type} · {c.hq}</span>
                </span>
              </button>
            )
          })}
        </GlassPanel>
      )}
    </div>
  )
}
