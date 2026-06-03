'use client'
import React from 'react'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'

// Reusable pager for tables/lists. Controlled: parent owns `page`.
export function Pagination({ page, pageCount, total, onPage, accent = '#c9a233' }: {
  page: number; pageCount: number; total: number; onPage: (p: number) => void; accent?: string
}) {
  if (pageCount <= 1) return null
  const go = (p: number) => onPage(Math.max(0, Math.min(pageCount - 1, p)))
  return (
    <div className="flex items-center justify-between pt-3 mt-1 text-xs text-empire-text-muted">
      <span className="tabular-nums">{total} total</span>
      <div className="flex items-center gap-1">
        <button onClick={() => go(page - 1)} disabled={page === 0} aria-label="Previous page"
          className="grid place-items-center w-7 h-7 rounded-md border border-empire-border disabled:opacity-40 hover:border-empire-gold/40 hover:text-empire-text transition-colors">
          <EmpireIcon name="chevron-right" size={14} className="rotate-180" />
        </button>
        <span className="px-2 tabular-nums font-data" style={{ color: accent }}>{page + 1} / {pageCount}</span>
        <button onClick={() => go(page + 1)} disabled={page >= pageCount - 1} aria-label="Next page"
          className="grid place-items-center w-7 h-7 rounded-md border border-empire-border disabled:opacity-40 hover:border-empire-gold/40 hover:text-empire-text transition-colors">
          <EmpireIcon name="chevron-right" size={14} />
        </button>
      </div>
    </div>
  )
}
