'use client'
import React, { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/components/atoms/cn'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'

export function TabBar({ tabs, active, onChange, accent = '#c9a233' }: {
  // `icon` is optional per tab — additive, existing call sites work unchanged.
  tabs: { id: string; label: string; icon?: IconName }[]; active: string
  onChange: (id: string) => void; accent?: string
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const activeBtn = btnRefs.current[active]
    if (!wrap || !activeBtn) return
    const wrapBox = wrap.getBoundingClientRect()
    const btnBox = activeBtn.getBoundingClientRect()
    setIndicator({ left: btnBox.left - wrapBox.left + wrap.scrollLeft, width: btnBox.width })
  }, [active, tabs])

  return (
    <div ref={wrapRef} className="relative mb-6 flex flex-wrap gap-1 border-b border-empire-border">
      <span
        aria-hidden
        className="absolute -bottom-px h-0.5 rounded-full bg-empire-gold transition-[left,width] duration-300 ease-out"
        style={{ left: indicator.left, width: indicator.width || 0 }}
      />
      {tabs.map((t) => {
        const on = t.id === active
        return (
          <button key={t.id} ref={node => { btnRefs.current[t.id] = node }} onClick={() => onChange(t.id)}
            className={cn(
              'no-lift relative -mb-px flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-55',
              on ? 'text-empire-text' : 'text-empire-text-muted hover:text-empire-text'
            )}>
            {t.icon && (
              <EmpireIcon name={t.icon} size={14}
                className={on ? 'text-empire-gold' : 'text-empire-text-dim'} />
            )}
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
