'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { Modal } from '@/components/molecules/Modal'
import { EDUCATION_DOCS, type EducationDoc } from '@/lib/education'

const CATEGORIES = ['All', ...Array.from(new Set(EDUCATION_DOCS.map(doc => doc.category)))]

export default function EducationPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState<EducationDoc | null>(null)

  const docs = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return EDUCATION_DOCS.filter(doc => {
      const inCategory = category === 'All' || doc.category === category
      if (!needle) return inCategory
      const haystack = [doc.title, doc.category, doc.summary, doc.outcome, ...doc.steps, ...doc.tags].join(' ').toLowerCase()
      return inCategory && haystack.includes(needle)
    })
  }, [category, query])

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
              Search step-by-step workflows for Empire OS units, domain workspaces, governance flows, and MCP-controlled platform tools.
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
              placeholder="Search a feature..."
              className="h-11 w-full rounded-lg border border-empire-border bg-empire-surface pl-9 pr-3 text-sm text-empire-text outline-none transition-colors placeholder:text-empire-text-dim focus:border-empire-gold/60"
            />
          </label>
        </header>

        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Education categories">
          {CATEGORIES.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${
                category === item
                  ? 'border-empire-gold/50 bg-empire-gold/15 text-empire-gold'
                  : 'border-empire-border bg-empire-surface/60 text-empire-text-muted hover:border-empire-gold/35 hover:text-empire-text'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-label="Unit documentation">
          {docs.map(doc => (
            <GlassPanel key={doc.id} variant="glass" className="rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-empire-gold/25 bg-empire-gold/10 text-empire-gold">
                  <EmpireIcon name={doc.icon} size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-empire text-base tracking-wide text-empire-text">{doc.title}</h2>
                    <span className="rounded-full border border-empire-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-empire-text-dim">{doc.category}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-empire-text-muted">{doc.summary}</p>
                  <ol className="mt-4 space-y-2.5">
                    {doc.steps.map((item, index) => (
                      <li key={item} className="grid grid-cols-[1.6rem_minmax(0,1fr)] gap-2.5 text-xs leading-5 text-empire-text-muted">
                        <span className="grid h-6 w-6 place-items-center rounded-full border border-empire-gold/30 bg-empire-gold/10 font-data text-[10px] text-empire-gold">{index + 1}</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 rounded-lg border border-empire-gold/20 bg-empire-gold/5 px-3 py-2 text-xs leading-5 text-empire-text-muted">
                    <span className="font-semibold text-empire-gold">Outcome:</span> {doc.outcome}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-empire-border pt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {doc.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="rounded border border-empire-border/70 px-2 py-0.5 text-[10px] text-empire-text-dim">{tag}</span>
                      ))}
                    </div>
                    <button type="button" onClick={() => setSelected(doc)} className="inline-flex items-center gap-1.5 text-xs font-medium text-empire-gold transition-all duration-200 hover:-translate-y-0.5 hover:text-empire-gold-bright">
                      Open <EmpireIcon name="chevron-right" size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </GlassPanel>
          ))}
        </section>

        {docs.length === 0 && (
          <GlassPanel variant="glass" className="rounded-xl p-10 text-center">
            <EmpireIcon name="search" size={24} className="mx-auto text-empire-text-dim" />
            <p className="mt-3 text-sm text-empire-text-muted">No feature docs match that search.</p>
          </GlassPanel>
        )}
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title || 'Education unit'} icon={<EmpireIcon name={selected?.icon || 'book'} size={18} />} width="max-w-2xl">
          {selected && (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-empire-text-muted">{selected.summary}</p>
              <div className="rounded-lg border border-empire-border bg-empire-elevated/30 p-3">
                <p className="text-[10px] uppercase tracking-widest text-empire-text-dim">Deeper dive</p>
                <ol className="mt-3 space-y-2">
                  {selected.steps.map((step, index) => (
                    <li key={step} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 text-sm leading-6 text-empire-text-muted">
                      <span className="grid h-6 w-6 place-items-center rounded-full border border-empire-gold/30 bg-empire-gold/10 font-data text-[10px] text-empire-gold">{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-lg border border-empire-gold/20 bg-empire-gold/5 px-3 py-2 text-xs leading-5 text-empire-text-muted">
                <span className="font-semibold text-empire-gold">Specific outcome:</span> {selected.outcome}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map(tag => <span key={tag} className="rounded border border-empire-border/70 px-2 py-0.5 text-[10px] text-empire-text-dim">{tag}</span>)}
                </div>
                <Link href={selected.path} className="inline-flex items-center gap-1.5 rounded-lg border border-empire-gold/35 px-3 py-2 text-xs font-medium text-empire-gold transition-all duration-200 hover:-translate-y-0.5 hover:bg-empire-gold/10">
                  Go to unit <EmpireIcon name="external" size={12} />
                </Link>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </main>
  )
}
