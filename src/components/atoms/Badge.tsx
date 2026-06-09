'use client'
import React from 'react'
import { cn } from '@/components/atoms/cn'

const TONE: Record<string, string> = {
  green: 'text-empire-gold bg-empire-gold/10 border-empire-gold/30',
  amber: 'text-empire-text bg-empire-elevated border-empire-gold/25',
  red: 'text-empire-ivory bg-empire-void border-empire-border',
  gold: 'text-empire-gold bg-empire-gold/10 border-empire-gold/30',
  muted: 'text-empire-text-muted bg-empire-elevated border-empire-border',
}

export function Badge({ children, tone = 'muted' }: { children: React.ReactNode; tone?: keyof typeof TONE }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm', TONE[tone])}>{children}</span>
}

const RAG_DOT: Record<string, string> = {
  green: 'bg-empire-gold',
  amber: 'bg-empire-ivory',
  red: 'bg-empire-ink',
  muted: 'bg-empire-text-muted',
}

export function RagBadge({ status }: { status: string }) {
  const s = (status || 'not measured').toLowerCase()
  const tone = s.startsWith('g') ? 'green' : s.startsWith('a') ? 'amber' : s.startsWith('r') ? 'red' : 'muted'
  return (
    <Badge tone={tone as any}>
      <span className={cn('w-1.5 h-1.5 rounded-full', RAG_DOT[tone])} />
      <span className="uppercase tracking-wider text-[10px]">{s}</span>
    </Badge>
  )
}

export function HeaderBadge({ children, accent = '#c9a233' }: { children: React.ReactNode; accent?: string }) {
  return (
    <span className="rounded-full border px-3 py-1 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm" style={{ color: accent, borderColor: `${accent}55`, background: `linear-gradient(135deg, ${accent}18, ${accent}08)` }}>
      {children}
    </span>
  )
}
