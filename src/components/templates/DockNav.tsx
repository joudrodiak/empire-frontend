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
import { useAuth, isAdmin } from '@/lib/auth'

/**
 * DockNav — the primary Empire OS menu, packaged in an edgeless frosted-glass
 * pill pinned to the bottom of the viewport (user spec). Holds Overview + a
 * Units launcher (popover grid of all units with 3D medallions). Rendered
 * globally from the root layout.
 */
type DockItem = { label: string; icon: IconName; href: string }

const MAIN: DockItem[] = [
  { label: 'Overview', icon: 'overview', href: '/' },
  { label: 'Approvals', icon: 'scales', href: '/approvals' },
  { label: 'Operator', icon: 'sparkle', href: '/agent' },
  { label: 'MCP', icon: 'link', href: '/mcp' },
  { label: 'Settings', icon: 'cog', href: '/settings' },
]

export function DockNav() {
  const pathname = usePathname() || '/'
  const [unitsOpen, setUnitsOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuth()

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setUnitsOpen(false); setUserOpen(false) } }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  useEffect(() => { setUnitsOpen(false); setUserOpen(false) }, [pathname])

  // The dock is app chrome — never show it on the login portal.
  if (pathname === '/login' || pathname.startsWith('/login/')) return null

  const onUnit = pathname.startsWith('/departments')
  const admin = isAdmin(user)
  const initials = (user?.name || user?.email || '?').trim().slice(0, 1).toUpperCase()

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

          {user && (
            <>
              <span className="mx-0.5 h-6 w-px bg-empire-border/60" aria-hidden />
              <button
                onClick={() => setUserOpen(o => !o)}
                title={user.name}
                className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-xs font-medium transition-colors ${userOpen ? 'bg-empire-gold/15 text-empire-gold' : 'text-empire-text-muted hover:bg-empire-elevated/60 hover:text-empire-text'}`}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-empire-gold/15 font-empire text-[11px] text-empire-gold">{initials}</span>
                <span className="hidden max-w-[8rem] truncate sm:inline">{user.name.split(' ')[0]}</span>
                <EmpireIcon name="chevron-down" size={12} className={`transition-transform ${userOpen ? 'rotate-180' : ''}`} />
              </button>
            </>
          )}
        </GlassPanel>

        {/* User menu popover (role/rank · admin · logout) */}
        {user && userOpen && (
          <GlassPanel variant="gold" className="absolute bottom-[calc(100%+12px)] right-0 w-64 origin-bottom animate-pop-in p-2">
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-empire-gold/15 font-empire text-sm text-empire-gold">{initials}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-empire-text">{user.name}</p>
                <p className="truncate text-[10px] text-empire-text-muted">{user.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 px-2 pb-2 pt-0.5">
              {user.role && (
                <span className="rounded-full border border-empire-gold/30 bg-empire-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-empire-gold">{user.role.name}</span>
              )}
              {user.rank && (
                <span className="rounded-full border border-empire-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-empire-text-muted">{user.rank.name}</span>
              )}
            </div>
            <div className="my-1 h-px bg-empire-border/60" aria-hidden />
            {admin && (
              <Link href="/admin" onClick={() => setUserOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-empire-text-muted transition-colors hover:bg-empire-elevated/60 hover:text-empire-text">
                <EmpireIcon name="cog" size={15} /> Admin &amp; IAM
              </Link>
            )}
            <button onClick={() => { setUserOpen(false); logout() }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-empire-text-muted transition-colors hover:bg-empire-red/10 hover:text-empire-red-bright">
              <EmpireIcon name="lock" size={15} /> Sign out
            </button>
          </GlassPanel>
        )}
      </div>
    </div>
  )
}
