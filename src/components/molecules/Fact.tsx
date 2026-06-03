'use client'
import React from 'react'

export function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-empire-border bg-empire-elevated/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-empire-text-muted">{label}</div>
      <div className="text-sm text-empire-text mt-0.5 truncate" title={value}>{value}</div>
    </div>
  )
}
