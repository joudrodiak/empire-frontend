'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetcher, patch } from '@/lib/api'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { Modal } from '@/components/molecules/Modal'

/* Reporting structure for one unit, rendered as a top→bottom org flowchart
 * (leaders at the top, their reports cascading below — i.e. the chain from the
 * bottom all the way to the top). Data: GET /api/employees/structure/:slug.
 * Each node lets you set who a person reports to (PATCH /api/employees/:id),
 * so the chart is editable, not static. */

type Person = {
  id: string; name: string; role: string; avatarUrl: string | null
  reportsToId: string | null; fte: number; contractType: string; isActive: boolean
}
type StructureResponse = { unit: { id: string; name: string; slug: string }; people: Person[] }

export function StructurePanel({ departmentSlug, accent }: { departmentSlug: string; accent?: string }) {
  const [data, setData] = useState<StructureResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Person | null>(null)
  const gold = accent || '#C9A233'

  const load = useCallback(async () => {
    try {
      const d = await fetcher(`/api/employees/structure/${departmentSlug}`)
      setData(d)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [departmentSlug])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="text-empire-text-dim text-sm p-8 text-center">Mapping the chain of command…</div>
  if (!data) return <div className="text-empire-text-muted text-sm p-8 text-center">No structure to show.</div>

  const people = data.people
  const byId = new Map(people.map(p => [p.id, p]))
  // Roots = no manager, or a manager outside this unit's set.
  const roots = people.filter(p => !p.reportsToId || !byId.has(p.reportsToId))
  const childrenOf = (id: string) => people.filter(p => p.reportsToId === id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-empire text-empire-gold text-sm tracking-widest uppercase inline-block pb-1 border-b border-empire-gold/30">Structure</h2>
          <p className="text-empire-text-muted text-xs mt-1.5">Reporting lines for {data.unit.name} — top to bottom. Click a person to set who they report to.</p>
        </div>
        <div className="text-empire-text-dim text-xs inline-flex items-center gap-1.5">
          <EmpireIcon name="people" size={13} /> {people.length} member{people.length === 1 ? '' : 's'}
        </div>
      </div>

      {people.length === 0 ? (
        <div className="text-center py-16 text-empire-text-muted text-sm">No one assigned to this unit yet.</div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="inline-flex flex-col items-center gap-0 min-w-full">
            <div className="flex items-start justify-center gap-8">
              {roots.map(r => (
                <TreeNode key={r.id} person={r} childrenOf={childrenOf} onEdit={setEditing} accent={gold} depth={0} />
              ))}
            </div>
          </div>
        </div>
      )}

      {editing && (
        <ReportsToModal
          person={editing}
          people={people}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function TreeNode({ person, childrenOf, onEdit, accent, depth }: {
  person: Person
  childrenOf: (id: string) => Person[]
  onEdit: (p: Person) => void
  accent: string
  depth: number
}) {
  const kids = childrenOf(person.id)
  return (
    <div className="flex flex-col items-center">
      <PersonCard person={person} accent={accent} onClick={() => onEdit(person)} />
      {kids.length > 0 && (
        <>
          {/* vertical connector down from this node */}
          <div className="w-px h-5 bg-empire-border" />
          <div className="relative flex items-start justify-center gap-6">
            {/* horizontal rail across children */}
            {kids.length > 1 && (
              <div className="absolute top-0 left-0 right-0 h-px bg-empire-border"
                   style={{ left: '10%', right: '10%' }} />
            )}
            {kids.map(k => (
              <div key={k.id} className="flex flex-col items-center pt-0">
                <div className="w-px h-5 bg-empire-border" />
                <TreeNode person={k} childrenOf={childrenOf} onEdit={onEdit} accent={accent} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PersonCard({ person, accent, onClick }: { person: Person; accent: string; onClick: () => void }) {
  const initials = person.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <button
      onClick={onClick}
      className="glass group w-44 rounded-lg p-3 text-left border border-empire-border hover:border-empire-gold/40 transition-colors"
      title="Edit reporting line"
    >
      <div className="flex items-center gap-2.5">
        {person.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.avatarUrl} alt={person.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-empire-border" />
        ) : (
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
               style={{ background: accent + '30', color: accent }}>
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-empire-text text-xs font-medium truncate">{person.name}</div>
          <div className="text-empire-text-dim text-[11px] truncate">{person.role}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-empire-text-muted">
        {person.fte != null && person.fte < 1 && (
          <span className="px-1.5 py-0.5 rounded border border-empire-amber/40 text-empire-amber-bright">{person.fte} FTE</span>
        )}
        {person.contractType === 'contractor' && (
          <span className="px-1.5 py-0.5 rounded border border-empire-border">contractor</span>
        )}
        {!person.isActive && (
          <span className="px-1.5 py-0.5 rounded border border-empire-red/40 text-empire-red-bright">inactive</span>
        )}
      </div>
    </button>
  )
}

function ReportsToModal({ person, people, onClose, onSaved }: {
  person: Person; people: Person[]; onClose: () => void; onSaved: () => void
}) {
  const [reportsToId, setReportsToId] = useState(person.reportsToId ?? '')
  const [busy, setBusy] = useState(false)
  // Can't report to self; (cycle-prevention beyond direct self is handled server-side / by convention)
  const options = people.filter(p => p.id !== person.id)

  async function save() {
    setBusy(true)
    try {
      await patch(`/api/employees/${person.id}`, { reportsToId: reportsToId || null })
      onSaved()
    } catch (e) { console.error(e); setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={`Reporting line — ${person.name}`} icon={<EmpireIcon name="link" size={18} />}>
      <div className="space-y-3">
        <div>
          <label className="empire-label">Reports to</label>
          <select className="empire-input w-full mt-1" value={reportsToId} onChange={e => setReportsToId(e.target.value)}>
            <option value="">— Top of unit (no manager) —</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.name} · {o.role}</option>)}
          </select>
          <p className="text-[11px] text-empire-text-dim mt-1">Sets where {person.name} sits in the chain. Leave empty to place them at the top.</p>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy} className="empire-btn-primary disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  )
}
