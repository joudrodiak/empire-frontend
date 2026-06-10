'use client'
import { useEffect, useState } from 'react'
import { fetcher } from '@/lib/api'

// Cross-department ticket linking: every place that references a unit ticket
// (studio pipeline/reviews, client-success support, …) picks from the live
// ticket list instead of typing a key by hand — no typos, no 404s.

type TicketOpt = { id: string; key: string; title: string; status: string }

export function TicketSelect({ value, onChange, departmentSlug, className, placeholder = 'No linked ticket' }: {
  value: string
  onChange: (key: string) => void
  departmentSlug?: string
  className?: string
  placeholder?: string
}) {
  const [tickets, setTickets] = useState<TicketOpt[]>([])
  useEffect(() => {
    const qs = new URLSearchParams({ pageSize: '100' })
    if (departmentSlug) qs.set('departmentSlug', departmentSlug)
    fetcher(`/api/tickets?${qs.toString()}`)
      .then((r: any) => setTickets(Array.isArray(r?.data) ? r.data : []))
      .catch(() => setTickets([]))
  }, [departmentSlug])
  return (
    <select className={className} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {tickets.map(t => (
        <option key={t.id} value={t.key}>{t.key} — {t.title.length > 42 ? `${t.title.slice(0, 42)}…` : t.title}</option>
      ))}
    </select>
  )
}
