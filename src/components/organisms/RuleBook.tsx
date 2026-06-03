'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { RULE_SECTIONS, type RuleSection } from '@/lib/rules'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'

/**
 * The Empire Rule Book — one button, every rule. Replaces the copy-pasted
 * "How XP works" boxes that used to live on each page. Rules are grouped per
 * title (section); the sidebar jumps to any one. Single source of truth: lib/rules.ts.
 */
export function RuleBook({
  accent = '#c9a233',
  variant = 'button',
  initialSection,
}: {
  accent?: string
  variant?: 'button' | 'inline'
  initialSection?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(initialSection ?? RULE_SECTIONS[0].id)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  // Lock body scroll while the slide-over is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open])

  const trigger =
    variant === 'inline' ? (
      <button
        onClick={() => setOpen(true)}
        className="w-full p-3 bg-empire-elevated/40 border border-empire-border/60 rounded-lg text-left hover:border-empire-gold/40 transition-colors group"
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-empire-text-dim">
            <EmpireIcon name="book" size={12} /> Rule Book
          </span>
          <EmpireIcon name="chevron-right" size={13} className="text-empire-text-dim group-hover:text-empire-gold transition-colors" />
        </div>
        <p className="text-[11px] text-empire-text-muted leading-snug mt-1">
          XP, ranks, cross-dept bonus, team score, Z-score — every rule in one place.
        </p>
      </button>
    ) : (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs uppercase tracking-widest font-medium transition-colors"
        style={{ borderColor: accent + '55', color: accent, background: accent + '12' }}
      >
        <EmpireIcon name="book" size={13} /> Rule Book
      </button>
    )

  return (
    <>
      {trigger}
      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-stretch justify-end bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-3xl h-full bg-empire-deep border-l border-empire-border shadow-2xl flex flex-col animate-[slideIn_.2s_ease]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-empire-border">
              <div className="flex items-center gap-2">
                <EmpireIcon name="book" size={20} className="text-empire-gold" />
                <div>
                  <h2 className="font-empire text-empire-gold text-base tracking-wide">The Rule Book</h2>
                  <p className="text-empire-text-dim text-xs">How the Empire scores, ranks and rewards work.</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-empire-text-muted hover:text-empire-text w-8 h-8 rounded flex items-center justify-center hover:bg-empire-elevated transition-colors"
                aria-label="Close"
              >
                <EmpireIcon name="close" size={16} />
              </button>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Section nav (per title) */}
              <nav className="w-48 flex-shrink-0 border-r border-empire-border overflow-y-auto py-2">
                {RULE_SECTIONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center gap-2 ${
                      active === s.id
                        ? 'text-empire-gold bg-empire-elevated/60 border-l-2'
                        : 'text-empire-text-muted hover:text-empire-text border-l-2 border-transparent'
                    }`}
                    style={active === s.id ? { borderColor: accent } : undefined}
                  >
                    <EmpireIcon name={s.icon} size={14} />
                    <span className="truncate">{s.title}</span>
                  </button>
                ))}
              </nav>

              {/* Section body */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {RULE_SECTIONS.filter(s => s.id === active).map(s => (
                  <RuleSectionView key={s.id} section={s} accent={accent} />
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      <style jsx global>{`
        @keyframes slideIn { from { transform: translateX(24px); opacity: .6 } to { transform: translateX(0); opacity: 1 } }
      `}</style>
    </>
  )
}

function RuleSectionView({ section, accent }: { section: RuleSection; accent: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <EmpireIcon name={section.icon} size={22} className="text-empire-gold" />
        <h3 className="font-empire text-empire-gold text-lg">{section.title}</h3>
      </div>
      {section.body?.map((p, i) => (
        <p key={i} className="text-empire-text-muted text-sm leading-relaxed">{p}</p>
      ))}
      {section.list && (
        <ul className="space-y-1.5">
          {section.list.map((li, i) => (
            <li key={i} className="text-empire-text-muted text-sm flex gap-2">
              <span style={{ color: accent }}>•</span>
              <span>{li}</span>
            </li>
          ))}
        </ul>
      )}
      {section.table && (
        <div className="border border-empire-border rounded-lg overflow-hidden divide-y divide-empire-border">
          {section.table.map((row, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-4 py-2.5 bg-empire-surface">
              <span className="text-empire-text text-sm font-medium">{row.label}</span>
              <span className="text-empire-text-muted text-xs text-right">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
