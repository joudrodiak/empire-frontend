'use client'
import React from 'react'
import Link from 'next/link'

export function PageShell({
  icon, title, subtitle, badge, accent = '#c9a233', children,
}: {
  icon: string; title: string; subtitle: string
  badge?: React.ReactNode; accent?: string; children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-empire-void text-empire-text">
      <header className="border-b border-empire-border bg-empire-surface/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-empire-text-muted hover:text-empire-gold text-sm transition-colors">← Empire</Link>
            <span className="text-empire-border">/</span>
            <span className="text-2xl" style={{ filter: 'saturate(1.1)' }}>{icon}</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">{title}</h1>
              <p className="text-[11px] text-empire-text-muted uppercase tracking-[0.18em] mt-1">{subtitle}</p>
            </div>
          </div>
          {badge}
        </div>
        <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${accent}55, transparent)` }} />
      </header>
      <main className="max-w-[1400px] mx-auto px-6 py-6">{children}</main>
    </div>
  )
}
