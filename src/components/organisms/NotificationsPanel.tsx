'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { fetcher } from '@/lib/api'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'

/* Notifications surface — reads the DB-derived feed at /api/notifications.
 * Pass a departmentSlug to scope it to one unit (per-unit notifications);
 * omit it for the general/overview feed (which also carries Throne approvals).
 * Nothing here is synthetic — every item is computed from live records. */

type Severity = 'critical' | 'warning' | 'info'
type Notif = {
  id: string; type: string; severity: Severity; title: string; body: string
  unitSlug: string | null; unitName: string | null; href: string | null; at: string | null
}
type Feed = { counts: { total: number; critical: number; warning: number; info: number }; notifications: Notif[] }

const SEV_COLOR: Record<Severity, string> = { critical: '#F4EFE3', warning: '#C9A233', info: '#C9A233' }

export function NotificationsPanel({ departmentSlug, limit = 8, compact = false }: {
  departmentSlug?: string; limit?: number; compact?: boolean
}) {
  const [feed, setFeed] = useState<Feed | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetcher(`/api/notifications${departmentSlug ? `?departmentSlug=${departmentSlug}` : ''}`)
      .then(setFeed).catch(() => setFeed(null)).finally(() => setLoading(false))
  }, [departmentSlug])
  useEffect(() => { load() }, [load])

  const items = feed?.notifications || []
  const shown = items.slice(0, limit)

  return (
    <div className="rounded-xl border border-empire-border bg-empire-elevated/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <EmpireIcon name="alert" size={15} className="text-empire-gold" />
          <span className="font-empire text-empire-text text-sm tracking-wide">Notifications</span>
        </div>
        <div className="flex items-center gap-1.5">
          {feed && feed.counts.critical > 0 && <Badge n={feed.counts.critical} color={SEV_COLOR.critical} />}
          {feed && feed.counts.warning > 0 && <Badge n={feed.counts.warning} color={SEV_COLOR.warning} />}
          {feed && feed.counts.info > 0 && <Badge n={feed.counts.info} color={SEV_COLOR.info} />}
          <button onClick={load} title="Refresh" className="text-empire-text-dim hover:text-empire-text transition-colors ml-1">
            <EmpireIcon name="cog" size={13} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-empire-text-dim text-xs animate-pulse">Scanning the empire…</div>
      ) : shown.length === 0 ? (
        <div className="flex items-center gap-2 text-empire-text-muted text-xs py-6 justify-center">
          <EmpireIcon name="check" size={14} /> All clear — nothing needs attention.
        </div>
      ) : (
        <div className="space-y-1.5">
          {shown.map(n => {
            const color = SEV_COLOR[n.severity]
            const row = (
              <div className="flex items-start gap-2.5 rounded-md px-2 py-2 hover:bg-empire-elevated/50 transition-colors">
                <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-empire-text text-[13px] font-medium truncate">{n.title}</span>
                    {!departmentSlug && n.unitName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-empire-border text-empire-text-dim flex-shrink-0">{n.unitName}</span>
                    )}
                  </div>
                  {!compact && <p className="text-empire-text-muted text-[11px] leading-snug mt-0.5">{n.body}</p>}
                </div>
              </div>
            )
            return n.href ? <Link key={n.id} href={n.href}>{row}</Link> : <div key={n.id}>{row}</div>
          })}
          {items.length > shown.length && (
            <div className="text-center text-[11px] text-empire-text-dim pt-1">+{items.length - shown.length} more</div>
          )}
        </div>
      )}
    </div>
  )
}

function Badge({ n, color }: { n: number; color: string }) {
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
          style={{ color, background: `${color}1f`, border: `1px solid ${color}55` }}>{n}</span>
  )
}
