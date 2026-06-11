'use client'
import React, { useEffect, useState } from 'react'
import { Modal } from '@/components/molecules/Modal'
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'

/**
 * EntityFormModal — a reusable, field-driven view/edit dialog used across the
 * CRUD-B panels (Client Success, Partnerships, HR, Operations). Pass a list of
 * field descriptors and the current entity; in `view` mode it renders a clean
 * read-only detail sheet, in `edit` mode it renders the matching inputs and
 * PATCHes via the supplied `onSave`. Keeps every panel's edit UX consistent and
 * empire-styled without re-implementing forms each time.
 */
export type FieldType = 'text' | 'number' | 'select' | 'date' | 'textarea'
export type FieldDef = {
  key: string
  label: string
  type?: FieldType
  options?: { value: string; label: string }[]
  readOnly?: boolean        // shown in view, never editable
  render?: (v: any) => React.ReactNode  // custom view renderer
  format?: (v: any) => string           // value -> input string
  full?: boolean            // span full width
}

const inputCls = 'w-full bg-empire-bg-soft border border-empire-border rounded px-2.5 py-2 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/60'

export function EntityFormModal<T extends Record<string, any>>({
  open, mode, title, icon = 'pen', entity, fields, accent = '#c9a233', onClose, onSave,
}: {
  open: boolean
  mode: 'view' | 'edit'
  title: string
  icon?: IconName
  entity: T | null
  fields: FieldDef[]
  accent?: string
  onClose: () => void
  onSave?: (patch: Record<string, any>) => Promise<void> | void
}) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!entity) return
    const next: Record<string, string> = {}
    for (const f of fields) {
      const raw = entity[f.key]
      next[f.key] = f.format
        ? f.format(raw)
        : f.type === 'date'
          ? (raw ? String(raw).slice(0, 10) : '')
          : raw == null ? '' : String(raw)
    }
    setForm(next)
  }, [entity, open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!entity) return null

  async function save() {
    if (!onSave) return
    setBusy(true)
    const patch: Record<string, any> = {}
    for (const f of fields) {
      if (f.readOnly) continue
      const v = form[f.key]
      patch[f.key] = f.type === 'number' ? (v === '' ? null : Number(v)) : v === '' ? null : v
    }
    try { await onSave(patch) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} icon={<EmpireIcon name={icon} size={18} />} width="max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        {fields.map(f => {
          const span = f.full ? 'sm:col-span-2' : ''
          if (mode === 'view') {
            const raw = entity![f.key]
            return (
              <div key={f.key} className={`flex flex-col gap-0.5 border-b border-empire-border/50 pb-2 ${span}`}>
                <span className="text-[10px] uppercase tracking-[0.14em] text-empire-text-dim">{f.label}</span>
                <span className="text-sm text-empire-text">
                  {f.render ? f.render(raw) : raw == null || raw === '' ? '—' : String(raw)}
                </span>
              </div>
            )
          }
          if (f.readOnly) return null
          return (
            <label key={f.key} className={`flex flex-col gap-1 ${span}`}>
              <span className="text-[10px] uppercase tracking-[0.14em] text-empire-text-dim">{f.label}</span>
              {f.type === 'select' ? (
                <select className={inputCls} value={form[f.key] ?? ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}>
                  {(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea className={inputCls} rows={3} value={form[f.key] ?? ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              ) : (
                <input
                  className={inputCls}
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  value={form[f.key] ?? ''} placeholder={f.label}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </label>
          )
        })}
      </div>
      {mode === 'edit' && (
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text disabled:opacity-50">Cancel</button>
          <button onClick={save} disabled={busy} className="rounded px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-50" style={{ background: accent }}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </Modal>
  )
}
