'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { useI18n } from '@/lib/i18n'

/**
 * DatePicker (backlog A12, L1) — fully styled glass calendar replacing native
 * `<input type="date">`. Input-compatible API: `value` is an ISO yyyy-mm-dd
 * string and `onChange` receives `{ target: { value } }`, so call sites swap
 * the tag name and keep their handlers. The popup renders in a portal with
 * the platform glass recipe so modals never clip it.
 *
 * Clicking the header title drills up: day grid → month grid → year grid, so
 * any year/month is reachable in two clicks instead of stepping one month at
 * a time (L1 — "give me the ability to choose year/month").
 */
type Props = {
  value?: string
  onChange?: (e: { target: { value: string } }) => void
  className?: string
  disabled?: boolean
  placeholder?: string
  id?: string
  name?: string
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function parseISO(s?: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00`)
  return isNaN(d.getTime()) ? null : d
}

export function DatePicker({ value, onChange, className, disabled, placeholder, id, name }: Props) {
  const { t, tag } = useI18n()
  // Localized month/weekday names (B1) — generated from Intl so all five
  // languages get native labels. 2024-01-01 is a Monday (grid is Monday-first).
  const MONTHS = useMemo(() => Array.from({ length: 12 }, (_, m) => new Intl.DateTimeFormat(tag, { month: 'long' }).format(new Date(2024, m, 1))), [tag])
  const WEEKDAYS = useMemo(() => Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(tag, { weekday: 'short' }).format(new Date(2024, 0, 1 + i))), [tag])
  const selected = parseISO(value)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => selected ?? new Date())
  const [mode, setMode] = useState<'days' | 'months' | 'years'>('days')
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean }>({ top: 0, left: 0, up: false })

  useEffect(() => {
    if (!open) return
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const POPUP_H = 332
      const up = r.bottom + POPUP_H + 8 > window.innerHeight && r.top > POPUP_H
      setPos({ top: up ? r.top - POPUP_H - 8 : r.bottom + 8, left: Math.min(r.left, window.innerWidth - 292), up })
    }
    const close = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  useEffect(() => { if (open) { setView(selected ?? new Date()); setMode('days') } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const grid = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7 // Monday-first
    const start = new Date(first)
    start.setDate(first.getDate() - offset)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [view])

  const todayISO = toISO(new Date())
  const selISO = selected ? toISO(selected) : null
  const now = new Date()

  function pick(d: Date) {
    onChange?.({ target: { value: toISO(d) } })
    setOpen(false)
  }

  // The chevrons step by the unit the current view shows: one month on the
  // day grid, one year on the month grid, one 12-year block on the year grid.
  function step(dir: -1 | 1) {
    setView(v => mode === 'days'
      ? new Date(v.getFullYear(), v.getMonth() + dir, 1)
      : new Date(v.getFullYear() + dir * (mode === 'months' ? 1 : 12), v.getMonth(), 1))
  }

  const yearBase = Math.floor(view.getFullYear() / 12) * 12
  const years = Array.from({ length: 12 }, (_, i) => yearBase + i)
  const stepLabel = mode === 'days' ? 'month' : mode === 'months' ? 'year' : 'years'

  const fmt = selected
    ? selected.toLocaleDateString(tag, { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${className ?? 'empire-input'} flex items-center justify-between gap-2 text-left ${disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'}`}
      >
        <span className={`truncate ${fmt ? 'text-empire-text' : 'text-empire-text-dim'}`}>{fmt ?? placeholder ?? t('common.selectDate')}</span>
        <EmpireIcon name="calendar" size={14} className="shrink-0 text-empire-text-dim" />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          role="dialog"
          aria-label="Choose date"
          className="glass fixed z-[120] w-[284px] rounded-xl border border-empire-border p-3 shadow-gold-border"
          style={{ top: pos.top, left: pos.left, animation: 'dp-pop-in 240ms cubic-bezier(0.22,1,0.36,1)' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => step(-1)}
              aria-label={`Previous ${stepLabel}`}
              className="rounded-md p-1.5 text-empire-text-dim transition-colors duration-200 hover:bg-empire-elevated/60 hover:text-empire-gold">
              <EmpireIcon name="chevron-left" size={14} />
            </button>
            {mode === 'years' ? (
              <span className="font-empire text-sm tracking-wide text-empire-text">{yearBase} <span className="text-empire-text-muted">– {yearBase + 11}</span></span>
            ) : (
              <button
                type="button"
                onClick={() => setMode(m => (m === 'days' ? 'months' : 'years'))}
                aria-label={mode === 'days' ? 'Choose month and year' : 'Choose year'}
                className="rounded-md px-2 py-1 font-empire text-sm tracking-wide text-empire-text transition-colors duration-200 hover:bg-empire-elevated/60 hover:text-empire-gold"
              >
                {mode === 'days'
                  ? <>{MONTHS[view.getMonth()]} <span className="text-empire-text-muted">{view.getFullYear()}</span></>
                  : <>{view.getFullYear()}</>}
              </button>
            )}
            <button type="button" onClick={() => step(1)}
              aria-label={`Next ${stepLabel}`}
              className="rounded-md p-1.5 text-empire-text-dim transition-colors duration-200 hover:bg-empire-elevated/60 hover:text-empire-gold">
              <EmpireIcon name="chevron-right" size={14} />
            </button>
          </div>
          {mode === 'days' && (
          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map(w => (
              <span key={w} className="py-1 text-center text-[10px] uppercase tracking-widest text-empire-text-dim">{w}</span>
            ))}
            {grid.map((d, i) => {
              const iso = toISO(d)
              const inMonth = d.getMonth() === view.getMonth()
              const isSel = iso === selISO
              const isToday = iso === todayISO
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(d)}
                  aria-label={iso}
                  aria-pressed={isSel}
                  className={[
                    'h-8 rounded-md text-xs tabular-nums transition-all duration-200',
                    isSel
                      ? 'bg-empire-gold font-semibold text-empire-void shadow-gold-glow'
                      : isToday
                        ? 'border border-empire-gold/50 text-empire-gold hover:bg-empire-gold/10'
                        : inMonth
                          ? 'text-empire-text hover:bg-empire-elevated/70 hover:text-empire-gold'
                          : 'text-empire-text-dim/60 hover:bg-empire-elevated/40',
                  ].join(' ')}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
          )}
          {mode === 'months' && (
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((m, i) => {
              const isSel = selected && selected.getFullYear() === view.getFullYear() && selected.getMonth() === i
              const isNow = now.getFullYear() === view.getFullYear() && now.getMonth() === i
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setView(v => new Date(v.getFullYear(), i, 1)); setMode('days') }}
                  aria-label={`${m} ${view.getFullYear()}`}
                  aria-pressed={!!isSel}
                  className={[
                    'h-12 rounded-md text-xs transition-all duration-200',
                    isSel
                      ? 'bg-empire-gold font-semibold text-empire-void shadow-gold-glow'
                      : isNow
                        ? 'border border-empire-gold/50 text-empire-gold hover:bg-empire-gold/10'
                        : 'text-empire-text hover:bg-empire-elevated/70 hover:text-empire-gold',
                  ].join(' ')}
                >
                  {m.slice(0, 3)}
                </button>
              )
            })}
          </div>
          )}
          {mode === 'years' && (
          <div className="grid grid-cols-3 gap-1">
            {years.map(y => {
              const isSel = selected?.getFullYear() === y
              const isNow = now.getFullYear() === y
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setView(v => new Date(y, v.getMonth(), 1)); setMode('months') }}
                  aria-label={`Year ${y}`}
                  aria-pressed={!!isSel}
                  className={[
                    'h-12 rounded-md text-xs tabular-nums transition-all duration-200',
                    isSel
                      ? 'bg-empire-gold font-semibold text-empire-void shadow-gold-glow'
                      : isNow
                        ? 'border border-empire-gold/50 text-empire-gold hover:bg-empire-gold/10'
                        : 'text-empire-text hover:bg-empire-elevated/70 hover:text-empire-gold',
                  ].join(' ')}
                >
                  {y}
                </button>
              )
            })}
          </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-empire-border pt-2">
            <button type="button" onClick={() => { onChange?.({ target: { value: '' } }); setOpen(false) }}
              className="rounded-md px-2 py-1 text-[11px] uppercase tracking-widest text-empire-text-muted transition-colors duration-200 hover:text-empire-text">
              {t('common.clear')}
            </button>
            <button type="button" onClick={() => pick(new Date())}
              className="rounded-md px-2 py-1 text-[11px] uppercase tracking-widest text-empire-gold transition-colors duration-200 hover:bg-empire-gold/10">
              {t('common.today')}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
