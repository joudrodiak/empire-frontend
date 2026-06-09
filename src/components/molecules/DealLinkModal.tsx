'use client'
import React, { useEffect, useState } from 'react'
import { Modal } from '@/components/molecules/Modal'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { fetcher, patch } from '@/lib/api'

/**
 * DealLinkModal — the cross-referencing surface. A co-sell deal can be soft-linked
 * to any of the 11 Units and an entity within it. The picker loads the canonical
 * options from GET /api/deals/links/options, lets the user choose a target Unit,
 * entity type (suggested per-Unit), and an optional entity id, then persists via
 * PATCH /api/deals/:id/link. Clearing the Unit removes the cross-reference.
 *
 * NOTE: the partnerships co-sell deals live in the CoSellDeal table; the link
 * fields live on the Deal table behind /api/deals. We surface the link UI on the
 * co-sell rows so a partnerships user can cross-reference a deal to another Unit
 * — the dealId passed in is the deal record that carries the link columns.
 */
type LinkOptions = {
  units: { slug: string; label: string }[]
  entityTypes: Record<string, string>
}
export type DealLink = {
  id: string
  linkedUnitSlug?: string | null
  linkedEntityType?: string | null
  linkedEntityId?: string | null
}

const inputCls = 'w-full bg-empire-bg-soft border border-empire-border rounded px-2.5 py-2 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/60'

export function DealLinkModal({ open, deal, label, accent = '#C9A233', onClose, onLinked }: {
  open: boolean
  deal: DealLink | null
  label?: string
  accent?: string
  onClose: () => void
  onLinked?: () => void
}) {
  const [opts, setOpts] = useState<LinkOptions | null>(null)
  const [unit, setUnit] = useState('')
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    fetcher('/api/deals/links/options').then(setOpts).catch(console.error)
  }, [open])

  useEffect(() => {
    if (!open || !deal) return
    setUnit(deal.linkedUnitSlug || '')
    setEntityType(deal.linkedEntityType || '')
    setEntityId(deal.linkedEntityId || '')
  }, [open, deal])

  // When the unit changes, suggest its canonical entity type if one exists.
  useEffect(() => {
    if (!opts || !unit) return
    const suggested = opts.entityTypes[unit]
    if (suggested && !entityType) setEntityType(suggested)
  }, [unit, opts]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!deal) return null

  async function apply(clear = false) {
    setBusy(true)
    try {
      await patch(`/api/deals/${deal!.id}/link`, clear
        ? { linkedUnitSlug: null, linkedEntityType: null, linkedEntityId: null }
        : { linkedUnitSlug: unit || null, linkedEntityType: entityType || null, linkedEntityId: entityId || null })
      onLinked?.()
      onClose()
    } catch (e) { console.error(e) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Cross-link${label ? `: ${label}` : ' deal'}`} icon={<EmpireIcon name="link" size={18} />} width="max-w-md">
      <p className="text-xs text-empire-text-muted mb-4">
        Connect this deal to another Unit so the work shows up linked across the company.
        Pick a target Unit, an entity type, and (optionally) the specific entity id.
      </p>
      <div className="space-y-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-empire-text-dim">Target Unit</span>
          <select className={inputCls} value={unit} onChange={e => { setUnit(e.target.value); setEntityType('') }}>
            <option value="">— none —</option>
            {opts?.units.map(u => <option key={u.slug} value={u.slug}>{u.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-empire-text-dim">
            Entity type {unit && opts?.entityTypes[unit] ? `(suggested: ${opts.entityTypes[unit]})` : ''}
          </span>
          <input className={inputCls} placeholder="e.g. account, contract, campaign" value={entityType} onChange={e => setEntityType(e.target.value)} disabled={!unit} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-empire-text-dim">Entity id (optional)</span>
          <input className={inputCls} placeholder="paste the linked entity's id" value={entityId} onChange={e => setEntityId(e.target.value)} disabled={!unit} />
        </label>
      </div>
      <div className="mt-5 flex items-center justify-between gap-2">
        <button
          onClick={() => apply(true)}
          disabled={busy || !deal.linkedUnitSlug}
          className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-red-bright hover:text-empire-red disabled:opacity-30"
        >
          Clear link
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text disabled:opacity-50">Cancel</button>
          <button onClick={() => apply(false)} disabled={busy} className="rounded px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-50" style={{ background: accent }}>
            {busy ? 'Linking…' : 'Save link'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
