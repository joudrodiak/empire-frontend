'use client'
import React from 'react'
import { cn } from '@/components/atoms/cn'

const TONE: Record<string, string> = {
  green: 'text-rag-green bg-rag-green/10 border-rag-green/30',
  amber: 'text-rag-amber bg-rag-amber/10 border-rag-amber/30',
  red: 'text-rag-red bg-rag-red/10 border-rag-red/30',
  gold: 'text-empire-gold bg-empire-gold/10 border-empire-gold/30',
  muted: 'text-empire-text-muted bg-empire-elevated border-empire-border',
}

export function Badge({ children, tone = 'muted' }: { children: React.ReactNode; tone?: keyof typeof TONE }) {
  return <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border', TONE[tone])}>{children}</span>
}

const RAG_DOT: Record<string, string> = {
  green: 'bg-rag-green', amber: 'bg-rag-amber', red: 'bg-rag-red', muted: 'bg-empire-text-muted',
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
    <span className="px-3 py-1 rounded-full text-xs border" style={{ color: accent, borderColor: `${accent}55`, background: `${accent}12` }}>
      {children}
    </span>
  )
}
