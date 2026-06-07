'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetcher, post, patch, del } from '@/lib/api'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { FileDrop } from '@/components/molecules/FileDrop'
import { EmptyState } from '@/components/atoms/EmptyState'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'
import { format } from 'date-fns'

// A contract / legal document. Mirrors the API `Contract` model.
export type Contract = {
  id: string
  type: 'employee' | 'company' | 'partner'
  title: string
  counterparty: string | null
  refId: string | null
  status: string
  startDate: string | null
  endDate: string | null
  fileUrl: string | null
  value: number | null
  currency: string
  notes: string | null
  templateKey?: string | null
  signedAt?: string | null
  approvalRequestId?: string | null
  createdAt: string
  department: { name: string; slug: string; icon: string; color: string } | null
  employee: { id: string; name: string; role: string } | null
  createdBy?: { id: string; name: string; role: string } | null
}

// A person — for the employee / created-by pickers. In global (People Ops) mode
// the picker spans every unit, so we carry the person's unit slug to stamp the
// contract's department on save.
type Person = { id: string; name: string; role: string; departmentSlug?: string }
// A document already produced in Legal — pickable as a contract's source.
type LegalDoc = { id: string; title: string; counterparty: string | null; templateKey: string; status: string; renderedMarkdown?: string }
type LegalTemplate = { id: string; key: string; name: string; category: string }

const TYPES = ['all', 'employee', 'company', 'partner'] as const
const STATUSES = ['all', 'draft', 'review', 'approval', 'signed', 'active', 'expired', 'terminated', 'archived'] as const
const TYPE_ICON: Record<string, IconName> = { employee: 'user', company: 'briefcase', partner: 'handshake' }

// The forward lifecycle pipeline rendered as a stepper (mirrors the API's
// /api/contracts/meta/lifecycle pipeline; off-ramps live outside it).
const LIFECYCLE_PIPELINE = ['draft', 'review', 'approval', 'signed', 'archived'] as const
// Allowed transitions out of each state — mirrors api/src/lib/contractLifecycle.ts.
// Kept in sync so the edit form only offers legal moves (the API enforces it too).
const LIFECYCLE_NEXT: Record<string, string[]> = {
  draft: ['review', 'archived'],
  review: ['approval', 'draft', 'archived'],
  approval: ['signed', 'review', 'archived'],
  signed: ['active', 'expired', 'terminated', 'archived'],
  active: ['expired', 'terminated', 'archived'],
  expired: ['active', 'archived'],
  terminated: ['archived'],
  archived: [],
}

const STATUS_STYLE: Record<string, string> = {
  active: 'text-empire-green-bright border-empire-green/40',
  signed: 'text-empire-green-bright border-empire-green/40',
  draft: 'text-empire-amber-bright border-empire-amber/40',
  review: 'text-empire-amber-bright border-empire-amber/40',
  approval: 'text-empire-gold border-empire-gold/40',
  expired: 'text-empire-text-dim border-empire-border',
  terminated: 'text-empire-text-dim border-empire-border',
  archived: 'text-empire-text-dim border-empire-border',
}

const PAGE_SIZE = 10

// Renewal awareness: classify a contract by how close its end date is. Drives the
// amber/red expiry pill so the registry doubles as a renewal radar.
function expiryState(endDate: string | null, status: string): { label: string; cls: string } | null {
  if (!endDate || status === 'terminated' || status === 'expired') return null
  const days = Math.ceil((+new Date(endDate) - Date.now()) / (24 * 60 * 60 * 1000))
  if (days < 0) return { label: 'expired', cls: 'text-empire-red-bright border-empire-red/40' }
  if (days <= 30) return { label: `${days}d left`, cls: 'text-empire-red-bright border-empire-red/40' }
  if (days <= 90) return { label: `${days}d left`, cls: 'text-empire-amber-bright border-empire-amber/40' }
  return null
}

export function ContractsPanel({ departmentSlug, accent = '#c9a233', prefillEmployeeId, onConsumePrefill, global = false }: {
  // Omit `departmentSlug` (or pass global) to search EVERY unit's contracts —
  // the People Operations "Contracts" tab mounts it this way so any employee
  // contract is findable in one place by title, party, ref, employee name or role.
  departmentSlug?: string; accent?: string
  // When People Ops (or any roster) jumps here to "create a contract" for a person,
  // it passes that employee id; the form auto-opens prefilled for them.
  prefillEmployeeId?: string | null
  onConsumePrefill?: () => void
  global?: boolean
}) {
  const isGlobal = global || !departmentSlug
  const [rows, setRows] = useState<Contract[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(0)            // 0-based for the Pagination molecule
  const [type, setType] = useState<typeof TYPES[number]>('all')
  const [status, setStatus] = useState<typeof STATUSES[number]>('all')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<Contract | null>(null)
  const [editing, setEditing] = useState<Contract | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function removeContract(c: Contract) {
    try { await del(`/api/contracts/${c.id}`); load() }
    catch (e) { console.error(e) }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        pageSize: String(PAGE_SIZE),
      })
      if (departmentSlug) params.set('departmentSlug', departmentSlug)
      if (type !== 'all') params.set('type', type)
      if (status !== 'all') params.set('status', status)
      if (q.trim()) params.set('q', q.trim())
      const res = await fetcher(`/api/contracts?${params.toString()}`)
      setRows(res.data)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [departmentSlug, page, type, status, q])

  useEffect(() => { load() }, [load])
  // reset to first page whenever a filter changes
  useEffect(() => { setPage(0) }, [type, status, q])
  // A roster jump to "create a contract" for a person opens the form prefilled.
  useEffect(() => { if (prefillEmployeeId) setShowForm(true) }, [prefillEmployeeId])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-empire text-empire-gold text-sm tracking-widest uppercase">
            {isGlobal ? 'All Contracts' : 'Contracts'}
          </h2>
          <p className="text-empire-text-muted text-xs mt-0.5">
            {isGlobal
              ? 'Every employment, company & partner agreement across all units — search by title, party, ref, or employee'
              : 'Employment, company & partner agreements — viewable in one place'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="px-4 py-2 bg-empire-gold-dim border border-empire-gold/30 text-empire-gold text-xs uppercase tracking-widest rounded hover:bg-empire-gold/20 transition-colors"
        >
          + Add contract
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Segmented label="Type" value={type} options={TYPES} onChange={v => setType(v as any)} accent={accent} />
        <Segmented label="Status" value={status} options={STATUSES} onChange={v => setStatus(v as any)} accent={accent} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={isGlobal ? 'Search title / party / ref / employee…' : 'Search title / party / ref…'}
          className="empire-input text-xs py-1.5 ml-auto min-w-[200px]"
        />
      </div>

      {showForm && (
        <ContractForm
          departmentSlug={departmentSlug}
          prefillEmployeeId={prefillEmployeeId ?? undefined}
          onCreated={() => { setShowForm(false); onConsumePrefill?.(); setPage(0); load() }}
          onCancel={() => { setShowForm(false); onConsumePrefill?.() }}
        />
      )}

      {editing && (
        <ContractForm
          departmentSlug={departmentSlug}
          contract={editing}
          onCreated={() => { setEditing(null); load() }}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-empire-text-muted text-sm animate-pulse">Loading contracts…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="document"
          title="No contracts yet"
          hint={
            type !== 'all' || status !== 'all' || q
              ? 'No contracts match these filters.'
              : 'Add employment, company, or partner agreements and they’ll be viewable here. Attach a document link so anyone can open the full contract.'
          }
        />
      ) : (
        <div className="space-y-2">
          {rows.map(c => (
            <div
              key={c.id}
              onClick={() => setViewing(c)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') setViewing(c) }}
              className="w-full cursor-pointer text-left bg-empire-surface border border-empire-border rounded-lg p-4 hover:border-empire-gold/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <EmpireIcon name={TYPE_ICON[c.type] || 'document'} size={14} className="text-empire-gold-muted" />
                    <span className="text-empire-text text-sm font-medium truncate">{c.title}</span>
                    <span className={`px-2 py-0.5 text-xs rounded border ${STATUS_STYLE[c.status] || 'text-empire-text-muted border-empire-border'}`}>
                      {c.status}
                    </span>
                    {c.fileUrl && <span className="text-xs text-empire-gold-muted inline-flex items-center gap-1"><EmpireIcon name="document" size={11} /> document</span>}
                    {(() => { const e = expiryState(c.endDate, c.status); return e
                      ? <span className={`px-2 py-0.5 text-xs rounded border ${e.cls} inline-flex items-center gap-1`}><EmpireIcon name="clock" size={11} /> {e.label}</span>
                      : null })()}
                  </div>
                  <div className="text-empire-text-dim text-xs flex items-center gap-3 flex-wrap">
                    <span className="capitalize">{c.type}</span>
                    {isGlobal && c.department && (
                      <span className="inline-flex items-center gap-1 text-empire-gold-muted">
                        <EmpireIcon name={deptIcon(c.department.slug)} size={11} /> {c.department.name}
                      </span>
                    )}
                    {c.counterparty && <span>· {c.counterparty}</span>}
                    {c.employee && <span>· {c.employee.name}</span>}
                    {c.refId && <span className="font-mono bg-empire-elevated px-1.5 py-0.5 rounded">{c.refId}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {(c.startDate || c.endDate) && (
                    <div className="text-xs text-empire-text-dim text-right">
                      {c.startDate && format(new Date(c.startDate), 'MMM d, yyyy')}
                      {c.endDate && <> → {format(new Date(c.endDate), 'MMM d, yyyy')}</>}
                    </div>
                  )}
                  <RowActions
                    onView={() => setViewing(c)}
                    onEdit={() => setEditing(c)}
                    onDelete={() => removeContract(c)}
                    deleteLabel={`contract “${c.title}”`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} pageCount={totalPages} total={total} onPage={setPage} accent={accent} />

      {viewing && (
        <ContractViewer
          contract={viewing}
          onClose={() => setViewing(null)}
          onDeleted={() => { setViewing(null); load() }}
        />
      )}
    </div>
  )
}

function Segmented({ label, value, options, onChange, accent }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void; accent: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-empire-text-dim">{label}</span>
      <div className="flex border border-empire-border rounded overflow-hidden">
        {options.map(o => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className="px-2.5 py-1 text-xs capitalize transition-colors"
            style={value === o
              ? { background: accent, color: '#0a0a0a' }
              : { color: 'var(--empire-text-muted, #8a8a8a)' }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

// One immutable version snapshot from the contract's version-control history.
type ContractVersion = {
  id: string; version: number; title: string; status: string; counterparty: string | null
  refId: string | null; value: number | null; currency: string; changeSummary: string | null
  createdAt: string
}

function ContractViewer({ contract, onClose, onDeleted }: {
  contract: Contract; onClose: () => void; onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [versions, setVersions] = useState<ContractVersion[]>([])
  const [versionsLoading, setVersionsLoading] = useState(true)
  useEffect(() => {
    setVersionsLoading(true)
    fetcher(`/api/contracts/${contract.id}/versions`)
      .then((v: ContractVersion[]) => setVersions(Array.isArray(v) ? v : []))
      .catch(() => setVersions([]))
      .finally(() => setVersionsLoading(false))
  }, [contract.id])
  async function remove() {
    if (!confirm(`Delete contract “${contract.title}”? This cannot be undone.`)) return
    setDeleting(true)
    try { await del(`/api/contracts/${contract.id}`); onDeleted() }
    catch (e) { console.error(e); setDeleting(false) }
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-empire-text-dim mb-0.5">{label}</div>
      <div className="text-empire-text text-sm">{children}</div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-empire-deep border border-empire-border rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-empire-deep/95 backdrop-blur border-b border-empire-border px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <EmpireIcon name={TYPE_ICON[contract.type] || 'document'} size={16} className="text-empire-gold-muted" />
              <h3 className="font-empire text-empire-gold text-base">{contract.title}</h3>
            </div>
            <div className="text-empire-text-dim text-xs mt-1 capitalize">{contract.type} contract · {contract.status}</div>
          </div>
          <button onClick={onClose} className="text-empire-text-muted hover:text-empire-text leading-none"><EmpireIcon name="close" size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Lifecycle stepper (§5): draft → review → approval → signed → archived.
              Off-ramp states (active/expired/terminated) show as a trailing chip. */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-empire-text-dim mb-2">Lifecycle</div>
            <div className="flex items-center flex-wrap gap-x-1 gap-y-2">
              {LIFECYCLE_PIPELINE.map((s, i) => {
                const idx = LIFECYCLE_PIPELINE.indexOf(contract.status as typeof LIFECYCLE_PIPELINE[number])
                const onPipeline = idx >= 0
                const done = onPipeline && i < idx
                const current = onPipeline && i === idx
                return (
                  <span key={s} className="flex items-center gap-1">
                    <span className={`px-2 py-0.5 text-[11px] rounded border capitalize ${
                      current ? 'bg-empire-gold-dim border-empire-gold/50 text-empire-gold'
                        : done ? 'border-empire-green/40 text-empire-green-bright'
                        : 'border-empire-border text-empire-text-dim'}`}>{s}</span>
                    {i < LIFECYCLE_PIPELINE.length - 1 && (
                      <EmpireIcon name="chevron-right" size={12} className={done ? 'text-empire-green/50' : 'text-empire-text-dim'} />
                    )}
                  </span>
                )
              })}
              {!LIFECYCLE_PIPELINE.includes(contract.status as typeof LIFECYCLE_PIPELINE[number]) && (
                <span className={`ml-2 px-2 py-0.5 text-[11px] rounded border capitalize ${STATUS_STYLE[contract.status] || 'border-empire-border text-empire-text-dim'}`}>{contract.status}</span>
              )}
            </div>
            {contract.approvalRequestId && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-empire-gold">
                <EmpireIcon name="shield" size={12} className="text-empire-gold-muted" />
                Linked approval raised — awaiting the Throne.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {contract.counterparty && <Field label="Counterparty">{contract.counterparty}</Field>}
            {contract.employee && <Field label="Employee">{contract.employee.name} · {contract.employee.role}</Field>}
            {contract.createdBy && <Field label="Owner (earns XP on signing)">{contract.createdBy.name} · {contract.createdBy.role}</Field>}
            {contract.signedAt && <Field label="Signed">{format(new Date(contract.signedAt), 'MMM d, yyyy')}</Field>}
            {contract.department && <Field label="Department"><span className="inline-flex items-center gap-1.5"><EmpireIcon name={deptIcon(contract.department.slug)} size={14} className="text-empire-gold-muted" /> {contract.department.name}</span></Field>}
            {contract.refId && <Field label="Reference"><span className="font-mono">{contract.refId}</span></Field>}
            {contract.startDate && <Field label="Start">{format(new Date(contract.startDate), 'MMM d, yyyy')}</Field>}
            {contract.endDate && <Field label="End">{format(new Date(contract.endDate), 'MMM d, yyyy')}</Field>}
            {contract.value != null && <Field label="Value">{contract.currency} {contract.value.toLocaleString()}</Field>}
          </div>

          {contract.notes && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-empire-text-dim mb-1">Notes</div>
              <p className="text-empire-text-muted text-sm leading-relaxed whitespace-pre-wrap">{contract.notes}</p>
            </div>
          )}

          {/* Document viewer */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-empire-text-dim mb-2">Document</div>
            {contract.fileUrl ? (
              <div className="space-y-2">
                <a
                  href={contract.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-empire-gold-dim border border-empire-gold/30 text-empire-gold text-xs uppercase tracking-widest rounded hover:bg-empire-gold/20 transition-colors"
                >
                  <EmpireIcon name="document" size={12} /> Open document
                </a>
                {(/\.(pdf|png|jpe?g|gif|webp)($|\?)/i.test(contract.fileUrl) || contract.fileUrl.startsWith('data:')) && (
                  <iframe src={contract.fileUrl} title="Contract document" className="w-full h-80 rounded-lg border border-empire-border bg-empire-void" />
                )}
              </div>
            ) : (
              <div className="text-empire-text-dim text-xs italic border border-dashed border-empire-border rounded-lg p-4 text-center">
                No document attached yet. Add a file link to make the full contract viewable.
              </div>
            )}
          </div>

          {/* Version control — immutable snapshot history (every save = new version) */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-empire-text-dim mb-2 flex items-center gap-1.5">
              <EmpireIcon name="clock" size={12} className="text-empire-gold-muted" /> Version history
            </div>
            {versionsLoading ? (
              <div className="text-empire-text-dim text-xs italic">Loading versions…</div>
            ) : versions.length === 0 ? (
              <div className="text-empire-text-dim text-xs italic border border-dashed border-empire-border rounded-lg p-3 text-center">
                No prior versions yet — this is the original.
              </div>
            ) : (
              <ol className="relative border-l border-empire-border ml-1.5 space-y-3">
                {versions.map((v) => (
                  <li key={v.id} className="ml-4">
                    <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-empire-gold/70 border border-empire-gold" />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-mono text-empire-gold">v{v.version}</span>
                      <span className="text-[10px] uppercase tracking-wider text-empire-text-dim">{format(new Date(v.createdAt), 'MMM d, yyyy · HH:mm')}</span>
                    </div>
                    <div className="text-sm text-empire-text-muted mt-0.5">{v.changeSummary || 'Snapshot'}</div>
                    <div className="text-[11px] text-empire-text-dim mt-0.5 flex flex-wrap gap-x-3">
                      <span>Status: <span className="capitalize">{v.status}</span></span>
                      {v.counterparty && <span>Party: {v.counterparty}</span>}
                      {v.value != null && <span>{v.currency} {v.value.toLocaleString()}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="border-t border-empire-border px-6 py-3 flex justify-end">
          <button
            onClick={remove}
            disabled={deleting}
            className="text-xs px-3 py-1.5 border border-empire-red/30 text-empire-red-bright rounded hover:bg-empire-red/10 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Render generated-contract markdown into a viewable data: URL the contract viewer
// iframe can display, so a Legal-sourced contract is never a dead-end link.
function markdownToDataUrl(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = `<!doctype html><meta charset="utf-8"><style>body{font-family:Georgia,'Times New Roman',serif;background:#0b0b0d;color:#e8e2d0;padding:40px;line-height:1.7;max-width:760px;margin:0 auto}h1,h2,h3{font-family:Georgia,serif;color:#c9a233}pre{white-space:pre-wrap;font-family:inherit;font-size:14px}</style><pre>${esc(md)}</pre>`
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html)
}

function ContractForm({ departmentSlug, contract, prefillEmployeeId, onCreated, onCancel }: {
  departmentSlug?: string; contract?: Contract; prefillEmployeeId?: string; onCreated: () => void; onCancel: () => void
}) {
  const isEdit = !!contract
  const toDateInput = (s: string | null) => (s ? s.slice(0, 10) : '')
  const [f, setF] = useState({
    type: contract?.type ?? (prefillEmployeeId ? 'employee' : 'employee'),
    title: contract?.title ?? '',
    counterparty: contract?.counterparty ?? '',
    refId: contract?.refId ?? '',
    status: contract?.status ?? 'draft',
    startDate: toDateInput(contract?.startDate ?? null),
    endDate: toDateInput(contract?.endDate ?? null),
    fileUrl: contract?.fileUrl ?? '',
    value: contract?.value != null ? String(contract.value) : '',
    notes: contract?.notes ?? '',
    employeeId: contract?.employee?.id ?? prefillEmployeeId ?? '',
    createdById: contract?.createdBy?.id ?? prefillEmployeeId ?? '',
    templateKey: contract?.templateKey ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  // People-Ops (global) contract creation auto-routes to the Legal workflow: on save
  // the API generates the agreement document from a Legal template and links it back.
  const peopleOps = !departmentSlug
  const [routeToLegal, setRouteToLegal] = useState(peopleOps && !isEdit)
  const [routeTemplateKey, setRouteTemplateKey] = useState('')
  const [docSource, setDocSource] = useState<'upload' | 'legal'>(contract?.templateKey ? 'legal' : 'upload')
  const [legalDocs, setLegalDocs] = useState<LegalDoc[]>([])
  const [templates, setTemplates] = useState<LegalTemplate[]>([])
  const [genOpen, setGenOpen] = useState(false)
  const [genTemplateKey, setGenTemplateKey] = useState('')
  const [genCounterparty, setGenCounterparty] = useState('')
  const [generating, setGenerating] = useState(false)

  // Roster that drives the "Employee" + "Owner (earns XP)" pickers. Scoped to this
  // unit normally; in People-Ops (global) mode it spans every unit so a contract can
  // be created for anyone, and the person's unit is stamped onto the contract.
  useEffect(() => {
    fetcher(`/api/employees${departmentSlug ? `?department=${departmentSlug}` : ''}`)
      .then((rows: (Person & { department?: { slug: string } })[]) =>
        setPeople(rows.map(r => ({ id: r.id, name: r.name, role: r.role, departmentSlug: r.department?.slug }))))
      .catch(() => setPeople([]))
  }, [departmentSlug])

  // Existing Legal documents + templates — for "choose from the contracts in Legal".
  useEffect(() => {
    if (docSource !== 'legal' && !routeToLegal) return
    if (docSource === 'legal') fetcher('/api/legal/documents?pageSize=100').then((r: any) => setLegalDocs(r.data ?? r ?? [])).catch(() => setLegalDocs([]))
    fetcher('/api/legal/templates?pageSize=100&active=true').then((r: any) => setTemplates(r.data ?? r ?? [])).catch(() => setTemplates([]))
  }, [docSource, routeToLegal])

  async function attachExisting(id: string) {
    if (!id) return
    try {
      const doc: LegalDoc = await fetcher(`/api/legal/documents/${id}`)
      setF(prev => ({
        ...prev,
        title: prev.title || doc.title,
        counterparty: prev.counterparty || doc.counterparty || '',
        refId: doc.id,
        templateKey: doc.templateKey,
        fileUrl: doc.renderedMarkdown ? markdownToDataUrl(doc.renderedMarkdown) : prev.fileUrl,
      }))
    } catch (e) { console.error(e) }
  }

  // "Creating one pops a Legal modal in-place" — generate a fresh document from a
  // template right here, then attach it without leaving the contract form.
  async function generateFromTemplate() {
    if (!genTemplateKey) return
    setGenerating(true)
    try {
      const doc: LegalDoc = await post('/api/legal/generate', {
        templateKey: genTemplateKey,
        counterparty: genCounterparty || f.counterparty || undefined,
        params: {},
      })
      const full: LegalDoc = doc.renderedMarkdown ? doc : await fetcher(`/api/legal/documents/${doc.id}`)
      setF(prev => ({
        ...prev,
        title: prev.title || full.title,
        counterparty: prev.counterparty || full.counterparty || genCounterparty || '',
        refId: full.id,
        templateKey: full.templateKey,
        fileUrl: full.renderedMarkdown ? markdownToDataUrl(full.renderedMarkdown) : prev.fileUrl,
      }))
      setGenOpen(false); setGenCounterparty(''); setGenTemplateKey('')
    } catch (e) { console.error(e) } finally { setGenerating(false) }
  }

  async function submit() {
    if (!f.title) return
    setSaving(true)
    // In global (People Ops) mode the unit is inferred from the chosen employee/owner,
    // so a centrally-created contract still lands in the right unit's Contracts list.
    const inferredSlug = departmentSlug
      ?? people.find(p => p.id === (f.employeeId || f.createdById))?.departmentSlug
    const body = {
      type: f.type,
      title: f.title,
      counterparty: f.counterparty || undefined,
      refId: f.refId || undefined,
      status: f.status,
      startDate: f.startDate || undefined,
      endDate: f.endDate || undefined,
      fileUrl: f.fileUrl || undefined,
      value: f.value ? Number(f.value) : undefined,
      notes: f.notes || undefined,
      employeeId: f.employeeId || undefined,
      createdById: f.createdById || undefined,
      templateKey: f.templateKey || undefined,
      departmentSlug: inferredSlug,
      // Auto-route to Legal on creation (People-Ops origin) — the API generates the
      // agreement from this template and links the resulting GeneratedDocument.
      routeToLegal: !isEdit && routeToLegal ? true : undefined,
      legalTemplateKey: !isEdit && routeToLegal ? (routeTemplateKey || undefined) : undefined,
    }
    try {
      if (isEdit && contract) await patch(`/api/contracts/${contract.id}`, body)
      else await post('/api/contracts', body)
      onCreated()
    } catch (e) { console.error(e); setSaving(false) }
  }

  return (
    <div className="bg-empire-surface border border-empire-gold/20 rounded-lg p-5 space-y-4">
      <h4 className="font-empire text-empire-gold text-sm">{isEdit ? 'Edit contract' : 'New contract'}</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="empire-label">Type</label>
          <select value={f.type} onChange={e => setF({ ...f, type: e.target.value as 'employee' | 'company' | 'partner' })} className="empire-input w-full mt-1">
            {['employee', 'company', 'partner'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="empire-label">Status</label>
          {/* Lifecycle gate: when editing, only the current state + its legal next
              moves are offered (the API rejects illegal jumps). On create, any
              entry state is allowed (e.g. recording an already-active contract). */}
          <select value={f.status} onChange={e => setF({ ...f, status: e.target.value })} className="empire-input w-full mt-1">
            {(isEdit && contract
              ? [contract.status, ...(LIFECYCLE_NEXT[contract.status] ?? [])]
              : ['draft', 'review', 'signed', 'active', 'expired', 'terminated']
            ).map(s => <option key={s} value={s}>{s}{isEdit && contract && s === contract.status ? ' (current)' : ''}</option>)}
          </select>
        </div>
        <input placeholder="Title *" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="col-span-2 empire-input" />
        <input placeholder="Counterparty (person / company / partner)" value={f.counterparty} onChange={e => setF({ ...f, counterparty: e.target.value })} className="empire-input" />
        <input placeholder="Reference #" value={f.refId} onChange={e => setF({ ...f, refId: e.target.value })} className="empire-input" />

        {/* Employment contract → tie to a person in this unit (findable here) + the owner who earns XP on signing */}
        <div>
          <label className="empire-label">Employee {f.type === 'employee' && <span className="text-empire-gold-muted">({departmentSlug ? 'this unit' : 'any unit'})</span>}</label>
          <select value={f.employeeId} onChange={e => setF({ ...f, employeeId: e.target.value })} className="empire-input w-full mt-1">
            <option value="">— none —</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name} · {p.role}{!departmentSlug && p.departmentSlug ? ` · ${p.departmentSlug}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="empire-label">Owner — earns XP when signed</label>
          <select value={f.createdById} onChange={e => setF({ ...f, createdById: e.target.value })} className="empire-input w-full mt-1">
            <option value="">— none —</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name} · {p.role}{!departmentSlug && p.departmentSlug ? ` · ${p.departmentSlug}` : ''}</option>)}
          </select>
        </div>

        <div>
          <label className="empire-label">Start</label>
          <input type="date" value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value })} className="empire-input w-full mt-1" />
        </div>
        <div>
          <label className="empire-label">End</label>
          <input type="date" value={f.endDate} onChange={e => setF({ ...f, endDate: e.target.value })} className="empire-input w-full mt-1" />
        </div>
        <input placeholder="Value (number)" type="number" value={f.value} onChange={e => setF({ ...f, value: e.target.value })} className="empire-input" />
        <textarea placeholder="Notes" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} rows={2} className="col-span-2 empire-input resize-none" />
      </div>

      {/* Document: drag-drop a PDF/PNG, OR pick from Legal (existing or generate new) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2">
          <span className="empire-label">Document</span>
          <div className="flex border border-empire-border rounded overflow-hidden text-xs">
            {(['upload', 'legal'] as const).map(s => (
              <button key={s} type="button" onClick={() => setDocSource(s)}
                className="px-3 py-1 capitalize transition-colors"
                style={docSource === s ? { background: '#c9a233', color: '#0a0a0a' } : { color: 'var(--empire-text-muted, #8a8a8a)' }}>
                {s === 'upload' ? 'Upload file' : 'From Legal'}
              </button>
            ))}
          </div>
        </div>

        {docSource === 'upload' ? (
          <FileDrop value={f.fileUrl} onChange={v => setF({ ...f, fileUrl: v, templateKey: '' })} />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <select
                className="empire-input flex-1 text-xs"
                value={f.refId && f.templateKey ? f.refId : ''}
                onChange={e => attachExisting(e.target.value)}
              >
                <option value="">— choose an existing Legal document —</option>
                {legalDocs.map(d => <option key={d.id} value={d.id}>{d.title}{d.counterparty ? ` · ${d.counterparty}` : ''} ({d.status})</option>)}
              </select>
              <button type="button" onClick={() => setGenOpen(o => !o)} className="text-xs px-3 py-2 border border-empire-gold/30 text-empire-gold rounded hover:bg-empire-gold/10 whitespace-nowrap">
                + Generate new
              </button>
            </div>
            {f.fileUrl && f.templateKey && (
              <p className="text-[11px] text-empire-green-bright">Attached Legal document · ref {f.refId}</p>
            )}
            {genOpen && (
              <div className="bg-empire-elevated border border-empire-gold/20 rounded-lg p-3 space-y-2">
                <div className="text-xs text-empire-text-muted">Generate a contract from a Legal template, then attach it here.</div>
                <select className="empire-input w-full text-xs" value={genTemplateKey} onChange={e => setGenTemplateKey(e.target.value)}>
                  <option value="">— choose a template —</option>
                  {templates.map(t => <option key={t.id} value={t.key}>{t.name} · {t.category}</option>)}
                </select>
                <input className="empire-input w-full text-xs" placeholder="Counterparty (optional)" value={genCounterparty} onChange={e => setGenCounterparty(e.target.value)} />
                <div className="flex gap-2">
                  <button type="button" onClick={generateFromTemplate} disabled={!genTemplateKey || generating} className="empire-btn-primary text-xs disabled:opacity-50">
                    {generating ? 'Generating…' : 'Generate & attach'}
                  </button>
                  <button type="button" onClick={() => setGenOpen(false)} className="text-xs px-3 py-1.5 text-empire-text-muted hover:text-empire-text">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auto-route to Legal — when a contract is created from People Ops, the agreement
          document is generated in the Legal workflow and linked back automatically. */}
      {!isEdit && (
        <div className="bg-empire-elevated border border-empire-gold/15 rounded-lg p-3 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={routeToLegal} onChange={e => setRouteToLegal(e.target.checked)} className="accent-empire-gold" />
            <span className="text-xs text-empire-text flex items-center gap-1.5">
              <EmpireIcon name="handshake" size={13} className="text-empire-gold-muted" /> Route to Legal workflow on creation
            </span>
          </label>
          {routeToLegal && (
            <div className="pl-6 space-y-1">
              <select className="empire-input w-full text-xs" value={routeTemplateKey} onChange={e => setRouteTemplateKey(e.target.value)}>
                <option value="">— auto-select agreement template —</option>
                {templates.map(t => <option key={t.id} value={t.key}>{t.name} · {t.category}</option>)}
              </select>
              <p className="text-[11px] text-empire-text-dim">Legal generates the agreement document and links it to this contract.</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={submit} disabled={saving || !f.title} className="empire-btn-primary disabled:opacity-50">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create contract'}
        </button>
        <button onClick={onCancel} className="text-xs px-4 py-2 text-empire-text-muted hover:text-empire-text">Cancel</button>
      </div>
    </div>
  )
}
