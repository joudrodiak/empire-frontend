'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { LiquidMetalButton } from '@/components/atoms/LiquidMetalButton'
import { useAuth } from '@/lib/auth'

type ReleaseManifest = {
  version: string
  appVersion: string
  title: string
  notes: string[]
  sha: string
  source?: string
  publishedAt?: string
}

const SEEN_PREFIX = 'empire-release-seen:'

export function ReleaseNotesModal() {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const [release, setRelease] = useState<ReleaseManifest | null>(null)
  const [open, setOpen] = useState(false)
  const isPublic = pathname === '/login' || pathname.startsWith('/login/') || pathname === '/authorize' || pathname.startsWith('/authorize/')

  useEffect(() => {
    if (loading || !user || isPublic) return
    let alive = true
    fetch('/release.json', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then((data: ReleaseManifest | null) => {
        if (!alive || !data?.version) return
        const key = `${SEEN_PREFIX}${data.version}:${data.sha || 'published'}`
        const seen = localStorage.getItem(key)
        setRelease(data)
        setOpen(!seen)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [isPublic, loading, user])

  if (!open || !release) return null

  const close = () => {
    localStorage.setItem(`${SEEN_PREFIX}${release.version}:${release.sha || 'published'}`, '1')
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-empire-void/70 px-4 backdrop-blur-xl" role="dialog" aria-modal="true" aria-labelledby="release-title">
      <GlassPanel variant="gold" className="relative w-full max-w-lg overflow-hidden rounded-xl p-0 shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-px bg-empire-gold/60" />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-empire-gold/35 bg-empire-gold/15 text-empire-gold shadow-gold-glow">
              <EmpireIcon name="sparkle" size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.22em] text-empire-text-muted">New release</p>
              <h2 id="release-title" className="mt-1 font-empire text-xl tracking-wide text-empire-gold">{release.title}</h2>
              <p className="mt-1 font-data text-[11px] text-empire-text-dim">
                App {release.appVersion} · {release.sha ? release.sha.slice(0, 7) : release.version}
              </p>
            </div>
            <button type="button" onClick={close} aria-label="Close release notes" className="grid h-8 w-8 place-items-center rounded-lg text-empire-text-muted transition-colors hover:bg-empire-elevated hover:text-empire-text">
              <EmpireIcon name="close" size={15} />
            </button>
          </div>

          <ol className="mt-5 space-y-3">
            {release.notes.map((note, index) => (
              <li key={`${note}-${index}`} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 text-sm leading-6 text-empire-text-muted">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-empire-gold/30 bg-empire-gold/10 font-data text-[11px] text-empire-gold">{index + 1}</span>
                <span>{note}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-empire-border pt-4">
            <span className="text-[10px] uppercase tracking-widest text-empire-text-dim">Shown once per release</span>
            <LiquidMetalButton size="sm" icon={<EmpireIcon name="check" size={13} />} onClick={close}>
              Continue
            </LiquidMetalButton>
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}
