'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { Modal } from '@/components/molecules/Modal'
import { EDUCATION_DOCS, type EducationDoc } from '@/lib/education'

const DEPT_NAMES: Record<string, string> = {
  hr: 'HR & People',
  finance: 'Finance',
  legal: 'Legal',
  marketing: 'Marketing',
  operations: 'Operations',
  engineering: 'Engineering',
  creative: 'Creative Studio',
  'client-success': 'Client Success',
  partnerships: 'Partnerships',
  advisory: 'Advisory',
}

const UNIT_ICONS: Record<string, IconName> = {
  command: 'crown',
  governance: 'shield',
  workspaces: 'sitemap',
}

type UnitGroup = { key: string; name: string; icon: IconName; docs: EducationDoc[] }

function unitOf(doc: EducationDoc): { key: string; name: string } {
  const dept = doc.path.match(/^\/departments\/([a-z-]+)/)
  if (dept && doc.category !== 'Domains') {
    return { key: dept[1], name: DEPT_NAMES[dept[1]] ?? dept[1] }
  }
  if (doc.category === 'Domains') return { key: 'workspaces', name: 'Unit Workspaces' }
  if (doc.category === 'Platform') return { key: 'platform', name: 'Platform Tools' }
  if (doc.path.startsWith('/approvals')) return { key: 'governance', name: 'Governance' }
  return { key: 'command', name: 'Command Center' }
}

function groupByUnit(docs: EducationDoc[]): UnitGroup[] {
  const groups: UnitGroup[] = []
  const byKey = new Map<string, UnitGroup>()
  for (const doc of docs) {
    const { key, name } = unitOf(doc)
    let group = byKey.get(key)
    if (!group) {
      group = { key, name, icon: UNIT_ICONS[key] ?? doc.icon, docs: [] }
      byKey.set(key, group)
      groups.push(group)
    }
    group.docs.push(doc)
  }
  return groups
}

export default function EducationPage() {
  const [query, setQuery] = useState('')
  const [openUnit, setOpenUnit] = useState<UnitGroup | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const units = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return groupByUnit(EDUCATION_DOCS)
    const matching = EDUCATION_DOCS.filter(doc => {
      const haystack = [doc.title, doc.category, doc.summary, doc.outcome, ...doc.steps, ...doc.tags].join(' ').toLowerCase()
      return haystack.includes(needle)
    })
    return groupByUnit(matching)
  }, [query])

  function openGuide(unit: UnitGroup, docId: string) {
    setOpenUnit(unit)
    setExpandedId(docId)
  }

  function closeUnit() {
    setOpenUnit(null)
    setExpandedId(null)
  }

  return (
    <main className="min-h-screen bg-empire-void px-5 pb-28 pt-8 text-empire-text md:px-8">
      <div className="mx-auto max-w-screen-xl space-y-7">
        <header className="flex flex-col gap-5 border-b border-empire-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-empire-gold/25 bg-empire-gold/10 px-3 py-1 text-[10px] uppercase tracking-widest text-empire-gold">
              <EmpireIcon name="book" size={12} /> Education
            </div>
            <h1 className="font-empire text-3xl tracking-wide text-empire-gold md:text-5xl">Operating Guides</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-empire-text-muted">
              Pick a unit to see exactly how to run its workflows, step by step. Search across every guide when you know the task but not the unit.
            </p>
          </div>

          <label className="relative block w-full lg:w-[360px]">
            <span className="sr-only">Search features</span>
            <EmpireIcon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-empire-text-dim" />
            <input
              id="education-search"
              name="educationSearch"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search a task, e.g. payroll, contract, ticket..."
              className="h-11 w-full rounded-lg border border-empire-border bg-empire-surface pl-9 pr-3 text-sm text-empire-text outline-none transition-colors placeholder:text-empire-text-dim focus:border-empire-gold/60"
            />
          </label>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Unit guides">
          {units.map(unit => (
            <GlassPanel key={unit.key} variant="glass" className="flex flex-col rounded-xl p-5">
              <button
                type="button"
                onClick={() => { setOpenUnit(unit); setExpandedId(unit.docs[0]?.id ?? null) }}
                className="group flex items-center gap-3.5 text-left"
                aria-label={`Open ${unit.name} guides`}
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-empire-gold/25 bg-empire-gold/10 text-empire-gold transition-colors group-hover:bg-empire-gold/20">
                  <EmpireIcon name={unit.icon} size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-empire text-base tracking-wide text-empire-text transition-colors group-hover:text-empire-gold">{unit.name}</h2>
                  <p className="text-[11px] uppercase tracking-widest text-empire-text-dim">
                    {unit.docs.length} guide{unit.docs.length === 1 ? '' : 's'}
                  </p>
                </div>
                <EmpireIcon name="chevron-right" size={14} className="shrink-0 text-empire-text-dim transition-colors group-hover:text-empire-gold" />
              </button>

              <ul className="mt-4 flex-1 space-y-1.5 border-t border-empire-border/70 pt-3.5">
                {unit.docs.map(doc => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => openGuide(unit, doc.id)}
                      className="group/guide flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-empire-gold/10"
                    >
                      <EmpireIcon name={doc.icon} size={14} className="shrink-0 text-empire-text-dim transition-colors group-hover/guide:text-empire-gold" />
                      <span className="min-w-0 flex-1 truncate text-sm text-empire-text-muted transition-colors group-hover/guide:text-empire-text">{doc.title}</span>
                      <span className="shrink-0 font-data text-[10px] text-empire-text-dim">{doc.steps.length} steps</span>
                    </button>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          ))}
        </section>

        {units.length === 0 && (
          <GlassPanel variant="glass" className="rounded-xl p-10 text-center">
            <EmpireIcon name="search" size={24} className="mx-auto text-empire-text-dim" />
            <p className="mt-3 text-sm text-empire-text-muted">No guides match that search.</p>
          </GlassPanel>
        )}

        <Modal
          open={!!openUnit}
          onClose={closeUnit}
          title={openUnit ? `${openUnit.name} — how to` : 'Unit guides'}
          icon={<EmpireIcon name={openUnit?.icon || 'book'} size={18} />}
          width="max-w-2xl"
        >
          {openUnit && (
            <div className="space-y-2.5">
              {openUnit.docs.map(doc => {
                const expanded = expandedId === doc.id
                return (
                  <div key={doc.id} className={`rounded-lg border transition-colors ${expanded ? 'border-empire-gold/35 bg-empire-elevated/40' : 'border-empire-border bg-empire-elevated/20'}`}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : doc.id)}
                      aria-expanded={expanded}
                      className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                    >
                      <EmpireIcon name={doc.icon} size={16} className={expanded ? 'text-empire-gold' : 'text-empire-text-dim'} />
                      <span className={`min-w-0 flex-1 text-sm font-medium ${expanded ? 'text-empire-gold' : 'text-empire-text'}`}>{doc.title}</span>
                      <EmpireIcon name="chevron-down" size={13} className={`shrink-0 text-empire-text-dim transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    {expanded && (
                      <div className="space-y-4 border-t border-empire-border/70 px-3.5 pb-4 pt-3.5">
                        <p className="text-sm leading-6 text-empire-text-muted">{doc.summary}</p>
                        <ol className="space-y-2">
                          {doc.steps.map((step, index) => (
                            <li key={step} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 text-sm leading-6 text-empire-text-muted">
                              <span className="grid h-6 w-6 place-items-center rounded-full border border-empire-gold/30 bg-empire-gold/10 font-data text-[10px] text-empire-gold">{index + 1}</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                        <div className="rounded-lg border border-empire-gold/20 bg-empire-gold/5 px-3 py-2 text-xs leading-5 text-empire-text-muted">
                          <span className="font-semibold text-empire-gold">Outcome:</span> {doc.outcome}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-1.5">
                            {doc.tags.slice(0, 5).map(tag => (
                              <span key={tag} className="rounded border border-empire-border/70 px-2 py-0.5 text-[10px] text-empire-text-dim">{tag}</span>
                            ))}
                          </div>
                          <Link href={doc.path} className="inline-flex items-center gap-1.5 rounded-lg border border-empire-gold/35 px-3 py-2 text-xs font-medium text-empire-gold transition-all duration-200 hover:-translate-y-0.5 hover:bg-empire-gold/10">
                            Go to unit <EmpireIcon name="external" size={12} />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Modal>
      </div>
    </main>
  )
}
