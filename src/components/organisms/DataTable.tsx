'use client'
import React from 'react'
import { cn } from '@/components/atoms/cn'

export type Column<T> = { key: string; label: string; align?: 'left' | 'right' | 'center'; render?: (row: T) => React.ReactNode }

export function DataTable<T extends Record<string, any>>({ columns, rows, empty = 'No records' }: {
  columns: Column<T>[]; rows: T[]; empty?: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-empire-border">
            {columns.map((c) => (
              <th key={c.key} className={cn('px-3 py-2.5 text-[11px] uppercase tracking-wider text-empire-text-muted font-medium',
                c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left')}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-empire-text-muted text-sm">{empty}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} className="border-b border-empire-border/40 hover:bg-empire-elevated/40 transition-colors">
              {columns.map((c) => (
                <td key={c.key} className={cn('px-3 py-2.5',
                  c.align === 'right' ? 'text-right tabular-nums' : c.align === 'center' ? 'text-center' : 'text-left')}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
