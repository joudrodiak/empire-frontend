'use client'
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { UnitMedallion } from '@/components/atoms/UnitMedallion'
import { MICROSERVICES } from '@/lib/microservices'
import { TERMS } from '@/lib/terms'
import { ThemeToggle } from '@/components/molecules/ThemeToggle'

/**
 * DockNav — the primary Empire OS menu, packaged in an edgeless frosted-glass
 * pill pinned to the bottom of the viewport (user spec). Holds Overview + a
 * Units launcher (popover grid of all units with 3D medallions). Rendered
 * globally from the root layout.
 */
type DockItem = { label: string; icon: IconName; href: string }

const MAIN: DockItem[] = [
  { label: 'Overview', icon: 'overview', href: '/' },
]

export function DockNav() {
  const pathname = usePathname() || '/'
  const [unitsOpen, setUnitsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setUnitsOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  useEffect(() => { setUnitsOpen(false) }, [pathname])

  const onUnit = pathname.startsWith('/departments')

  return (
    <div ref={ref} className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 print:hidden">
      <div className="relative">
        {/* Units launcher popover */}
        {unitsOpen && (
          <GlassPanel variant="gold" className="absolute bottom-[calc(100%+12px)] left-1/2 w-[min(92vw,560px)] -translate-x-1/2 origin-bottom animate-pop-in p-3">
            <p className="px-1 pb-2 text-[10px] uppercase tracking-widest text-empire-text-muted">{TERMS.units} · {TERMS.domains}</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {MICROSERVICES.map(ms => {
                const active = pathname === `/departments/${ms.slug}`
                return (
                  <Link
                    key={ms.slug}
                    href={`/departments/${ms.slug}`}
                    className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-all duration-200 hover:-translate-y-0.5 ${active ? 'border-empire-gold/50 bg-empire-gold/10' : 'border-empire-border/60 hover:border-empire-gold/40 hover:bg-empire-elevated/50'}`}
                  >
                    <UnitMedallion slug={ms.slug} size={30} />
                    <span className="truncate text-xs font-medium text-empire-text">{ms.name}</span>
                  </Link>
                )
              })}
            </div>
          </GlassPanel>
        )}

        <GlassPanel variant="edgeless" className="flex items-center gap-1 px-2 py-1.5">
          {MAIN.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${active ? 'bg-empire-gold/15 text-empire-gold' : 'text-empire-text-muted hover:bg-empire-elevated/60 hover:text-empire-text'}`}
              >
                <EmpireIcon name={item.icon} size={16} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}

          <button
            onClick={() => setUnitsOpen(o => !o)}
            className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${onUnit || unitsOpen ? 'bg-empire-gold/15 text-empire-gold' : 'text-empire-text-muted hover:bg-empire-elevated/60 hover:text-empire-text'}`}
          >
            <EmpireIcon name="shield" size={16} />
            <span className="hidden sm:inline">{TERMS.units}</span>
            <EmpireIcon name="chevron-down" size={12} className={`transition-transform ${unitsOpen ? '' : 'rotate-180'}`} />
          </button>

          <span className="mx-0.5 h-6 w-px bg-empire-border/60" aria-hidden />
          <ThemeToggle />
        </GlassPanel>
      </div>
    </div>
  )
}
