'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetcher, post, patch, del } from '@/lib/api'
import { KpiCard, Panel, DonutChart, DataTable, TabBar, Grid, EmptyState, type Column } from '@/lib/ui'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { Modal } from '@/components/molecules/Modal'
import { useStickyTab } from '@/lib/use-sticky-tab'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'

// Legal & Compliance — contract boilerplate generator.
// Templates carry {{token}} placeholders; generating fills them and derives
// deal pricing (numDevs × ratePerDev × (1 + markupPct/100)) entirely server-side
// from /api/legal/*. A generated contract can be viewed, exported (Markdown /
// print-to-PDF), edited & regenerated, and signed by both parties — the signed
// PDF is the document the counterparty actually executes.

const ACCENT = '#C9A233'   // legal purple, lifted for contrast on dark
const ACTIVE_COMPANY_KEY = 'empire-os-active-profile'
const eur = (n: number | null | undefined) =>
  n == null ? '—' : `${n < 0 ? '-' : ''}€${Math.abs(Math.round(n)).toLocaleString()}`

const CATEGORY_COLOR: Record<string, string> = {
  whitelabel: '#C9A233', software: '#C9A233', nda: '#C9A233', mou: '#C9A233', msa: '#c9a233', sow: '#C9A233',
}
function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide"
      style={{ color, background: color + '1a', border: `1px solid ${color}40` }}>
      {text}
    </span>
  )
}

type Page<T> = { data: T[]; page: number; pageSize: number; total: number; totalPages: number }
type Variable = { key: string; label: string; type: 'text' | 'number' | 'date' | 'textarea'; default?: string | number; help?: string }
type Template = { id: string; key: string; name: string; category: string; description?: string; bodyMarkdown: string; variables: Variable[]; jurisdiction: string; _count?: { documents: number } }
type Pricing = { numDevs: number; ratePerDev: number; markupPct: number; baseCost: number; clientPrice: number; margin: number; marginPct: number; annualClientPrice: number }
type Signature = { party: string; role: string; name: string; signedName: string | null; signedAt: string | null; email: string | null }
type Doc = {
  id: string; templateKey: string; title: string; counterparty: string | null; status: string
  params?: Record<string, any>; renderedMarkdown?: string; pricing: Pricing | null; signatures?: Signature[] | null
  createdBy: string; createdAt: string; template?: Template & { name: string; category: string }
}
type Summary = { templates: number; documents: number; signed: number; draft: number; sent: number; byStatus: { status: string; count: number }[] }
type CompanyMarks = { slug?: string; name: string; stampImageUrl?: string | null; stampEnabled?: boolean; confidentialWatermark?: boolean }

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'generate', label: 'Generate Contract' },
  { id: 'templates', label: 'Template Library' },
  { id: 'documents', label: 'Documents' },
]

/* ============ markdown → HTML (h1-3, bold, hr, lists, paragraphs) ============ */
function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function inlineMd(s: string) {
  // Unfilled [token] gaps are highlighted so a half-finished draft is obvious.
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([A-Za-z0-9_.]+)\]/g, '<span class="lg-gap">[$1]</span>')
}
function mdToHtml(md: string): string {
  const lines = (md || '').replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let para: string[] = []
  let list: string[] = []
  const flushPara = () => { if (para.length) { out.push(`<p>${inlineMd(para.join(' '))}</p>`); para = [] } }
  const flushList = () => { if (list.length) { out.push(`<ul>${list.map(li => `<li>${inlineMd(li)}</li>`).join('')}</ul>`); list = [] } }
  for (const raw of lines) {
    const line = raw.trimEnd()
    const t = line.trim()
    if (!t) { flushPara(); flushList(); continue }
    if (/^---+$/.test(t)) { flushPara(); flushList(); out.push('<hr/>'); continue }
    let m
    if ((m = t.match(/^###\s+(.*)$/))) { flushPara(); flushList(); out.push(`<h3>${inlineMd(m[1])}</h3>`); continue }
    if ((m = t.match(/^##\s+(.*)$/))) { flushPara(); flushList(); out.push(`<h2>${inlineMd(m[1])}</h2>`); continue }
    if ((m = t.match(/^#\s+(.*)$/))) { flushPara(); flushList(); out.push(`<h1>${inlineMd(m[1])}</h1>`); continue }
    if ((m = t.match(/^[-*]\s+(.*)$/))) { flushPara(); list.push(m[1]); continue }
    flushList(); para.push(t)
  }
  flushPara(); flushList()
  return out.join('\n')
}

const CONTRACT_CSS = `
  .lg-prose{color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;line-height:1.6;font-size:13.5px}
  .lg-prose h1{font-size:20px;font-weight:700;text-align:center;letter-spacing:.04em;margin:0 0 18px;text-transform:uppercase}
  .lg-prose h2{font-size:14px;font-weight:700;margin:18px 0 6px;border-bottom:1px solid #e2e2e2;padding-bottom:3px}
  .lg-prose h3{font-size:12.5px;font-weight:700;margin:12px 0 4px}
  .lg-prose p{margin:0 0 9px}
  .lg-prose ul{margin:0 0 9px 18px;padding:0}
  .lg-prose li{margin:0 0 3px}
  .lg-prose hr{border:0;border-top:1px solid #ddd;margin:16px 0}
  .lg-prose strong{font-weight:700}
  .lg-gap{background:#fff3cd;color:#7A7468;padding:0 3px;border-radius:2px;font-style:italic}
`

// Signature block rendered into the printable/exportable contract.
function signaturesHtml(sigs: Signature[] | null | undefined): string {
  const parties = sigs && sigs.length ? sigs : [
    { role: 'Provider', name: 'Cregen AI Ltd', signedName: null, signedAt: null },
    { role: 'Counterparty', name: '', signedName: null, signedAt: null },
  ] as any
  const cell = (s: any) => `
    <td style="width:50%;vertical-align:top;padding:0 18px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:26px">${escapeHtml(s.role)}</div>
      <div style="border-top:1px solid #333;padding-top:4px;min-height:20px;font-style:italic">${s.signedName ? escapeHtml(s.signedName) : '&nbsp;'}</div>
      <div style="font-size:11px;color:#444;margin-top:2px">Name: <strong>${escapeHtml(s.name || '________________')}</strong></div>
      <div style="font-size:11px;color:#444">Date: ${s.signedAt ? new Date(s.signedAt).toLocaleDateString() : '________________'}</div>
    </td>`
  return `
    <div style="margin-top:34px;page-break-inside:avoid">
      <div style="font-size:14px;font-weight:700;border-bottom:1px solid #e2e2e2;padding-bottom:3px;margin-bottom:18px">Signatures</div>
      <table style="width:100%;border-collapse:collapse"><tr>${parties.map(cell).join('')}</tr></table>
    </div>`
}

function exportFilename(d: Doc, ext: string) {
  return (d.title || 'contract').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() + '.' + ext
}
function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
// Print / Save-as-PDF: open a clean letterhead window and invoke the browser's
// print engine. This is the actual signable, shareable document.
function printContract(d: Doc, marks?: CompanyMarks | null) {
  const w = window.open('', '_blank', 'width=860,height=1000')
  if (!w) return
  const body = mdToHtml(d.renderedMarkdown || '')
  const acv = d.pricing ? eur(d.pricing.annualClientPrice) : null
  const stamp = marks?.stampEnabled && marks.stampImageUrl
    ? `<img class="stamp" src="${escapeHtml(marks.stampImageUrl)}" alt="Company stamp" />`
    : ''
  const watermark = marks?.confidentialWatermark ? '<div class="wm">CONFIDENTIAL</div>' : ''
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(d.title)}</title>
    <style>
      @page{margin:22mm 20mm}
      body{margin:0;background:#fff}
      .wrap{max-width:720px;margin:0 auto;padding:28px}
      .lh{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1a1a1a;padding-bottom:8px;margin-bottom:22px;font-family:Georgia,serif}
      .lh .co{font-size:18px;font-weight:700;letter-spacing:.02em}
      .lh .meta{font-size:10px;color:#777;text-align:right}
      .stamp{position:fixed;right:26px;bottom:24px;max-width:116px;max-height:116px;filter:grayscale(1);opacity:.34;z-index:2}
      .wm{position:fixed;inset:0;display:grid;place-items:center;transform:rotate(-34deg);font:700 72px Arial,sans-serif;letter-spacing:.18em;color:rgba(0,0,0,.055);z-index:0;pointer-events:none}
      .wrap{position:relative;z-index:1}
      ${CONTRACT_CSS}
    </style></head><body>${watermark}${stamp}<div class="wrap">
      <div class="lh"><div class="co">${escapeHtml(marks?.name || 'Cregen AI Ltd')}</div><div class="meta">${escapeHtml(d.template?.name || d.templateKey)}${acv ? ' · ACV ' + acv : ''}<br/>Status: ${escapeHtml(d.status)}</div></div>
      <div class="lg-prose">${body}</div>
      ${signaturesHtml(d.signatures)}
    </div>
    <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
    </body></html>`)
  w.document.close()
}

export function LegalPanel() {
  const [tab, setTab] = useStickyTab('legal', 'overview')
  const [refresh, setRefresh] = useState(0)
  const [viewId, setViewId] = useState<string | null>(null)
  const bump = () => setRefresh(r => r + 1)
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-empire text-sm tracking-widest uppercase" style={{ color: ACCENT }}>
            <EmpireIcon name={deptIcon('legal')} size={16} style={{ color: ACCENT }} />
            Legal &amp; Compliance
          </h3>
          <p className="text-empire-text-muted text-xs mt-0.5">Boilerplate generator · white-label, software, NDA, MOU, MSA &amp; SOW — priced per developer, exportable to PDF and signable by both parties.</p>
        </div>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} accent={ACCENT} />
      {tab === 'overview' && <Overview key={refresh} />}
      {tab === 'generate' && <Generate onSaved={(id) => { bump(); setTab('documents'); if (id) setViewId(id) }} />}
      {tab === 'templates' && <Templates />}
      {tab === 'documents' && <Documents key={refresh} onView={setViewId} />}
      {viewId && <DocumentViewer id={viewId} onClose={() => setViewId(null)} onChanged={bump} />}
    </div>
  )
}

function useLegal<T>(path: string): { data: T | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    setLoading(true)
    fetcher(`/api/legal/${path}`).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [path])
  useEffect(() => { reload() }, [reload])
  return { data, loading, reload }
}

function Loading() { return <div className="py-16 text-center text-empire-text-dim text-sm animate-pulse">Loading contracts…</div> }

/* ---------------- Overview ---------------- */
function Overview() {
  const { data: s, loading } = useLegal<Summary>('summary')
  if (loading) return <Loading />
  if (!s) return <EmptyState icon="scales" title="No legal data" hint="Generate a contract to begin." />
  const segs = s.byStatus.map(b => ({
    label: b.status, value: b.count,
    color: b.status === 'signed' ? '#C9A233' : b.status === 'sent' ? '#c9a233' : b.status === 'void' ? '#F4EFE3' : ACCENT,
  }))
  return (
    <div className="space-y-6">
      <Grid cols={5}>
        <KpiCard label="Active Templates" value={String(s.templates)} accent={ACCENT} icon="book" />
        <KpiCard label="Documents" value={String(s.documents)} accent="#C9A233" icon="document" />
        <KpiCard label="Signed" value={String(s.signed)} accent="#C9A233" icon="check" />
        <KpiCard label="Sent" value={String(s.sent)} accent="#c9a233" icon="external" />
        <KpiCard label="Drafts" value={String(s.draft)} accent={ACCENT} icon="pen-nib" />
      </Grid>
      <Panel title="Documents by Status" icon="chart-bar">
        {segs.length === 0
          ? <EmptyState icon="document" title="No documents yet" hint="Generate your first contract." />
          : (
            <div className="flex items-center gap-8 py-2">
              <DonutChart segments={segs} size={150} />
              <div className="space-y-2">
                {segs.map(g => (
                  <div key={g.label} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
                    <span className="text-empire-text capitalize w-16">{g.label}</span>
                    <span className="tabular-nums text-empire-text-muted">{g.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
      </Panel>
    </div>
  )
}

/* ---------------- Generate ---------------- */
function Generate({ onSaved }: { onSaved: (id?: string) => void }) {
  const { data: tpls } = useLegal<Page<Template>>('templates?pageSize=50&active=true')
  const templates = tpls?.data || []
  const [selKey, setSelKey] = useState<string>('')
  const selected = useMemo(() => templates.find(t => t.key === selKey) || null, [templates, selKey])
  const [params, setParams] = useState<Record<string, any>>({})
  const [counterparty, setCounterparty] = useState('')
  const [title, setTitle] = useState('')
  const [preview, setPreview] = useState<{ renderedMarkdown: string; pricing: Pricing | null } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!selected) { setParams({}); setPreview(null); return }
    const seed: Record<string, any> = {}
    for (const v of selected.variables) if (v.default !== undefined) seed[v.key] = v.default
    setParams(seed)
    setTitle('')
  }, [selKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected) return
    const id = setTimeout(() => {
      post('/api/legal/preview', { templateKey: selected.key, params })
        .then((d: any) => setPreview(d)).catch(console.error)
    }, 350)
    return () => clearTimeout(id)
  }, [selKey, params]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string, v: any) => setParams(p => ({ ...p, [k]: v }))

  const generate = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const doc: any = await post('/api/legal/generate', {
        templateKey: selected.key, params,
        counterparty: counterparty || params.clientName || null,
        title: title || undefined,
      })
      onSaved(doc?.id)
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const inputCls = 'w-full bg-empire-bg border border-empire-border rounded px-2.5 py-1.5 text-sm text-empire-text focus:outline-none focus:border-empire-gold/60'
  const pricing = preview?.pricing

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-4">
        <Panel title="1 · Choose a template" icon="book">
          <div className="grid grid-cols-2 gap-2">
            {templates.map(t => {
              const c = CATEGORY_COLOR[t.category] || ACCENT
              const on = t.key === selKey
              return (
                <button key={t.key} onClick={() => setSelKey(t.key)}
                  className="text-left rounded-lg border px-3 py-2 transition-colors"
                  style={{ borderColor: on ? c : '#ffffff14', background: on ? c + '14' : 'transparent' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-empire-text text-sm font-medium">{t.name}</span>
                  </div>
                  <Pill text={t.category} color={c} />
                </button>
              )
            })}
          </div>
        </Panel>

        {selected && (
          <Panel title="2 · Fill the details" icon="pen-nib">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Document title</span>
                  <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder={`${selected.name} — …`} />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Counterparty</span>
                  <input className={inputCls} value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="Acme Ltd" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {selected.variables.map(v => (
                  <label key={v.key} className={v.type === 'textarea' ? 'block col-span-2' : 'block'}>
                    <span className="text-[11px] uppercase tracking-wide text-empire-text-muted">{v.label}{v.help ? <span className="text-empire-text-dim normal-case"> · {v.help}</span> : null}</span>
                    {v.type === 'textarea'
                      ? <textarea className={inputCls} rows={2} value={params[v.key] ?? ''} onChange={e => set(v.key, e.target.value)} />
                      : <input className={inputCls} type={v.type === 'number' ? 'number' : v.type === 'date' ? 'date' : 'text'}
                          value={params[v.key] ?? ''} onChange={e => set(v.key, v.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />}
                  </label>
                ))}
              </div>
              <button onClick={generate} disabled={saving}
                className="w-full mt-1 rounded-lg py-2 text-sm font-medium text-black disabled:opacity-50"
                style={{ background: ACCENT }}>
                {saving ? 'Generating…' : 'Generate & Save Contract'}
              </button>
            </div>
          </Panel>
        )}
      </div>

      {/* Preview */}
      <div className="space-y-4">
        {pricing && (
          <Panel title="Deal Economics (derived)" icon="coins">
            <Grid cols={2}>
              <KpiCard label="Base Cost / mo" value={eur(pricing.baseCost)} sub={`${pricing.numDevs} devs × ${eur(pricing.ratePerDev)}`} accent="#C9A233" icon="card" />
              <KpiCard label="Client Price / mo" value={eur(pricing.clientPrice)} sub={`+${pricing.markupPct}% markup`} accent={ACCENT} icon="coins" />
              <KpiCard label="Margin / mo" value={eur(pricing.margin)} sub={`${pricing.marginPct}% margin`} accent="#C9A233" icon="chart-line" />
              <KpiCard label="Annual Contract Value" value={eur(pricing.annualClientPrice)} accent="#c9a233" icon="trophy" />
            </Grid>
          </Panel>
        )}
        <Panel title="Live Preview" icon="document">
          {preview
            ? <div className="lg-prose bg-white rounded-lg px-6 py-5 max-h-[480px] overflow-auto"
                dangerouslySetInnerHTML={{ __html: mdToHtml(preview.renderedMarkdown) }} />
            : <EmptyState icon="pen-nib" title="Select a template" hint="Pick a contract type and fill the details to preview it live." />}
        </Panel>
      </div>
      <style dangerouslySetInnerHTML={{ __html: CONTRACT_CSS }} />
    </div>
  )
}

/* ---------------- Template Library ---------------- */
function Templates() {
  const [page, setPage] = useState(0)
  const { data, reload } = useLegal<Page<Template>>(`templates?pageSize=8&page=${page + 1}`)
  const rows = data?.data || []
  const [viewing, setViewing] = useState<Template | null>(null)
  const [editing, setEditing] = useState<Template | null>(null)
  const [creating, setCreating] = useState(false)
  const removeTpl = async (r: Template) => { await del(`/api/legal/templates/${r.id}`); reload() }
  const cols: Column<Template>[] = [
    { key: 'name', label: 'Template', render: r => <span className="text-empire-text font-medium">{r.name}</span> },
    { key: 'category', label: 'Type', render: r => <Pill text={r.category} color={CATEGORY_COLOR[r.category] || ACCENT} /> },
    { key: 'jurisdiction', label: 'Jurisdiction', render: r => <span className="text-empire-text-muted">{r.jurisdiction}</span> },
    { key: 'docs', label: 'Generated', align: 'right', render: r => <span className="tabular-nums">{r._count?.documents ?? 0}</span> },
    { key: 'description', label: 'Description', render: r => <span className="text-empire-text-dim text-xs">{r.description}</span> },
    { key: 'actions', label: '', align: 'right', render: r => (
      <RowActions onView={() => setViewing(r)} onEdit={() => setEditing(r)} onDelete={() => removeTpl(r)} deleteLabel="Delete this template? This cannot be undone." />
    ) },
  ]
  return (
    <Panel
      title={`Template Library (${data?.total ?? rows.length})`}
      icon="book"
      actions={<button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-black" style={{ background: ACCENT }}><EmpireIcon name="plus" size={13} />Create template</button>}
    >
      <DataTable columns={cols} rows={rows} empty="No templates." />
      {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}

      <TemplateEditModal tpl={editing} mode="edit" open={!!editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />
      <TemplateEditModal tpl={null} mode="create" open={creating} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); setPage(0); reload() }} />

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || 'Template'} icon={<EmpireIcon name="book" size={18} />} width="max-w-2xl">
        {viewing && (
          <div className="space-y-4">
            <div className="space-y-0.5">
              <div className="flex items-baseline justify-between gap-4 border-b border-empire-border/40 py-1.5">
                <span className="text-[11px] uppercase tracking-wide text-empire-text-dim">Type</span>
                <Pill text={viewing.category} color={CATEGORY_COLOR[viewing.category] || ACCENT} />
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-empire-border/40 py-1.5">
                <span className="text-[11px] uppercase tracking-wide text-empire-text-dim">Key</span>
                <span className="font-mono text-xs text-empire-text">{viewing.key}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-empire-border/40 py-1.5">
                <span className="text-[11px] uppercase tracking-wide text-empire-text-dim">Jurisdiction</span>
                <span className="text-sm text-empire-text">{viewing.jurisdiction}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-empire-border/40 py-1.5">
                <span className="text-[11px] uppercase tracking-wide text-empire-text-dim">Generated</span>
                <span className="text-sm text-empire-text tabular-nums">{viewing._count?.documents ?? 0}</span>
              </div>
              {viewing.description && (
                <div className="flex items-baseline justify-between gap-4 border-b border-empire-border/40 py-1.5">
                  <span className="text-[11px] uppercase tracking-wide text-empire-text-dim">Description</span>
                  <span className="text-sm text-empire-text text-right">{viewing.description}</span>
                </div>
              )}
            </div>
            {viewing.variables?.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-empire-text-muted mb-2">Variables ({viewing.variables.length})</div>
                <div className="flex flex-wrap gap-1.5">
                  {viewing.variables.map(v => (
                    <span key={v.key} className="inline-flex items-center gap-1 rounded border border-empire-border/60 bg-empire-bg px-2 py-0.5 text-[11px] text-empire-text-muted">
                      <span className="text-empire-text">{v.label}</span>
                      <span className="text-empire-text-dim">· {v.type}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="text-[11px] uppercase tracking-wide text-empire-text-muted mb-2">Body preview</div>
              <div className="lg-prose bg-white rounded-lg px-6 py-5 max-h-[360px] overflow-auto"
                dangerouslySetInnerHTML={{ __html: mdToHtml(viewing.bodyMarkdown) }} />
            </div>
          </div>
        )}
        <style dangerouslySetInnerHTML={{ __html: CONTRACT_CSS }} />
      </Modal>
    </Panel>
  )
}

/* Create/edit a contract template (key / name / type / jurisdiction / body). */
function TemplateEditModal({ tpl, mode, open, onClose, onSaved }: { tpl: Template | null; mode: 'create' | 'edit'; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ key: '', name: '', category: 'commercial', jurisdiction: 'EU', description: '', bodyMarkdown: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open) return
    if (tpl) setF({
      key: tpl.key || '', name: tpl.name || '', category: tpl.category || '', jurisdiction: tpl.jurisdiction || '',
      description: tpl.description || '', bodyMarkdown: tpl.bodyMarkdown || '',
    })
    else setF({
      key: '',
      name: '',
      category: 'commercial',
      jurisdiction: 'EU',
      description: '',
      bodyMarkdown: '# {{clientName}} Agreement\n\nThis agreement is between Cregen AI Ltd and {{clientName}}.\n\n## Signatures\n\n{{signature.(Cregen AI Ltd)}}\n\n{{signature.(Counterparty)}}',
    })
  }, [tpl, open])
  const save = async () => {
    if (!f.name || !f.category || !f.bodyMarkdown || (mode === 'create' && !f.key)) return
    setSaving(true)
    try {
      if (mode === 'create') await post('/api/legal/templates', f)
      else if (tpl) await patch(`/api/legal/templates/${tpl.id}`, f)
      onSaved()
    }
    catch (e) { console.error(e) } finally { setSaving(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={mode === 'create' ? 'Create template' : tpl ? `Edit · ${tpl.name}` : 'Edit template'} icon={<EmpireIcon name={mode === 'create' ? 'plus' : 'pen'} size={18} />} width="max-w-2xl">
      <div className="space-y-3">
        {mode === 'create' && (
          <label className="block"><span className="empire-label">Key</span>
            <input className="empire-input w-full mt-1 font-mono text-xs" value={f.key} onChange={e => setF({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') })} placeholder="msa-eu-v1" /></label>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="empire-label">Name</span>
            <input className="empire-input w-full mt-1" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
          <label className="block"><span className="empire-label">Type</span>
            <input className="empire-input w-full mt-1" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} /></label>
        </div>
        <label className="block"><span className="empire-label">Jurisdiction</span>
          <input className="empire-input w-full mt-1" value={f.jurisdiction} onChange={e => setF({ ...f, jurisdiction: e.target.value })} /></label>
        <label className="block"><span className="empire-label">Description</span>
          <input className="empire-input w-full mt-1" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></label>
        <label className="block"><span className="empire-label">Body (markdown)</span>
          <textarea className="empire-input w-full mt-1 font-mono text-xs" rows={10} value={f.bodyMarkdown} onChange={e => setF({ ...f, bodyMarkdown: e.target.value })} /></label>
        <p className="text-[11px] text-empire-text-muted">
          Fields are generated from tokens like <span className="font-data text-empire-gold">{'{{good}}'}</span>. Add at least two signature slots with <span className="font-data text-empire-gold">{'{{signature.(Name)}}'}</span>.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={saving || !f.name || !f.category || !f.bodyMarkdown || (mode === 'create' && !f.key)} className="empire-btn-primary disabled:opacity-50">{saving ? 'Saving…' : mode === 'create' ? 'Create template' : 'Save changes'}</button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- Documents ---------------- */
const STATUS_COLOR: Record<string, string> = { draft: ACCENT, sent: '#c9a233', signed: '#C9A233', void: '#F4EFE3' }
const STATUS_FLOW = ['draft', 'sent', 'signed', 'void']

function sigSummary(sigs: Signature[] | null | undefined) {
  if (!sigs || !sigs.length) return { signed: 0, total: 0 }
  return { signed: sigs.filter(s => s.signedAt).length, total: sigs.length }
}

function Documents({ onView }: { onView: (id: string) => void }) {
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [bump, setBump] = useState(0)
  useEffect(() => { const id = setTimeout(() => setQDebounced(q), 300); return () => clearTimeout(id) }, [q])
  const path = `documents?pageSize=10&page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}${qDebounced ? `&q=${encodeURIComponent(qDebounced)}` : ''}&_=${bump}`
  const { data, reload } = useLegal<Page<Doc>>(path)
  const rows = data?.data || []

  const setStatus = async (id: string, status: string) => { await patch(`/api/legal/documents/${id}`, { status }); reload() }
  const remove = async (id: string) => { if (!confirm('Delete this contract? This cannot be undone.')) return; await del(`/api/legal/documents/${id}`); setBump(b => b + 1) }

  const cols: Column<Doc>[] = [
    { key: 'title', label: 'Document', render: r => (
      <button onClick={() => onView(r.id)} className="text-left group">
        <div className="text-empire-text font-medium group-hover:underline" style={{ textDecorationColor: ACCENT }}>{r.title}</div>
        <div className="text-empire-text-dim text-xs">{r.template?.name || r.templateKey}</div>
      </button>
    ) },
    { key: 'counterparty', label: 'Counterparty', render: r => <span className="text-empire-text-muted">{r.counterparty || '—'}</span> },
    { key: 'value', label: 'ACV', align: 'right', render: r => <span className="tabular-nums">{r.pricing ? eur(r.pricing.annualClientPrice) : '—'}</span> },
    { key: 'sigs', label: 'Signed', align: 'center', render: r => {
      const { signed, total } = sigSummary(r.signatures)
      const done = total > 0 && signed === total
      return <span className="tabular-nums text-xs" style={{ color: done ? '#C9A233' : signed > 0 ? '#c9a233' : '#7A7468' }}>{signed}/{total || 2}</span>
    } },
    { key: 'status', label: 'Status', render: r => (
      <select value={r.status} onChange={e => setStatus(r.id, e.target.value)}
        className="bg-empire-bg border rounded px-1.5 py-0.5 text-xs cursor-pointer"
        style={{ color: STATUS_COLOR[r.status] || ACCENT, borderColor: (STATUS_COLOR[r.status] || ACCENT) + '60' }}>
        {STATUS_FLOW.map(s => <option key={s} value={s} className="text-empire-text bg-empire-bg">{s}</option>)}
      </select>
    ) },
    { key: 'createdAt', label: 'Created', render: r => <span className="text-empire-text-dim text-xs">{new Date(r.createdAt).toLocaleDateString()}</span> },
    { key: 'actions', label: '', align: 'right', render: r => (
      <div className="flex items-center justify-end gap-3">
        <button onClick={() => onView(r.id)} className="text-xs font-medium" style={{ color: ACCENT }}>Open</button>
        <button onClick={() => remove(r.id)} className="text-empire-text-dim hover:text-empire-rag-red text-xs">Delete</button>
      </div>
    ) },
  ]
  return (
    <Panel title={`Generated Documents (${data?.total ?? rows.length})`} icon="document">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {['', ...STATUS_FLOW].map(s => (
          <button key={s || 'all'} onClick={() => { setStatusFilter(s); setPage(0) }}
            className="px-2.5 py-1 rounded text-xs capitalize transition-colors"
            style={{ background: statusFilter === s ? ACCENT + '22' : 'transparent', color: statusFilter === s ? ACCENT : '#7A7468', border: `1px solid ${statusFilter === s ? ACCENT + '60' : '#ffffff14'}` }}>
            {s || 'all'}
          </button>
        ))}
        <div className="ml-auto relative">
          <EmpireIcon name="search" size={13} className="text-empire-text-dim absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(0) }} placeholder="Search title or counterparty…"
            className="bg-empire-bg border border-empire-border rounded pl-8 pr-2.5 py-1 text-xs text-empire-text w-56 focus:outline-none focus:border-empire-gold/60" />
        </div>
      </div>
      <DataTable columns={cols} rows={rows} empty="No documents yet — generate one." />
      {data && <Pagination page={page} pageCount={data.totalPages} total={data.total} onPage={setPage} accent={ACCENT} />}
    </Panel>
  )
}

/* ---------------- Document Viewer (modal) ---------------- */
function DocumentViewer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [doc, setDoc] = useState<Doc | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [signParty, setSignParty] = useState<string | null>(null)
  const [signName, setSignName] = useState('')
  const [companyMarks, setCompanyMarks] = useState<CompanyMarks | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetcher(`/api/legal/documents/${id}`).then(setDoc).catch(console.error).finally(() => setLoading(false))
  }, [id])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetcher('/api/companies').then((rows: CompanyMarks[]) => {
      let slug: string | null = null
      try { slug = localStorage.getItem(ACTIVE_COMPANY_KEY) } catch { /* noop */ }
      setCompanyMarks((rows || []).find((c: any) => c.slug === slug) || rows?.[0] || null)
    }).catch(() => setCompanyMarks(null))
  }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const sigs = doc?.signatures || null

  const copy = async () => {
    if (!doc?.renderedMarkdown) return
    try { await navigator.clipboard.writeText(doc.renderedMarkdown); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  const sign = async (party: string) => {
    if (!signName.trim()) return
    setBusy('sign')
    try {
      const updated: any = await post(`/api/legal/documents/${id}/sign`, { party, name: signName.trim() })
      setDoc(updated); setSignParty(null); setSignName(''); onChanged()
    } catch (e) { console.error(e) } finally { setBusy('') }
  }
  const setStatus = async (status: string) => {
    setBusy('status')
    try { const u: any = await patch(`/api/legal/documents/${id}`, { status }); setDoc(d => d ? { ...d, status: u.status } : d); onChanged() }
    catch (e) { console.error(e) } finally { setBusy('') }
  }

  const body = (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative h-full w-full max-w-3xl bg-empire-surface border-l border-empire-border shadow-2xl overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {loading || !doc ? <Loading /> : (
          <div className="flex flex-col min-h-full">
            {/* header / action bar */}
            <div className="sticky top-0 z-10 bg-empire-surface/95 backdrop-blur-sm border-b border-empire-border px-6 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-empire-text font-medium truncate">{doc.title}</div>
                  <div className="text-empire-text-dim text-xs">{doc.template?.name || doc.templateKey}{doc.counterparty ? ` · ${doc.counterparty}` : ''}{doc.pricing ? ` · ACV ${eur(doc.pricing.annualClientPrice)}` : ''}</div>
                </div>
                <button onClick={onClose} aria-label="Close" className="text-empire-text-dim hover:text-empire-text leading-none shrink-0"><EmpireIcon name="close" size={18} /></button>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button onClick={() => printContract(doc, companyMarks)} className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-black" style={{ background: ACCENT }}><EmpireIcon name="document" size={13} />Print / Save PDF</button>
                <button onClick={() => downloadBlob(doc.renderedMarkdown || '', exportFilename(doc, 'md'), 'text/markdown')} className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs border border-empire-border text-empire-text hover:border-empire-gold/60"><EmpireIcon name="arrow-down" size={13} />Download .md</button>
                <button onClick={copy} className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs border border-empire-border text-empire-text hover:border-empire-gold/60"><EmpireIcon name={copied ? 'check' : 'document'} size={13} />{copied ? 'Copied' : 'Copy'}</button>
                <button onClick={() => setEditing(e => !e)} className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs border border-empire-border text-empire-text hover:border-empire-gold/60"><EmpireIcon name="pen-nib" size={13} />{editing ? 'Close editor' : 'Edit & Regenerate'}</button>
                <select value={doc.status} onChange={e => setStatus(e.target.value)} disabled={busy === 'status'}
                  className="bg-empire-bg border rounded px-1.5 py-1 text-xs cursor-pointer ml-auto"
                  style={{ color: STATUS_COLOR[doc.status] || ACCENT, borderColor: (STATUS_COLOR[doc.status] || ACCENT) + '60' }}>
                  {STATUS_FLOW.map(s => <option key={s} value={s} className="text-empire-text bg-empire-bg">{s}</option>)}
                </select>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {editing && doc.template?.variables && (
                <EditPanel doc={doc} onDone={(updated) => { setDoc(updated); setEditing(false); onChanged() }} setBusy={setBusy} busy={busy} />
              )}

              {/* signatures */}
              <div className="rounded-lg border border-empire-border p-4">
                <div className="text-[11px] uppercase tracking-wide text-empire-text-muted mb-3">Signatures</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(sigs && sigs.length ? sigs : []).map(s => (
                    <div key={s.party} className="rounded border border-empire-border/60 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-empire-text-dim">{s.role}</div>
                      <div className="text-empire-text text-sm font-medium">{s.name}</div>
                      {s.signedAt ? (
                        <div className="mt-1 inline-flex items-center gap-1 text-xs" style={{ color: '#C9A233' }}>
                          <EmpireIcon name="check" size={12} />Signed by {s.signedName} · {new Date(s.signedAt).toLocaleDateString()}
                        </div>
                      ) : signParty === s.party ? (
                        <div className="mt-2 flex items-center gap-2">
                          <input autoFocus value={signName} onChange={e => setSignName(e.target.value)} placeholder="Full legal name"
                            className="flex-1 bg-empire-bg border border-empire-border rounded px-2 py-1 text-xs text-empire-text focus:outline-none focus:border-empire-gold/60" />
                          <button onClick={() => sign(s.party)} disabled={busy === 'sign' || !signName.trim()} className="rounded px-2 py-1 text-xs font-medium text-black disabled:opacity-50" style={{ background: '#C9A233' }}>Sign</button>
                          <button onClick={() => { setSignParty(null); setSignName('') }} aria-label="Cancel" className="text-empire-text-dim"><EmpireIcon name="close" size={14} /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setSignParty(s.party); setSignName('') }} className="mt-2 rounded px-2.5 py-1 text-xs border border-empire-border text-empire-text hover:border-empire-gold/60">Sign as {s.role}</button>
                      )}
                    </div>
                  ))}
                  {(!sigs || !sigs.length) && <div className="text-empire-text-dim text-xs">No signature block — regenerate this document to add one.</div>}
                </div>
              </div>

              {/* the contract */}
              <div className="lg-prose bg-white rounded-lg px-7 py-6"
                dangerouslySetInnerHTML={{ __html: mdToHtml(doc.renderedMarkdown || '') }} />
            </div>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: CONTRACT_CSS }} />
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(body, document.body)
}

/* Inline edit-and-regenerate panel inside the viewer. */
function EditPanel({ doc, onDone, setBusy, busy }: { doc: Doc; onDone: (d: Doc) => void; setBusy: (s: string) => void; busy: string }) {
  const vars = doc.template?.variables || []
  const [params, setParams] = useState<Record<string, any>>({ ...(doc.params || {}) })
  const [title, setTitle] = useState(doc.title)
  const [counterparty, setCounterparty] = useState(doc.counterparty || '')
  const set = (k: string, v: any) => setParams(p => ({ ...p, [k]: v }))
  const inputCls = 'w-full bg-empire-bg border border-empire-border rounded px-2.5 py-1.5 text-sm text-empire-text focus:outline-none focus:border-empire-gold/60'
  const regen = async () => {
    setBusy('regen')
    try {
      const updated: any = await post(`/api/legal/documents/${doc.id}/regenerate`, { params, title, counterparty: counterparty || null })
      onDone(updated)
    } catch (e) { console.error(e) } finally { setBusy('') }
  }
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: ACCENT + '55', background: ACCENT + '0d' }}>
      <div className="text-[11px] uppercase tracking-wide mb-3" style={{ color: ACCENT }}>Edit terms & regenerate · resets signatures</div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Title</span>
          <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Counterparty</span>
          <input className={inputCls} value={counterparty} onChange={e => setCounterparty(e.target.value)} /></label>
        {vars.map(v => (
          <label key={v.key} className={v.type === 'textarea' ? 'block col-span-2' : 'block'}>
            <span className="text-[11px] uppercase tracking-wide text-empire-text-muted">{v.label}</span>
            {v.type === 'textarea'
              ? <textarea className={inputCls} rows={2} value={params[v.key] ?? ''} onChange={e => set(v.key, e.target.value)} />
              : <input className={inputCls} type={v.type === 'number' ? 'number' : v.type === 'date' ? 'date' : 'text'}
                  value={params[v.key] ?? ''} onChange={e => set(v.key, v.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />}
          </label>
        ))}
      </div>
      <button onClick={regen} disabled={busy === 'regen'} className="mt-3 rounded-lg px-4 py-1.5 text-sm font-medium text-black disabled:opacity-50" style={{ background: ACCENT }}>
        {busy === 'regen' ? 'Regenerating…' : 'Regenerate contract'}
      </button>
    </div>
  )
}
