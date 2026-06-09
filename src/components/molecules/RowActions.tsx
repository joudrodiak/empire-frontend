'use client'
import React, { useState } from 'react'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { Modal } from '@/components/molecules/Modal'

/**
 * RowActions — the standard view / edit / delete control set for any list row
 * or entity card (user spec: every entity must be viewable, editable, and
 * deletable, not add-only). Pass only the handlers you support; omit one to
 * hide that button. `onDelete` triggers a built-in confirm dialog.
 */
export function RowActions({ onView, onEdit, onDelete, deleteLabel = 'this item', size = 15 }: {
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void | Promise<void>
  deleteLabel?: string
  size?: number
}) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const btn = 'rounded-md p-1.5 text-empire-text-muted transition-all duration-200 hover:-translate-y-0.5 hover:bg-empire-elevated/70 disabled:pointer-events-none disabled:opacity-55'

  return (
    <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
      {onView && (
          <button onClick={onView} title="View" className={`${btn} hover:text-empire-text`}>
          <EmpireIcon name="eye" size={size} />
        </button>
      )}
      {onEdit && (
        <button onClick={onEdit} title="Edit" className={`${btn} hover:text-empire-gold`}>
          <EmpireIcon name="pen" size={size} />
        </button>
      )}
      {onDelete && (
          <button onClick={() => setConfirming(true)} title="Delete" disabled={busy} className={`${btn} hover:text-empire-red-bright`}>
          <EmpireIcon name="trash" size={size} />
        </button>
      )}

      <Modal open={confirming} onClose={() => !busy && setConfirming(false)} title="Confirm delete" icon={<EmpireIcon name="alert" size={18} />} width="max-w-sm">
        <p className="text-sm text-empire-text-muted">Delete <span className="text-empire-text">{deleteLabel}</span>? This cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setConfirming(false)} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted transition-all duration-200 hover:-translate-y-0.5 hover:text-empire-text disabled:pointer-events-none disabled:opacity-50">Cancel</button>
          <button
            onClick={async () => { setBusy(true); try { await onDelete?.() } finally { setBusy(false); setConfirming(false) } }}
            disabled={busy}
            className="rounded bg-empire-red/80 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-empire-text transition-all duration-200 hover:-translate-y-0.5 hover:bg-empire-red disabled:pointer-events-none disabled:opacity-50"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
