'use client'
import React from 'react'
import { cn } from '@/components/atoms/cn'

export function Grid({ cols = 4, children, className }: { cols?: number; children: React.ReactNode; className?: string }) {
  const map: Record<number, string> = {
    2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4', 5: 'sm:grid-cols-2 lg:grid-cols-5', 6: 'sm:grid-cols-3 lg:grid-cols-6',
  }
  return <div className={cn('grid grid-cols-1 gap-3', map[cols], className)}>{children}</div>
}
