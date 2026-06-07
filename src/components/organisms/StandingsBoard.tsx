'use client'

import { useEffect, useState } from 'react'
import { fetcher } from '@/lib/api'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'
import { rankIcon } from '@/lib/rank-icons'

// Podium tint for the top-3 trophy glyph: gold / silver / bronze.
const MEDAL_CLASS = ['text-empire-gold', 'text-[#b8b8c4]', 'text-[#a9743a]']

type Person = {
  rank: number
  employeeId: string
  name: string
  role: string
  deptSlug: string
  deptName: string
  deptIcon: string
  deptColor: string
  xp: number
  awards: number
  crossDeptXp: number
  level: number
  rankName: string
  rankIcon: string
}

type Dept = {
  deptSlug: string
  deptName: string
  deptIcon: string
  deptColor: string
  xp: number
  awards: number
}

type Board = {
  quarter: string
  totalXp: number
  totalAwards: number
  people: Person[]
  depts: Dept[]
}

type Award = {
  id: string
  at: string
  reason: string
  xp: number
  crossDept: boolean
  multiplier: number
}

export default function StandingsBoard() {
  const [quarters, setQuarters] = useState<string[]>([])
  const [quarter, setQuarter] = useState<string>('')
  const [board, setBoard] = useState<Board | null>(null)
  const [view, setView] = useState<'people' | 'departments'>('people')
  const [loading, setLoading] = useState(true)
  // Per-person award breakdown — fetched lazily when a row is expanded.
  const [openId, setOpenId] = useState<string | null>(null)
  const [awards, setAwards] = useState<Record<string, Award[] | 'loading'>>({})

  // Load the available quarters once; default to the newest.
  useEffect(() => {
    let alive = true
    fetcher('/api/standings/quarters')
      .then(d => {
        if (!alive) return
        const qs: string[] = d.quarters || []
        setQuarters(qs)
        setQuarter(qs[0] || '')
      })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  // Load the board whenever the selected quarter changes.
  useEffect(() => {
    if (!quarter) return
    let alive = true
    setLoading(true)
    fetcher(`/api/standings?quarter=${encodeURIComponent(quarter)}`)
      .then(d => { if (alive) setBoard(d) })
      .catch(() => { if (alive) setBoard(null) })
      .finally(() => { if (alive) setLoading(false) })
    // A new quarter invalidates the cached per-person award breakdowns.
    setOpenId(null)
    setAwards({})
    return () => { alive = false }
  }, [quarter])

  // Toggle a person's award breakdown, fetching it once and caching per quarter.
  function toggle(employeeId: string) {
    setOpenId(prev => (prev === employeeId ? null : employeeId))
    if (awards[employeeId]) return
    setAwards(prev => ({ ...prev, [employeeId]: 'loading' }))
    fetcher(`/api/standings/awards?employeeId=${encodeURIComponent(employeeId)}&quarter=${encodeURIComponent(quarter)}`)
      .then(d => setAwards(prev => ({ ...prev, [employeeId]: (d.awards || []) as Award[] })))
      .catch(() => setAwards(prev => ({ ...prev, [employeeId]: [] })))
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Controls: view toggle + quarter selector */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1">
          {(['people', 'departments'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs uppercase tracking-widest font-medium rounded border transition-colors ${
                view === v
                  ? 'border-empire-gold/40 bg-empire-gold/10 text-empire-gold'
                  : 'border-empire-border bg-empire-surface text-empire-text-muted hover:text-empire-text'
              }`}
            >
              {v === 'departments' ? 'Units' : 'People'}
            </button>
          ))}
        </div>
        <select
          value={quarter}
          onChange={e => setQuarter(e.target.value)}
          className="bg-empire-surface border border-empire-border rounded px-3 py-1.5 text-xs text-empire-text focus:outline-none focus:border-empire-gold/40 cursor-pointer"
        >
          {quarters.map(q => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-center py-12 text-empire-text-muted text-xs uppercase tracking-widest">
          Tallying the standings…
        </div>
      )}

      {!loading && board && view === 'people' && (
        board.people.length === 0 ? (
          <EmptyState />
        ) : (
          <ol className="space-y-1.5">
            {board.people.map((p, i) => {
              const open = openId === p.employeeId
              const rows = awards[p.employeeId]
              return (
                <li
                  key={p.employeeId}
                  className="rounded-lg border border-empire-border bg-empire-surface overflow-hidden transition-colors hover:border-empire-gold/30"
                >
                  <button
                    type="button"
                    onClick={() => toggle(p.employeeId)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <span className="w-7 grid place-items-center text-sm font-bold tabular-nums shrink-0">
                      {i < 3 ? <EmpireIcon name="trophy" size={16} className={MEDAL_CLASS[i]} /> : <span className="font-data text-empire-text-muted">{i + 1}</span>}
                    </span>
                    <span
                      className="w-8 h-8 rounded-lg grid place-items-center shrink-0 border"
                      style={{ borderColor: `${p.deptColor}55`, background: `${p.deptColor}12`, color: p.deptColor }}
                    >
                      <EmpireIcon name={deptIcon(p.deptSlug)} size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-empire-text truncate flex items-center gap-1.5">
                        {p.name}
                        {p.crossDeptXp > 0 && (
                          <span className="text-[11px] font-normal text-empire-text-dim tabular-nums">
                            · {p.crossDeptXp.toLocaleString()} cross-unit
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-empire-text-muted truncate">
                        <EmpireIcon name={deptIcon(p.deptSlug)} size={11} /> {p.deptName} · <EmpireIcon name={rankIcon(p.rankName)} size={11} /> {p.rankName} · Lv {p.level}
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: p.deptColor }}>
                      {p.xp.toLocaleString()} XP
                    </span>
                    <EmpireIcon name="chevron-down" size={14} className={`shrink-0 text-empire-text-dim transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>

                  {open && (
                    <div className="border-t border-empire-border bg-empire-void/40 px-3 py-2">
                      {rows === 'loading' || rows === undefined ? (
                        <div className="py-2 text-center text-[11px] uppercase tracking-widest text-empire-text-dim">Loading awards…</div>
                      ) : rows.length === 0 ? (
                        <div className="py-2 text-center text-[11px] text-empire-text-dim">No awards recorded this quarter.</div>
                      ) : (
                        <ul className="space-y-1">
                          {rows.map(a => (
                            <li key={a.id} className="flex items-center gap-2 py-1 text-xs">
                              <span className="flex-1 min-w-0 truncate text-empire-text-muted">{a.reason}</span>
                              {a.crossDept && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-empire-gold/15 text-empire-gold border border-empire-gold/30 shrink-0">
                                  2× cross-unit
                                </span>
                              )}
                              <span className="font-data tabular-nums text-empire-text shrink-0">+{a.xp.toLocaleString()}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )
      )}

      {!loading && board && view === 'departments' && (
        board.depts.length === 0 ? (
          <EmptyState />
        ) : (
          <ol className="space-y-1.5">
            {board.depts.map((d, i) => (
              <li
                key={d.deptSlug + i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-empire-border bg-empire-surface hover:border-empire-gold/30 transition-colors"
              >
                <span className="w-7 grid place-items-center text-sm font-bold tabular-nums shrink-0">
                  {i < 3 ? <EmpireIcon name="trophy" size={16} className={MEDAL_CLASS[i]} /> : <span className="font-data text-empire-text-muted">{i + 1}</span>}
                </span>
                <span
                  className="w-8 h-8 rounded-lg grid place-items-center shrink-0 border"
                  style={{ borderColor: `${d.deptColor}55`, background: `${d.deptColor}12`, color: d.deptColor }}
                >
                  <EmpireIcon name={deptIcon(d.deptSlug)} size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-empire-text truncate">{d.deptName}</div>
                  <div className="text-[11px] text-empire-text-muted">{d.awards} award{d.awards !== 1 ? 's' : ''}</div>
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: d.deptColor }}>
                  {d.xp.toLocaleString()} XP
                </span>
              </li>
            ))}
          </ol>
        )
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-empire-text-muted text-sm">
      No XP earned this quarter yet.
    </div>
  )
}
