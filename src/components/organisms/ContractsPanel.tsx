'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetcher, post, patch, del } from '@/lib/api'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
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
  createdAt: string
  department: { name: string; slug: string; icon: string; color: string } | null
  employee: { id: string; name: string; role: string } | null
}

const TYPES = ['all', 'employee', 'company', 'partner'] as const
const STATUSES = ['all', 'draft', 'signed', 'active', 'expired', 'terminated'] as const
const TYPE_ICON: Record<string, IconName> = { employee: 'user', company: 'briefcase', partner: 'handshake' }

const STATUS_STYLE: Record<string, string> = {
  active: 'text-empire-green-bright border-empire-green/40',
  signed: 'text-empire-green-bright border-empire-green/40',
  draft: 'text-empire-amber-bright border-empire-amber/40',
  expired: 'text-empire-text-dim border-empire-border',
  terminated: 'text-empire-text-dim border-empire-border',
}

const PAGE_SIZE = 10

export function ContractsPanel({ departmentSlug, accent = '#c9a233' }: {
  departmentSlug: string; accent?: string
}) {
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
        departmentSlug,
        page: String(page + 1),
        pageSize: String(PAGE_SIZE),
      })
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-empire text-empire-gold text-sm tracking-widest uppercase">Contracts</h2>
          <p className="text-empire-text-muted text-xs mt-0.5">
            Employment, company &amp; partner agreements — viewable in one place
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
          placeholder="Search title / party / ref…"
          className="empire-input text-xs py-1.5 ml-auto min-w-[200px]"
        />
      </div>

      {showForm && (
        <ContractForm
          departmentSlug={departmentSlug}
          onCreated={() => { setShowForm(false); setPage(0); load() }}
          onCancel={() => setShowForm(false)}
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
                  </div>
                  <div className="text-empire-text-dim text-xs flex items-center gap-3 flex-wrap">
                    <span className="capitalize">{c.type}</span>
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

function ContractViewer({ contract, onClose, onDeleted }: {
  contract: Contract; onClose: () => void; onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
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
          <div className="grid grid-cols-2 gap-4">
            {contract.counterparty && <Field label="Counterparty">{contract.counterparty}</Field>}
            {contract.employee && <Field label="Employee">{contract.employee.name} · {contract.employee.role}</Field>}
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
                {/\.(pdf|png|jpe?g|gif|webp)$/i.test(contract.fileUrl) && (
                  <iframe src={contract.fileUrl} title="Contract document" className="w-full h-80 rounded-lg border border-empire-border bg-empire-void" />
                )}
              </div>
            ) : (
              <div className="text-empire-text-dim text-xs italic border border-dashed border-empire-border rounded-lg p-4 text-center">
                No document attached yet. Add a file link to make the full contract viewable.
              </div>
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

function ContractForm({ departmentSlug, contract, onCreated, onCancel }: {
  departmentSlug: string; contract?: Contract; onCreated: () => void; onCancel: () => void
}) {
  const isEdit = !!contract
  const toDateInput = (s: string | null) => (s ? s.slice(0, 10) : '')
  const [f, setF] = useState({
    type: contract?.type ?? 'employee',
    title: contract?.title ?? '',
    counterparty: contract?.counterparty ?? '',
    refId: contract?.refId ?? '',
    status: contract?.status ?? 'draft',
    startDate: toDateInput(contract?.startDate ?? null),
    endDate: toDateInput(contract?.endDate ?? null),
    fileUrl: contract?.fileUrl ?? '',
    value: contract?.value != null ? String(contract.value) : '',
    notes: contract?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!f.title) return
    setSaving(true)
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
      departmentSlug,
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
          <select value={f.status} onChange={e => setF({ ...f, status: e.target.value })} className="empire-input w-full mt-1">
            {['draft', 'signed', 'active', 'expired', 'terminated'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <input placeholder="Title *" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="col-span-2 empire-input" />
        <input placeholder="Counterparty (person / company / partner)" value={f.counterparty} onChange={e => setF({ ...f, counterparty: e.target.value })} className="empire-input" />
        <input placeholder="Reference #" value={f.refId} onChange={e => setF({ ...f, refId: e.target.value })} className="empire-input" />
        <div>
          <label className="empire-label">Start</label>
          <input type="date" value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value })} className="empire-input w-full mt-1" />
        </div>
        <div>
          <label className="empire-label">End</label>
          <input type="date" value={f.endDate} onChange={e => setF({ ...f, endDate: e.target.value })} className="empire-input w-full mt-1" />
        </div>
        <input placeholder="Value (number)" type="number" value={f.value} onChange={e => setF({ ...f, value: e.target.value })} className="empire-input" />
        <input placeholder="Document URL (link to the file)" value={f.fileUrl} onChange={e => setF({ ...f, fileUrl: e.target.value })} className="empire-input" />
        <textarea placeholder="Notes" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} rows={2} className="col-span-2 empire-input resize-none" />
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving || !f.title} className="empire-btn-primary disabled:opacity-50">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create contract'}
        </button>
        <button onClick={onCancel} className="text-xs px-4 py-2 text-empire-text-muted hover:text-empire-text">Cancel</button>
      </div>
    </div>
  )
}
