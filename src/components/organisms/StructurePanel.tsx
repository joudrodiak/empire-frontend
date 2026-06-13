'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  roleId?: string | null; roleRef?: { id: string; key: string; name: string; level: number } | null
}
// A structured role from the IAM catalogue — for the role-linkage picker.
type RoleOption = { id: string; key: string; name: string; level: number }
type StructureResponse = { unit: { id: string; name: string; slug: string }; people: Person[] }

export function StructurePanel({ departmentSlug, accent }: { departmentSlug: string; accent?: string }) {
  const [data, setData] = useState<StructureResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Person | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const gold = accent || '#C9A233'
  const zoomBy = (delta: number) => setScale(value => Math.min(1.8, Math.max(0.7, Number((value + delta).toFixed(2)))))
  const centerTree = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

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
  const childrenOf = (id: string) => people.filter(p => p.reportsToId === id)
  // Roots = no manager, or a manager outside this unit's set. Cycle guard: anyone
  // not reachable from a real root (a reporting loop, e.g. A→B→A) is surfaced as a
  // root too, so a person can NEVER vanish after a reportsTo change.
  const baseRoots = people.filter(p => !p.reportsToId || !byId.has(p.reportsToId))
  const reachable = new Set<string>()
  const mark = (id: string) => {
    if (reachable.has(id)) return
    reachable.add(id)
    childrenOf(id).forEach(c => mark(c.id))
  }
  baseRoots.forEach(r => mark(r.id))
  const orphans = people.filter(p => !reachable.has(p.id))
  const roots = [...baseRoots, ...orphans]

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
        <div
          className="relative min-h-[560px] overflow-hidden rounded-xl border border-empire-border bg-empire-surface/50 p-4 touch-none cursor-grab active:cursor-grabbing"
          onWheel={event => {
            event.preventDefault()
            zoomBy(event.deltaY > 0 ? -0.08 : 0.08)
          }}
          onPointerDown={event => {
            if ((event.target as HTMLElement).closest('button')) return
            event.currentTarget.setPointerCapture(event.pointerId)
            dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }
          }}
          onPointerMove={event => {
            const drag = dragRef.current
            if (!drag) return
            setOffset({ x: drag.ox + event.clientX - drag.x, y: drag.oy + event.clientY - drag.y })
          }}
          onPointerUp={() => { dragRef.current = null }}
          onPointerCancel={() => { dragRef.current = null }}
        >
          <div className="absolute right-4 top-4 z-20 flex items-center gap-1 rounded-full border border-empire-border/70 bg-empire-deep/80 p-1 backdrop-blur">
            <button type="button" onClick={() => zoomBy(-0.12)} aria-label="Zoom structure out" className="grid h-8 w-8 place-items-center rounded-full text-empire-text-muted transition-colors hover:bg-empire-elevated hover:text-empire-gold">
              <EmpireIcon name="close" size={13} />
            </button>
            <span className="min-w-12 text-center font-data text-[11px] text-empire-text-dim">{Math.round(scale * 100)}%</span>
            <button type="button" onClick={() => zoomBy(0.12)} aria-label="Zoom structure in" className="grid h-8 w-8 place-items-center rounded-full text-empire-text-muted transition-colors hover:bg-empire-elevated hover:text-empire-gold">
              <EmpireIcon name="plus" size={14} />
            </button>
            <button type="button" onClick={centerTree} aria-label="Center structure" className="grid h-8 w-8 place-items-center rounded-full text-empire-text-muted transition-colors hover:bg-empire-elevated hover:text-empire-gold">
              <EmpireIcon name="compass" size={14} />
            </button>
          </div>
          <div
            className="flex min-h-[520px] min-w-max items-center justify-center px-10 py-14 will-change-transform"
            style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`, transformOrigin: '50% 50%' }}
          >
            <div className="inline-flex flex-col items-center gap-0">
              <div className="flex items-start justify-center gap-8">
                {roots.map(r => (
                  <TreeNode key={r.id} person={r} childrenOf={childrenOf} onEdit={setEditing} accent={gold} depth={0} ancestors={new Set()} />
                ))}
              </div>
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

function TreeNode({ person, childrenOf, onEdit, accent, depth, ancestors }: {
  person: Person
  childrenOf: (id: string) => Person[]
  onEdit: (p: Person) => void
  accent: string
  depth: number
  ancestors: Set<string>
}) {
  // Drop any child already in our ancestor chain — prevents infinite recursion
  // if a reporting cycle ever slips past the server guard.
  const kids = childrenOf(person.id).filter(k => !ancestors.has(k.id))
  const nextAncestors = new Set(ancestors).add(person.id)
  return (
    <div className="flex flex-col items-center">
      <PersonCard person={person} accent={accent} onClick={() => onEdit(person)} />
      {kids.length > 0 && (
        <>
          {/* vertical connector down from this node into the children rail */}
          <div className="w-px h-5 bg-empire-border" />
          {/* B1 fix: the rail is built per-child (each draws its own top-border half)
             so its ends ALWAYS terminate at the first/last child centres regardless
             of differing subtree widths — no floating/disconnected lines. */}
          <div className="flex items-start justify-center gap-6">
            {kids.map((k, i) => {
              const railClass = kids.length === 1
                ? 'hidden'
                : i === 0
                  ? 'left-1/2 right-0'
                  : i === kids.length - 1
                    ? 'left-0 right-1/2'
                    : 'left-0 right-0'
              return (
                <div key={k.id} className="relative flex flex-col items-center px-3 pt-5">
                  {/* horizontal rail segment for this child */}
                  <span aria-hidden className={`absolute top-0 h-px bg-empire-border ${railClass}`} />
                  {/* vertical stem from the rail down to this child */}
                  <span aria-hidden className="absolute top-0 left-1/2 h-5 w-px -translate-x-1/2 bg-empire-border" />
                  <TreeNode person={k} childrenOf={childrenOf} onEdit={onEdit} accent={accent} depth={depth + 1} ancestors={nextAncestors} />
                </div>
              )
            })}
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
  const [roleId, setRoleId] = useState(person.roleId ?? '')
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Can't report to self; deeper cycle prevention is enforced server-side.
  const options = people.filter(p => p.id !== person.id)

  // Every employee must carry a structured role link — load the IAM role catalogue.
  useEffect(() => {
    fetcher('/api/iam/roles')
      .then((r: any) => setRoles((r.data ?? r ?? []) as RoleOption[]))
      .catch(() => setRoles([]))
  }, [])

  async function save() {
    setBusy(true)
    setError('')
    try {
      await patch(`/api/employees/${person.id}`, { reportsToId: reportsToId || null, roleId: roleId || null })
      onSaved()
    } catch (e: any) {
      setError(e?.message?.includes('cycle')
        ? 'That reporting line loops back on itself — pick a different manager.'
        : 'Could not save the reporting line. Try again.')
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Role & reporting — ${person.name}`} icon={<EmpireIcon name="link" size={18} />}>
      <div className="space-y-3">
        <div>
          <label className="empire-label">Role</label>
          <select className="empire-input w-full mt-1" value={roleId} onChange={e => setRoleId(e.target.value)}>
            <option value="">— No structured role —</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name} · L{r.level}</option>)}
          </select>
          <p className="text-[11px] text-empire-text-dim mt-1">Links {person.name} to a role in the catalogue (level, permissions). Required for full people records.</p>
        </div>
        <div>
          <label className="empire-label">Reports to</label>
          <select className="empire-input w-full mt-1" value={reportsToId} onChange={e => setReportsToId(e.target.value)}>
            <option value="">— Top of unit (no manager) —</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.name} · {o.role}</option>)}
          </select>
          <p className="text-[11px] text-empire-text-dim mt-1">Sets where {person.name} sits in the chain. Leave empty to place them at the top.</p>
        </div>
        {error && <p className="text-[11px] text-empire-red-bright">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy} className="empire-btn-primary disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  )
}
