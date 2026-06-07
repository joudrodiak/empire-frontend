'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { fetcher, post, patch, del, download } from '@/lib/api'
import { KpiCard, Panel, AreaChart, BarChart, DonutChart, ProgressBar, DataTable, Badge, TabBar, Grid, EmptyState, type Column } from '@/lib/ui'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { Modal } from '@/components/molecules/Modal'
import { FileDrop } from '@/components/molecules/FileDrop'
import { useStickyTab } from '@/lib/use-sticky-tab'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'

// Read-only key/value row for view modals.
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-empire-border/40 py-1.5 last:border-0">
      <span className="text-[11px] uppercase tracking-wide text-empire-text-dim">{label}</span>
      <span className="text-sm text-empire-text text-right">{children}</span>
    </div>
  )
}
const modalInput = 'w-full bg-empire-bg border border-empire-border rounded px-2.5 py-1.5 text-sm text-empire-text focus:outline-none focus:border-empire-gold/60'

// Finance — enterprise FP&A surface backed by a real double-entry ledger.
// Every figure here is derived server-side from posted journal entries
// (/api/finance/*). Nothing is hard-coded. The Ledger tab lets you post
// balanced entries that immediately flow into every statement.

const ACCENT = '#c9a233'
const eur = (n: number | null | undefined) =>
  n == null ? '—' : `${n < 0 ? '-' : ''}€${Math.abs(Math.round(n)).toLocaleString()}`
const eurK = (n: number | null | undefined) =>
  n == null ? '—' : Math.abs(n) >= 1000 ? `${n < 0 ? '-' : ''}€${(Math.abs(n) / 1000).toFixed(1)}k` : eur(n)

// Small colored tag for arbitrary accent colors (shared Badge only supports fixed tones).
function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide"
      style={{ color, background: color + '1a', border: `1px solid ${color}40` }}>
      {text}
    </span>
  )
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'pnl', label: 'P&L' },
  { id: 'balance', label: 'Balance Sheet' },
  { id: 'cash', label: 'Cash Flow' },
  { id: 'capex', label: 'CapEx / OpEx' },
  { id: 'spend', label: 'Spend' },
  { id: 'arap', label: 'AR / AP' },
  { id: 'tax', label: 'Tax' },
  { id: 'bank', label: 'Bank' },
  { id: 'ledger', label: 'Ledger' },
]

type Summary = { cash: number; mtdRevenue: number; mtdExpense: number; netIncomeMTD: number; burn: number; runwayMonths: number | null; grossMarginPct: number; ar: number; ap: number; trend: { period: string; revenue: number; expense: number; net: number }[]; entryCount: number }

export function FinancePanel({ departmentSlug }: { departmentSlug: string }) {
  const [tab, setTab] = useStickyTab('finance', 'overview')
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-empire text-empire-gold text-sm tracking-widest uppercase">
            <EmpireIcon name={deptIcon('finance')} size={16} className="text-empire-gold-muted" />
            Financial Intelligence
          </h3>
          <p className="text-empire-text-muted text-xs mt-0.5">Double-entry general ledger · every statement is derived, every entry balances.</p>
        </div>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} accent={ACCENT} />
      {tab === 'overview' && <Overview />}
      {tab === 'pnl' && <PnL />}
      {tab === 'balance' && <BalanceSheet />}
      {tab === 'cash' && <CashFlow />}
      {tab === 'capex' && <CapexOpex />}
      {tab === 'spend' && <SpendCenter departmentSlug={departmentSlug} />}
      {tab === 'arap' && <ARAP />}
      {tab === 'tax' && <TaxCenter />}
      {tab === 'bank' && <BankCenter />}
      {tab === 'ledger' && <Ledger departmentSlug={departmentSlug} />}
    </div>
  )
}

function useFin<T>(path: string): { data: T | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    setLoading(true)
    fetcher(`/api/finance/${path}`).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [path])
  useEffect(() => { reload() }, [reload])
  return { data, loading, reload }
}

function Loading() { return <div className="py-16 text-center text-empire-text-dim text-sm animate-pulse">Computing from the ledger…</div> }

/* ---------------- Overview ---------------- */
function Overview() {
  const { data: s, loading } = useFin<Summary>('summary')
  if (loading) return <Loading />
  if (!s) return <EmptyState icon="coins" title="No ledger data" hint="Post a journal entry to begin." />
  const net = s.trend.map(t => t.net)
  const profitable = s.netIncomeMTD >= 0
  return (
    <div className="space-y-6">
      <Grid cols={6}>
        <KpiCard label="MTD Revenue" value={eurK(s.mtdRevenue)} spark={s.trend.map(t => t.revenue)} accent={ACCENT} icon="chart-line" />
        <KpiCard label="Monthly Burn" value={s.burn > 0 ? eurK(s.burn) : 'Cash-positive'} accent={s.burn > 0 ? '#c94f4f' : '#3a9d5c'} icon="flame" />
        <KpiCard label="Runway" value={s.runwayMonths != null ? `${s.runwayMonths} mo` : '∞'} sub="at current burn" accent={ACCENT} icon="clock" />
        <KpiCard label="Gross Margin" value={`${s.grossMarginPct}%`} accent="#3a9d5c" icon="gauge" />
        <KpiCard label="Cash Balance" value={eurK(s.cash)} accent={ACCENT} icon="coins" />
        <KpiCard label="Net Income MTD" value={eurK(s.netIncomeMTD)} delta={profitable ? 'profit' : 'loss'} deltaGood={profitable} accent={profitable ? '#3a9d5c' : '#c94f4f'} icon="finance" />
      </Grid>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Revenue vs Expenses (6 mo)" className="lg:col-span-2" icon="chart-line">
          <AreaChart series={s.trend.map(t => t.revenue)} labels={s.trend.map(t => t.period)} color={ACCENT} height={200} />
          <div className="flex gap-6 mt-3 text-xs">
            <span className="flex items-center gap-2"><span className="w-3 h-0.5" style={{ background: ACCENT }} />Revenue {eurK(s.mtdRevenue)}</span>
            <span className="flex items-center gap-2 text-empire-text-muted"><span className="w-3 h-0.5 bg-rag-red" />Expenses {eurK(s.mtdExpense)}</span>
          </div>
        </Panel>
        <Panel title="Net Income Trend" icon="chart-bar">
          <BarChart data={net} labels={s.trend.map(t => t.period)} color={ACCENT} height={200} />
        </Panel>
      </div>
      <Grid cols={3}>
        <KpiCard label="Accounts Receivable" value={eurK(s.ar)} sub="owed to us" accent="#3a9d5c" icon="arrow-down" />
        <KpiCard label="Accounts Payable" value={eurK(s.ap)} sub="we owe" accent="#c94f4f" icon="arrow-up" />
        <KpiCard label="Journal Entries" value={`${s.entryCount}`} sub="posted, all balanced" accent={ACCENT} icon="book" />
      </Grid>
    </div>
  )
}

/* ---------------- P&L ---------------- */
type PnLData = { revenue: number; revenueLines: Line[]; cogs: number; cogsLines: Line[]; grossProfit: number; grossMarginPct: number; opex: number; opexLines: Line[]; operatingIncome: number; netIncome: number; netMarginPct: number }
type Line = { code: string; name: string; subtype: string | null; amount: number }

function PnL() {
  const { data: p, loading } = useFin<PnLData>('pnl')
  if (loading) return <Loading />
  if (!p) return <EmptyState icon="chart-bar" title="No P&L data" hint="Post revenue & expense entries." />
  const rows: { line: string; amount: number; bold?: boolean; indent?: boolean }[] = [
    { line: 'Revenue', amount: p.revenue, bold: true },
    ...p.revenueLines.map(l => ({ line: l.name, amount: l.amount, indent: true })),
    { line: 'Cost of Revenue', amount: -p.cogs, bold: true },
    ...p.cogsLines.map(l => ({ line: l.name, amount: -l.amount, indent: true })),
    { line: 'Gross Profit', amount: p.grossProfit, bold: true },
    { line: 'Operating Expenses', amount: -p.opex, bold: true },
    ...p.opexLines.map(l => ({ line: l.name, amount: -l.amount, indent: true })),
    { line: 'Net Income', amount: p.netIncome, bold: true },
  ]
  const cols: Column<typeof rows[number]>[] = [
    { key: 'line', label: 'Line Item', render: r => <span className={r.bold ? 'font-semibold text-empire-text' : 'text-empire-text-muted pl-4'}>{r.line}</span> },
    { key: 'amount', label: 'Amount', align: 'right', render: r => <span className={`${r.bold ? 'font-semibold' : ''} ${r.amount < 0 ? 'text-empire-text' : 'text-rag-green'}`}>{eur(r.amount)}</span> },
  ]
  function exportStatement() {
    printStatement('Income Statement (P&L)', 'Period-to-date · derived from posted revenue & expense entries', [
      { rows: [
        { label: 'Revenue', amount: p!.revenue, bold: true },
        ...p!.revenueLines.map(l => ({ label: l.name, amount: l.amount, indent: true })),
        { label: 'Cost of Revenue', amount: -p!.cogs, bold: true },
        ...p!.cogsLines.map(l => ({ label: l.name, amount: -l.amount, indent: true })),
        { label: 'Gross Profit', amount: p!.grossProfit, bold: true, rule: true },
        { label: 'Operating Expenses', amount: -p!.opex, bold: true },
        ...p!.opexLines.map(l => ({ label: l.name, amount: -l.amount, indent: true })),
        { label: 'Operating Income', amount: p!.operatingIncome, bold: true, rule: true },
        { label: `Net Income (${p!.netMarginPct}% margin)`, amount: p!.netIncome, bold: true, rule: true },
      ] },
    ])
  }
  return (
    <div className="space-y-6">
      <Grid cols={4}>
        <KpiCard label="Revenue" value={eurK(p.revenue)} accent={ACCENT} icon="chart-line" />
        <KpiCard label="Gross Profit" value={eurK(p.grossProfit)} sub={`${p.grossMarginPct}% margin`} accent="#3a9d5c" icon="coins" />
        <KpiCard label="Operating Income" value={eurK(p.operatingIncome)} accent={ACCENT} icon="gauge" />
        <KpiCard label="Net Income" value={eurK(p.netIncome)} delta={p.netIncome >= 0 ? 'profit' : 'loss'} deltaGood={p.netIncome >= 0} accent={p.netIncome >= 0 ? '#3a9d5c' : '#c94f4f'} icon="finance" />
      </Grid>
      <Panel title="Income Statement" icon="document" actions={<ExportBtn onClick={exportStatement} />}><DataTable columns={cols} rows={rows} /></Panel>
    </div>
  )
}

/* ---------------- Balance Sheet ---------------- */
type BSData = { assets: Line[]; liabilities: Line[]; equity: Line[]; totalAssets: number; totalLiabilities: number; bookEquity: number; retainedEarnings: number; totalEquity: number; balanced: boolean; difference: number }

function BalanceSheet() {
  const { data: b, loading } = useFin<BSData>('balance-sheet')
  if (loading) return <Loading />
  if (!b) return <EmptyState icon="scales" title="No balance sheet data" hint="Post entries to populate accounts." />
  const sectCols: Column<Line>[] = [
    { key: 'name', label: 'Account', render: r => <span className="text-empire-text-muted">{r.code} · {r.name}</span> },
    { key: 'amount', label: 'Amount', align: 'right', render: r => <span className="tabular-nums">{eur(r.amount)}</span> },
  ]
  function exportStatement() {
    printStatement('Balance Sheet', `As of ${new Date().toLocaleDateString()} · ${b!.balanced ? 'balanced' : `out by ${eur(b!.difference)}`}`, [
      { heading: 'Assets', rows: [
        ...b!.assets.map(l => ({ label: `${l.code} · ${l.name}`, amount: l.amount, indent: true })),
        { label: 'Total Assets', amount: b!.totalAssets, bold: true, rule: true },
      ] },
      { heading: 'Liabilities', rows: [
        ...b!.liabilities.map(l => ({ label: `${l.code} · ${l.name}`, amount: l.amount, indent: true })),
        { label: 'Total Liabilities', amount: b!.totalLiabilities, bold: true, rule: true },
      ] },
      { heading: 'Equity', rows: [
        ...b!.equity.map(l => ({ label: `${l.code} · ${l.name}`, amount: l.amount, indent: true })),
        { label: 'Retained Earnings (current)', amount: b!.retainedEarnings, indent: true },
        { label: 'Total Equity', amount: b!.totalEquity, bold: true, rule: true },
        { label: 'Liabilities + Equity', amount: b!.totalLiabilities + b!.totalEquity, bold: true, rule: true },
      ] },
    ])
  }
  return (
    <div className="space-y-6">
      <Grid cols={4}>
        <KpiCard label="Total Assets" value={eurK(b.totalAssets)} accent={ACCENT} icon="coins" />
        <KpiCard label="Total Liabilities" value={eurK(b.totalLiabilities)} accent="#c94f4f" icon="card" />
        <KpiCard label="Total Equity" value={eurK(b.totalEquity)} sub={`incl. retained ${eurK(b.retainedEarnings)}`} accent="#3a9d5c" icon="shield" />
        <KpiCard label="A = L + E" value={b.balanced ? 'Balanced' : `Off ${eur(b.difference)}`} accent={b.balanced ? '#3a9d5c' : '#c94f4f'} icon={b.balanced ? 'check' : 'alert'} />
      </Grid>
      <div className="flex justify-end"><ExportBtn onClick={exportStatement} /></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title={`Assets — ${eur(b.totalAssets)}`} icon="coins"><DataTable columns={sectCols} rows={b.assets} empty="No asset balances" /></Panel>
        <div className="space-y-4">
          <Panel title={`Liabilities — ${eur(b.totalLiabilities)}`} icon="card"><DataTable columns={sectCols} rows={b.liabilities} empty="No liabilities" /></Panel>
          <Panel title={`Equity — ${eur(b.totalEquity)}`} icon="shield">
            <DataTable columns={sectCols} rows={[...b.equity, { code: '—', name: 'Retained Earnings (current)', subtype: null, amount: b.retainedEarnings }]} empty="No equity" />
          </Panel>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Statement print-to-PDF (shared) ----------------
 * Same dependency-free pattern as the spend voucher: open a styled window with a
 * clean letterhead and trigger the browser's native "Save as PDF". Used by P&L,
 * Balance Sheet and Cash Flow so every financial statement is exportable. */
type StmtRow = { label: string; amount: number; bold?: boolean; indent?: boolean; rule?: boolean }
type StmtSection = { heading?: string; rows: StmtRow[] }
function printStatement(title: string, periodLabel: string, sections: StmtSection[]) {
  const fmt = (n: number) => `${n < 0 ? '-' : ''}€${Math.abs(Math.round(n)).toLocaleString()}`
  const body = sections.map(sec => {
    const head = sec.heading ? `<tr><td class="sec" colspan="2">${sec.heading}</td></tr>` : ''
    const rows = sec.rows.map(r =>
      `<tr class="${r.bold ? 'b' : ''} ${r.rule ? 'rule' : ''}"><td class="${r.indent ? 'ind' : ''}">${r.label}</td><td class="num ${r.amount < 0 ? 'neg' : ''}">${fmt(r.amount)}</td></tr>`).join('')
    return head + rows
  }).join('<tr class="gap"><td colspan="2"></td></tr>')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;margin:48px;background:#fff}
    .hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #C9A233;padding-bottom:14px;margin-bottom:8px}
    .brand{font-size:22px;letter-spacing:3px;text-transform:uppercase}
    .sub{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888}
    .ttl{font-size:18px;margin:18px 0 2px}
    .per{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;font-family:Arial,sans-serif;margin-bottom:16px}
    table{width:100%;border-collapse:collapse}
    td{padding:6px 4px;font-size:13px}
    td.num{text-align:right;font-variant-numeric:tabular-nums;font-family:Arial,sans-serif}
    td.neg{color:#9a2b2b}
    td.ind{padding-left:22px;color:#666}
    td.sec{text-transform:uppercase;font-size:10px;letter-spacing:1.5px;color:#888;font-family:Arial,sans-serif;padding-top:14px;border-bottom:1px solid #eee}
    tr.b td{font-weight:bold;color:#1a1a1a}
    tr.rule td{border-top:1px solid #C9A233;padding-top:8px}
    tr.gap td{height:8px}
    .ft{margin-top:40px;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:10px;font-family:Arial,sans-serif}
  </style></head><body>
    <div class="hd"><div class="brand">Empire OS</div><div class="sub">Financial Statement</div></div>
    <div class="ttl">${title}</div><div class="per">${periodLabel}</div>
    <table>${body}</table>
    <div class="ft">Generated ${new Date().toLocaleString()} · Empire OS · derived from the posted double-entry ledger</div>
    <script>window.onload=function(){window.print()}</script>
  </body></html>`
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

// Small "Save as PDF" / export action button used in statement panel headers.
function ExportBtn({ onClick, label = 'Save as PDF', icon = 'document' }: { onClick: () => void; label?: string; icon?: string }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-widest rounded border border-empire-gold/30 text-empire-gold hover:bg-empire-gold/10 transition-colors">
      <EmpireIcon name={icon as any} size={13} className="text-empire-gold-muted" />{label}
    </button>
  )
}

/* ---------------- Cash Flow ---------------- */
type CFData = { operating: number; investing: number; financing: number; netCashFlow: number; openingCash: number; closingCash: number; activity: { date: string; memo: string; section: string; amount: number }[] }
type CFSeriesPt = { key: string; label: string; operating: number; investing: number; financing: number; net: number; closingCash: number }
type CFForecast = {
  ahead: number; history: CFSeriesPt[]
  trend?: { slope: number; monthlyAvgNet: number; confidenceBand: number }
  forecast: { key: string; label: string; net: number; low: number; high: number; closingCash: number }[]
  projectedClosingCash?: number
  runway: { monthsUntilNegative: number; message: string } | null
  note?: string
}

function CashFlow() {
  const { data: c, loading } = useFin<CFData>('cash-flow')
  const { data: series } = useFin<{ months: number; series: CFSeriesPt[] }>('cash-flow/series?months=12')
  const { data: fc } = useFin<CFForecast>('cash-flow/forecast?months=6')
  if (loading) return <Loading />
  if (!c) return <EmptyState icon="coins" title="No cash flow data" hint="Post entries that touch cash." />
  const cols: Column<CFData['activity'][number]>[] = [
    { key: 'section', label: 'Section', render: r => <Badge tone="muted">{r.section}</Badge> },
    { key: 'memo', label: 'Activity' },
    { key: 'amount', label: 'Amount', align: 'right', render: r => <span className={r.amount >= 0 ? 'text-rag-green' : 'text-empire-text'}>{r.amount >= 0 ? '+' : ''}{eur(r.amount)}</span> },
  ]
  const s = series?.series || []
  // Forecast chart: stitch history closing-cash with projected closing-cash + band.
  const hist = fc?.history || []
  const proj = fc?.forecast || []
  const closingLine = [...hist.map(h => h.closingCash), ...proj.map(p => p.closingCash)]
  const closingLabels = [...hist.map(h => h.label), ...proj.map(p => p.label)]
  const bandHigh = [...hist.map(h => h.closingCash), ...proj.map(p => p.high)]
  const bandLow = [...hist.map(h => h.closingCash), ...proj.map(p => p.low)]

  function exportStatement() {
    printStatement('Cash Flow Statement', 'Indirect roll-up · all posted cash activity', [
      { heading: 'Cash flows by activity', rows: [
        { label: 'Operating activities', amount: c!.operating },
        { label: 'Investing activities', amount: c!.investing },
        { label: 'Financing activities', amount: c!.financing },
        { label: 'Net change in cash', amount: c!.netCashFlow, bold: true, rule: true },
      ] },
      { heading: 'Cash position', rows: [
        { label: 'Opening cash', amount: c!.openingCash },
        { label: 'Closing cash', amount: c!.closingCash, bold: true, rule: true },
      ] },
    ])
  }

  return (
    <div className="space-y-6">
      <Grid cols={4}>
        <KpiCard label="Operating" value={eurK(c.operating)} accent={c.operating >= 0 ? '#3a9d5c' : '#c94f4f'} icon="cog" />
        <KpiCard label="Investing" value={eurK(c.investing)} accent={ACCENT} icon="chart-line" />
        <KpiCard label="Financing" value={eurK(c.financing)} accent={ACCENT} icon="coins" />
        <KpiCard label="Net Cash Flow" value={eurK(c.netCashFlow)} delta={c.netCashFlow >= 0 ? 'inflow' : 'outflow'} deltaGood={c.netCashFlow >= 0} accent={ACCENT} icon={c.netCashFlow >= 0 ? 'arrow-up' : 'arrow-down'} />
      </Grid>

      {s.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Closing Cash (12 mo)" className="lg:col-span-2" icon="chart-line">
            <AreaChart series={s.map(p => p.closingCash)} labels={s.map(p => p.label)} color={ACCENT} height={200} />
            <div className="flex gap-6 mt-3 text-xs text-empire-text-muted">
              <span>Opening {eurK(c.openingCash)}</span><span>Closing {eurK(c.closingCash)}</span>
              <span>Range {eurK(Math.min(...s.map(p => p.closingCash)))} – {eurK(Math.max(...s.map(p => p.closingCash)))}</span>
            </div>
          </Panel>
          <Panel title="Net Cash by Month" icon="chart-bar">
            <BarChart data={s.map(p => p.net)} labels={s.map(p => p.label)} color={ACCENT} height={200} />
          </Panel>
        </div>
      )}

      {fc && proj.length > 0 && (
        <Panel title={`Cash Forecast (${fc.ahead} mo)`} icon="compass"
          actions={fc.runway
            ? <Pill text={`Runway ~${fc.runway.monthsUntilNegative} mo`} color="#c94f4f" />
            : <Pill text="No cash-out in horizon" color="#3a9d5c" />}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <AreaChart series={closingLine} labels={closingLabels} color={ACCENT} height={200} />
              <div className="flex gap-5 mt-3 text-xs text-empire-text-muted flex-wrap">
                <span className="flex items-center gap-2"><span className="w-3 h-0.5" style={{ background: ACCENT }} />Projected closing cash</span>
                <span>Confidence band ±{eurK(fc.trend?.confidenceBand)}</span>
                <span>Avg monthly net {eurK(fc.trend?.monthlyAvgNet)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <KpiCard label="Projected Closing" value={eurK(fc.projectedClosingCash)} sub={`in ${fc.ahead} months`} accent={(fc.projectedClosingCash ?? 0) >= 0 ? '#3a9d5c' : '#c94f4f'} icon="coins" />
              <KpiCard label="Cash Runway" value={fc.runway ? `${fc.runway.monthsUntilNegative} mo` : '∞'} sub={fc.runway ? 'until negative' : 'positive trend'} accent={fc.runway ? '#c94f4f' : '#3a9d5c'} icon="clock" />
              <div className="text-[11px] text-empire-text-dim leading-relaxed">
                {fc.runway?.message || 'At the current trend cash stays positive across the forecast horizon.'} Bands are ±1σ of the trailing trend residual.
              </div>
            </div>
          </div>
        </Panel>
      )}
      {fc?.note && <p className="text-[11px] text-empire-text-dim">{fc.note}</p>}

      <Panel title="Cash Movements (direct method)" icon="chart-line"
        actions={
          <div className="flex items-center gap-2">
            <ExportBtn onClick={exportStatement} />
            <ExportBtn onClick={() => download('/api/finance/export/ledger.csv', 'empire-ledger.csv')} label="Ledger CSV" icon="arrow-down" />
          </div>
        }>
        <DataTable columns={cols} rows={c.activity} empty="No cash activity" />
      </Panel>
    </div>
  )
}

/* ---------------- CapEx / OpEx ---------------- */
type CapexRow = { kind: 'capex' | 'opex'; code: string; name: string; subtype: string | null; amount: number }
type CapexData = {
  totalCapex: number; totalOpex: number; totalSpend: number
  capexPct: number; opexPct: number; capexToOpexRatio: number
  capexAccounts: number; opexAccounts: number
  data: CapexRow[]; page: number; pageSize: number; total: number; totalPages: number
}

function CapexOpex() {
  const [page, setPage] = useState(0)
  const { data: c, loading } = useFin<CapexData>(`capex-opex?pageSize=15&page=${page + 1}`)
  if (loading) return <Loading />
  if (!c) return <EmptyState icon="briefcase" title="No spend data" hint="Post expense or fixed-asset entries to classify CapEx vs OpEx." />
  const cols: Column<CapexRow>[] = [
    { key: 'kind', label: 'Type', render: r => <Pill text={r.kind === 'capex' ? 'CapEx' : 'OpEx'} color={r.kind === 'capex' ? '#4f8ff7' : '#c9a233'} /> },
    { key: 'code', label: 'Account', render: r => <span className="font-mono text-xs text-empire-text-muted">{r.code}</span> },
    { key: 'name', label: 'Name', render: r => <span className="font-medium text-empire-text">{r.name}</span> },
    { key: 'subtype', label: 'Subtype', render: r => <span className="text-empire-text-muted text-xs">{r.subtype || '—'}</span> },
    { key: 'amount', label: 'Amount', align: 'right', render: r => <span className="text-empire-text">{eur(r.amount)}</span> },
  ]
  return (
    <div className="space-y-6">
      <Grid cols={4}>
        <KpiCard label="Total CapEx" value={eurK(c.totalCapex)} sub={`${c.capexAccounts} account${c.capexAccounts === 1 ? '' : 's'}`} accent="#4f8ff7" icon="briefcase" />
        <KpiCard label="Total OpEx" value={eurK(c.totalOpex)} sub={`${c.opexAccounts} account${c.opexAccounts === 1 ? '' : 's'}`} accent={ACCENT} icon="cog" />
        <KpiCard label="CapEx Share" value={`${c.capexPct}%`} sub="of total spend" accent="#4f8ff7" icon="chart-bar" />
        <KpiCard label="CapEx : OpEx" value={`${c.capexToOpexRatio}×`} sub="capital intensity" accent={ACCENT} icon="gauge" />
      </Grid>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Spend Mix" icon="chart-bar">
          <div className="flex justify-center">
            <DonutChart segments={[
              { label: 'CapEx', value: c.totalCapex, color: '#4f8ff7' },
              { label: 'OpEx', value: c.totalOpex, color: ACCENT },
            ]} />
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1.5 text-empire-text-muted"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#4f8ff7' }} />CapEx {c.capexPct}%</span>
            <span className="flex items-center gap-1.5 text-empire-text-muted"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: ACCENT }} />OpEx {c.opexPct}%</span>
          </div>
        </Panel>
        <div className="lg:col-span-2">
          <Panel title={`Spend Breakdown (${c.total})`} icon="document">
            <DataTable columns={cols} rows={c.data} empty="No classified spend yet." />
            <Pagination page={page} pageCount={c.totalPages} total={c.total} onPage={setPage} accent={ACCENT} />
          </Panel>
        </div>
      </div>
    </div>
  )
}

/* ---------------- AR / AP ---------------- */
type AgingData = { ar: { bucket: string; amount: number }[]; ap: { bucket: string; amount: number }[]; totalAR: number; totalAP: number; overdueAR: number; netWorkingCapital: number }

function ARAP() {
  const { data: a, loading } = useFin<AgingData>('aging')
  if (loading) return <Loading />
  if (!a) return <EmptyState icon="card" title="No AR/AP data" hint="Post receivable / payable entries." />
  const cols: Column<{ bucket: string; amount: number }>[] = [
    { key: 'bucket', label: 'Aging Bucket' },
    { key: 'amount', label: 'Amount', align: 'right', render: r => eur(r.amount) },
  ]
  return (
    <div className="space-y-6">
      <Grid cols={4}>
        <KpiCard label="Total Receivable" value={eurK(a.totalAR)} accent="#3a9d5c" icon="arrow-down" />
        <KpiCard label="Total Payable" value={eurK(a.totalAP)} accent="#c94f4f" icon="arrow-up" />
        <KpiCard label="Overdue AR (90d+)" value={eurK(a.overdueAR)} accent="#c94f4f" icon="alert" />
        <KpiCard label="Net Working Capital" value={eurK(a.netWorkingCapital)} accent={ACCENT} icon="gauge" />
      </Grid>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Accounts Receivable — Aging" icon="arrow-down">
          <BarChart data={a.ar.map(x => x.amount)} labels={a.ar.map(x => x.bucket)} color="#3a9d5c" height={160} />
          <div className="mt-4"><DataTable columns={cols} rows={a.ar} /></div>
        </Panel>
        <Panel title="Accounts Payable — Aging" icon="arrow-up">
          <BarChart data={a.ap.map(x => x.amount)} labels={a.ap.map(x => x.bucket)} color="#c94f4f" height={160} />
          <div className="mt-4"><DataTable columns={cols} rows={a.ap} /></div>
        </Panel>
      </div>
    </div>
  )
}

/* ---------------- Spend (manual entry + receipt + PDF) ---------------- */
type Spend = {
  id: string; title: string; amount: number; currency: string; category: string; unitSlug: string
  requestedBy: string; justification: string | null; status: string; decidedBy: string | null; decidedAt: string | null
  vendor: string | null; spentAt: string | null; paymentMethod: string | null; reference: string | null
  taxAmount: number | null; taxRate: number | null; notes: string | null
  receiptName: string | null; receiptType: string | null; receiptData: string | null; createdAt: string
}
type SpendList = { data: Spend[]; page: number; pageSize: number; total: number; totalPages: number }
const SPEND_CATEGORIES = ['tooling', 'travel', 'marketing', 'payroll', 'contractor', 'infra', 'legal', 'misc']
const PAYMENT_METHODS = ['card', 'bank_transfer', 'direct_debit', 'cash', 'invoice']
const SPEND_STATUS_COLOR: Record<string, string> = { pending: '#c9a233', approved: '#3a9d5c', rejected: '#c94f4f' }
const curSym = (c: string) => (c === 'AED' ? 'AED ' : c === 'USD' ? '$' : '€')
const money = (n: number, c = 'EUR') => `${n < 0 ? '-' : ''}${curSym(c)}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Print-to-PDF a clean spend voucher. No dependency — opens a styled window and
// triggers the browser's native "Save as PDF". The receipt image (if any) is embedded.
function exportSpendPdf(s: Spend) {
  const row = (k: string, v: string) => v ? `<tr><td class="k">${k}</td><td class="v">${v}</td></tr>` : ''
  const net = s.taxAmount != null ? s.amount - s.taxAmount : null
  const img = s.receiptData && (s.receiptType || '').startsWith('image/')
    ? `<div class="rc"><div class="lbl">Attached receipt</div><img src="${s.receiptData}" /></div>` : ''
  const pdfNote = s.receiptData && (s.receiptType || '') === 'application/pdf'
    ? `<div class="rc"><div class="lbl">Attached receipt</div><div class="note">PDF receipt on file: ${s.receiptName || 'receipt.pdf'}</div></div>` : ''
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Spend ${s.reference || s.id}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;margin:48px;background:#fff}
    .hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #C9A233;padding-bottom:14px;margin-bottom:24px}
    .brand{font-size:22px;letter-spacing:3px;text-transform:uppercase;color:#1a1a1a}
    .sub{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888}
    .amt{font-size:30px;color:#C9A233}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    td{padding:8px 4px;border-bottom:1px solid #eee;font-size:13px;vertical-align:top}
    td.k{color:#888;text-transform:uppercase;font-size:10px;letter-spacing:1px;width:180px;font-family:Arial,sans-serif}
    td.v{color:#1a1a1a}
    .status{display:inline-block;padding:3px 10px;border:1px solid #C9A233;border-radius:3px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8a6d1f}
    .rc{margin-top:24px} .lbl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px;font-family:Arial,sans-serif}
    .rc img{max-width:100%;max-height:420px;border:1px solid #ddd;border-radius:6px}
    .note{font-size:12px;color:#555;font-family:Arial,sans-serif}
    .ft{margin-top:40px;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:10px;font-family:Arial,sans-serif}
  </style></head><body>
    <div class="hd"><div><div class="brand">Empire OS</div><div class="sub">Spend Voucher</div></div>
      <div style="text-align:right"><div class="amt">${money(s.amount, s.currency)}</div><div class="status">${s.status}</div></div></div>
    <table>
      ${row('Description', s.title)}
      ${row('Vendor', s.vendor || '')}
      ${row('Reference', s.reference || '')}
      ${row('Category', s.category)}
      ${row('Unit', s.unitSlug)}
      ${row('Spent on', s.spentAt ? new Date(s.spentAt).toLocaleDateString() : '')}
      ${row('Payment method', s.paymentMethod ? s.paymentMethod.replace('_', ' ') : '')}
      ${row('Gross amount', money(s.amount, s.currency))}
      ${row('Tax', s.taxAmount != null ? `${money(s.taxAmount, s.currency)}${s.taxRate != null ? ` (${s.taxRate}%)` : ''}` : '')}
      ${row('Net of tax', net != null ? money(net, s.currency) : '')}
      ${row('Requested by', s.requestedBy)}
      ${row('Decision', s.decidedBy ? `${s.status} by ${s.decidedBy}${s.decidedAt ? ` on ${new Date(s.decidedAt).toLocaleDateString()}` : ''}` : '')}
      ${row('Justification', s.justification || '')}
      ${row('Notes', s.notes || '')}
    </table>
    ${img}${pdfNote}
    <div class="ft">Generated ${new Date().toLocaleString()} · Empire OS · ID ${s.id}</div>
    <script>window.onload=function(){window.print()}</script>
  </body></html>`
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

function SpendCenter({ departmentSlug }: { departmentSlug: string }) {
  const [list, setList] = useState<SpendList | null>(null)
  const [page, setPage] = useState(0)
  const [statusF, setStatusF] = useState('')
  const [view, setView] = useState<Spend | null>(null)
  const [edit, setEdit] = useState<Spend | null>(null)
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(() => {
    const q = new URLSearchParams({ page: String(page + 1), pageSize: '10' })
    if (statusF) q.set('status', statusF)
    fetcher(`/api/spend?${q.toString()}`).then(setList).catch(console.error)
  }, [page, statusF])
  useEffect(() => { reload() }, [reload])

  async function decide(id: string, status: 'approved' | 'rejected') {
    setBusyId(id)
    await patch(`/api/spend/${id}/decision`, { status, decidedBy: 'Joud' }).catch(console.error)
    setBusyId(null); reload()
  }
  async function remove(id: string) { await del(`/api/spend/${id}`).catch(console.error); reload() }

  const rows = list?.data || []
  const totalSpent = rows.filter(r => r.status !== 'rejected').reduce((s, r) => s + r.amount, 0)
  const pending = rows.filter(r => r.status === 'pending')
  const pendingTotal = pending.reduce((s, r) => s + r.amount, 0)
  const taxRecoverable = rows.filter(r => r.status === 'approved' && r.taxAmount).reduce((s, r) => s + (r.taxAmount || 0), 0)

  return (
    <div className="space-y-6">
      <Grid cols={4}>
        <KpiCard label="Logged Spend" value={eurK(totalSpent)} sub="this page · excl. rejected" accent={ACCENT} icon="coins" />
        <KpiCard label="Pending Approval" value={`${pending.length}`} sub={eurK(pendingTotal)} accent="#c9a233" icon="clock" />
        <KpiCard label="Recoverable VAT" value={eurK(taxRecoverable)} sub="approved, on this page" accent="#3a9d5c" icon="shield" />
        <KpiCard label="Records" value={`${list?.total ?? 0}`} accent={ACCENT} icon="document" />
      </Grid>

      <Panel title="Manual Spend & Receipts" icon="card"
        actions={
          <div className="flex items-center gap-2">
            <select value={statusF} onChange={e => { setStatusF(e.target.value); setPage(0) }} className="bg-empire-bg border border-empire-border rounded px-2 py-1 text-[11px] text-empire-text-muted">
              <option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
            </select>
            <button onClick={() => setCreating(true)} className="rounded px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black" style={{ background: ACCENT }}>Log spend</button>
          </div>
        }>
        {!list ? <Loading /> : rows.length === 0 ? (
          <EmptyState icon="card" title="No spend logged" hint="Record a manual spend with vendor, tax and a receipt — stored in our DB, never written to a bank." />
        ) : (
          <>
            <div className="space-y-2">
              {rows.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded border border-empire-border/50 bg-empire-bg/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-empire-text font-medium truncate">{s.title}</span>
                      <Pill text={s.status} color={SPEND_STATUS_COLOR[s.status] || '#7a7a82'} />
                      {s.receiptData && <EmpireIcon name="document" size={12} className="text-empire-gold-muted" />}
                    </div>
                    <div className="text-[11px] text-empire-text-dim mt-0.5 truncate">
                      {s.vendor ? `${s.vendor} · ` : ''}{s.category}{s.spentAt ? ` · ${new Date(s.spentAt).toLocaleDateString()}` : ''}{s.reference ? ` · ${s.reference}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-data text-sm text-empire-gold tabular-nums">{money(s.amount, s.currency)}</span>
                    {s.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => decide(s.id, 'approved')} disabled={busyId === s.id} title="Approve" className="rounded px-2 py-1 text-[10px] uppercase tracking-widest text-rag-green border border-rag-green/40 hover:bg-rag-green/10 disabled:opacity-50">Approve</button>
                        <button onClick={() => decide(s.id, 'rejected')} disabled={busyId === s.id} title="Reject" className="rounded px-2 py-1 text-[10px] uppercase tracking-widest text-rag-red border border-rag-red/40 hover:bg-rag-red/10 disabled:opacity-50">Reject</button>
                      </div>
                    )}
                    <button onClick={() => exportSpendPdf(s)} title="Export PDF voucher" className="rounded px-2 py-1 text-[10px] uppercase tracking-widest text-empire-gold border border-empire-gold/40 hover:bg-empire-gold/10">PDF</button>
                    <RowActions onView={() => setView(s)} onEdit={() => setEdit(s)} onDelete={() => remove(s.id)} />
                  </div>
                </div>
              ))}
            </div>
            {list.totalPages > 1 && <div className="mt-4"><Pagination page={page} pageCount={list.totalPages} total={list.total} onPage={setPage} accent={ACCENT} /></div>}
          </>
        )}
      </Panel>

      {/* View */}
      <Modal open={!!view} onClose={() => setView(null)} title={view?.title || 'Spend'} icon={<EmpireIcon name="card" size={18} />} width="max-w-xl">
        {view && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-empire text-empire-gold text-2xl">{money(view.amount, view.currency)}</span>
              <Pill text={view.status} color={SPEND_STATUS_COLOR[view.status] || '#7a7a82'} />
            </div>
            <div className="space-y-0.5">
              <Field label="Vendor">{view.vendor || '—'}</Field>
              <Field label="Reference">{view.reference || '—'}</Field>
              <Field label="Category"><span className="capitalize">{view.category}</span></Field>
              <Field label="Unit"><span className="capitalize">{view.unitSlug}</span></Field>
              <Field label="Spent on">{view.spentAt ? new Date(view.spentAt).toLocaleDateString() : '—'}</Field>
              <Field label="Payment">{view.paymentMethod ? view.paymentMethod.replace('_', ' ') : '—'}</Field>
              <Field label="Tax">{view.taxAmount != null ? `${money(view.taxAmount, view.currency)}${view.taxRate != null ? ` · ${view.taxRate}%` : ''}` : '—'}</Field>
              <Field label="Requested by">{view.requestedBy}</Field>
              {view.decidedBy && <Field label="Decision"><span className="capitalize">{view.status}</span> by {view.decidedBy}</Field>}
              {view.justification && <Field label="Justification">{view.justification}</Field>}
              {view.notes && <Field label="Notes">{view.notes}</Field>}
            </div>
            {view.receiptData && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-empire-text-dim mb-1.5">Receipt</div>
                {(view.receiptType || '').startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={view.receiptData} alt="receipt" className="max-h-64 rounded-lg border border-empire-border object-contain bg-empire-void" />
                ) : (
                  <iframe src={view.receiptData} title="receipt" className="w-full h-64 rounded-lg border border-empire-border bg-empire-void" />
                )}
                <a href={view.receiptData} download={view.receiptName || 'receipt'} className="inline-flex items-center gap-1 text-[11px] text-empire-gold hover:underline mt-1.5">
                  <EmpireIcon name="document" size={11} /> Download {view.receiptName || 'receipt'}
                </a>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => exportSpendPdf(view)} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-gold border border-empire-gold/40 hover:bg-empire-gold/10">Export PDF</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / edit */}
      <SpendEdit spend={edit} creating={creating} departmentSlug={departmentSlug}
        onClose={() => { setEdit(null); setCreating(false) }}
        onSaved={() => { setEdit(null); setCreating(false); reload() }} />
    </div>
  )
}

function SpendEdit({ spend, creating, departmentSlug, onClose, onSaved }: { spend: Spend | null; creating: boolean; departmentSlug: string; onClose: () => void; onSaved: () => void }) {
  const open = !!spend || creating
  const blank = { title: '', amount: '', currency: 'EUR', category: 'tooling', unitSlug: departmentSlug, requestedBy: '', vendor: '', spentAt: new Date().toISOString().slice(0, 10), paymentMethod: 'card', reference: '', taxAmount: '', taxRate: '', justification: '', notes: '' }
  const [f, setF] = useState<typeof blank>(blank)
  const [receipt, setReceipt] = useState({ data: '', name: '', type: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (spend) {
      setF({ title: spend.title, amount: String(spend.amount), currency: spend.currency, category: spend.category, unitSlug: spend.unitSlug, requestedBy: spend.requestedBy, vendor: spend.vendor || '', spentAt: spend.spentAt ? spend.spentAt.slice(0, 10) : '', paymentMethod: spend.paymentMethod || 'card', reference: spend.reference || '', taxAmount: spend.taxAmount != null ? String(spend.taxAmount) : '', taxRate: spend.taxRate != null ? String(spend.taxRate) : '', justification: spend.justification || '', notes: spend.notes || '' })
      setReceipt({ data: spend.receiptData || '', name: spend.receiptName || '', type: spend.receiptType || '' })
    } else if (creating) { setF({ ...blank, unitSlug: departmentSlug }); setReceipt({ data: '', name: '', type: '' }) }
  }, [spend, creating, departmentSlug])

  const set = (k: keyof typeof blank, v: string) => setF(p => ({ ...p, [k]: v }))
  function onReceipt(dataUrl: string) {
    const m = /^data:([^;]+);/.exec(dataUrl)
    setReceipt({ data: dataUrl, type: m ? m[1] : '', name: dataUrl ? (receipt.name || 'receipt') : '' })
  }

  async function save() {
    if (!f.title || !f.amount || !f.requestedBy) return
    setBusy(true)
    const body = {
      ...f, amount: Number(f.amount),
      taxAmount: f.taxAmount === '' ? null : Number(f.taxAmount),
      taxRate: f.taxRate === '' ? null : Number(f.taxRate),
      spentAt: f.spentAt || null,
      receiptData: receipt.data || null, receiptName: receipt.name || null, receiptType: receipt.type || null,
    }
    if (spend) await patch(`/api/spend/${spend.id}`, body).catch(console.error)
    else await post('/api/spend', body).catch(console.error)
    setBusy(false); onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={spend ? 'Edit spend' : 'Log a spend'} icon={<EmpireIcon name={spend ? 'pen' : 'card'} size={18} />} width="max-w-2xl">
      <div className="space-y-3">
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Description</span>
          <input className={modalInput} value={f.title} onChange={e => set('title', e.target.value)} placeholder="What was this for?" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Vendor</span>
            <input className={modalInput} value={f.vendor} onChange={e => set('vendor', e.target.value)} placeholder="Who was paid" /></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Reference</span>
            <input className={modalInput} value={f.reference} onChange={e => set('reference', e.target.value)} placeholder="Invoice / txn ref" /></label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Amount</span>
            <input type="number" step="0.01" className={modalInput} value={f.amount} onChange={e => set('amount', e.target.value)} /></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Currency</span>
            <select className={modalInput} value={f.currency} onChange={e => set('currency', e.target.value)}>
              <option value="EUR">EUR</option><option value="AED">AED</option><option value="USD">USD</option>
            </select></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Spent on</span>
            <input type="date" className={modalInput} value={f.spentAt} onChange={e => set('spentAt', e.target.value)} /></label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Category</span>
            <select className={modalInput} value={f.category} onChange={e => set('category', e.target.value)}>
              {SPEND_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Payment</span>
            <select className={modalInput} value={f.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Unit</span>
            <input className={modalInput} value={f.unitSlug} onChange={e => set('unitSlug', e.target.value)} /></label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Tax amount</span>
            <input type="number" step="0.01" className={modalInput} value={f.taxAmount} onChange={e => set('taxAmount', e.target.value)} placeholder="VAT portion" /></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Tax rate %</span>
            <input type="number" step="0.1" className={modalInput} value={f.taxRate} onChange={e => set('taxRate', e.target.value)} placeholder="21" /></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Requested by</span>
            <input className={modalInput} value={f.requestedBy} onChange={e => set('requestedBy', e.target.value)} placeholder="Name" /></label>
        </div>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Justification</span>
          <input className={modalInput} value={f.justification} onChange={e => set('justification', e.target.value)} placeholder="Why this spend" /></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Notes</span>
          <input className={modalInput} value={f.notes} onChange={e => set('notes', e.target.value)} /></label>
        <FileDrop value={receipt.data} onChange={onReceipt} label="Receipt (PDF or image — stored in our DB)" allowUrl={false} />
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy || !f.title || !f.amount || !f.requestedBy} className="rounded px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50" style={{ background: ACCENT }}>{busy ? 'Saving…' : spend ? 'Save' : 'Log spend'}</button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- Tax Engine ---------------- */
type TaxGuidance = { title: string; impact: 'high' | 'medium' | 'low'; detail: string; estSavingEur: number }
type TaxBracket = { from: number; to: number | null; rate: number; taxable: number; tax: number }
type Jurisdiction = {
  code: 'NL' | 'UAE'; name: string; currency: string; fxRateFromEur: number
  vat: { rate: number; outputVat: number; inputVat: number; netVatPayable: number; reclaimable: number }
  cit: { brackets: TaxBracket[]; total: number; smallBusinessRelief: boolean; effectiveRate: number }
  profitLocal: number; revenueLocal: number; totalTaxLocal: number; totalTaxEur: number
  effectiveTaxRate: number; guidance: TaxGuidance[]
}
type TaxData = {
  period: { from: string; to: string; label: string }
  basis: { revenue: number; cogs: number; opex: number; deductibleExpenses: number; taxableProfit: number; netMarginPct: number }
  fx: { aedPerEur: number }
  jurisdictions: Jurisdiction[]
  recommended: { code: string; name: string; totalTaxEur: number; savingVsHighestEur: number }
}

const IMPACT_COLOR: Record<string, string> = { high: '#3a9d5c', medium: '#c9a233', low: '#7a7a82' }
const localFmt = (n: number, ccy: string) =>
  `${n < 0 ? '-' : ''}${ccy === 'AED' ? 'AED ' : '€'}${Math.abs(Math.round(n)).toLocaleString()}`

function TaxCenter() {
  const { data: t, loading } = useFin<TaxData>('tax')
  if (loading) return <Loading />
  if (!t) return <EmptyState icon="scales" title="No tax basis yet" hint="Post revenue and expense entries to compute tax." />
  const b = t.basis
  const profitable = b.taxableProfit >= 0
  return (
    <div className="space-y-6">
      {/* Taxable basis derived from the ledger P&L */}
      <Grid cols={4}>
        <KpiCard label="Revenue (YTD)" value={eurK(b.revenue)} accent={ACCENT} icon="chart-line" />
        <KpiCard label="Deductible Expenses" value={eurK(b.deductibleExpenses)} sub={`COGS ${eurK(b.cogs)} · OpEx ${eurK(b.opex)}`} accent="#c94f4f" icon="card" />
        <KpiCard label="Taxable Profit" value={eurK(b.taxableProfit)} delta={profitable ? 'profit' : 'loss'} deltaGood={profitable} accent={profitable ? '#3a9d5c' : '#c94f4f'} icon="finance" />
        <KpiCard label="Net Margin" value={`${b.netMarginPct}%`} accent={b.netMarginPct >= 0 ? '#3a9d5c' : '#c94f4f'} icon="gauge" />
      </Grid>

      {/* Recommendation banner */}
      <div className="rounded-lg border border-empire-gold/30 glass-gold px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <EmpireIcon name="scales" size={18} className="text-empire-gold" />
          <div>
            <div className="text-[11px] uppercase tracking-wide text-empire-text-dim">Lowest total tax burden</div>
            <div className="text-sm text-empire-text font-medium">{t.recommended.name} — {eur(t.recommended.totalTaxEur)} payable</div>
          </div>
        </div>
        {t.recommended.savingVsHighestEur > 0 && (
          <Pill text={`Saves ${eur(t.recommended.savingVsHighestEur)} vs alternative`} color="#3a9d5c" />
        )}
      </div>

      {/* Side-by-side jurisdictions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {t.jurisdictions.map(j => (
          <JurisdictionCard key={j.code} j={j} recommended={j.code === t.recommended.code} />
        ))}
      </div>

      <DutchFilingCenter />

      <p className="text-[11px] text-empire-text-dim">
        Statutory rates: NL VAT 21% · CIT 19% to €200k, 25.8% above. UAE VAT 5% · CIT 0% to AED 375k, 9% above
        (Small Business Relief 0% under AED 3M through 2026). UAE figures converted at {t.fx.aedPerEur} AED/€.
        Computed from {t.period.label} ledger activity — guidance is indicative, not filed advice.
      </p>
    </div>
  )
}

type FilingField = { code: string; label: string; amount: number; tax?: number; source: string }
type FilingForm = { type: string; period: string; form: FilingField[]; totals: Record<string, number>; warnings: string[] }

function DutchFilingCenter() {
  const now = new Date()
  const [period, setPeriod] = useState(`${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`)
  const [year, setYear] = useState(String(now.getFullYear()))
  const [vat, setVat] = useState<FilingForm | null>(null)
  const [vpb, setVpb] = useState<FilingForm | null>(null)
  const [recipient, setRecipient] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    const [vatForm, vpbForm] = await Promise.all([
      fetcher(`/api/finance/tax/nl-filing?period=${encodeURIComponent(period)}`),
      fetcher(`/api/finance/tax/nl-aangifte?year=${encodeURIComponent(year)}`),
    ])
    setVat(vatForm); setVpb(vpbForm)
  }
  async function save(form: FilingForm) {
    await post('/api/finance/tax/filings', { type: form.type, period: form.period, values: form, status: 'draft' })
    setMsg(`${form.type} draft saved`)
  }
  async function remind() {
    await post('/api/finance/tax/reminders', { filingType: 'NL_BTW', recipient, dueDate, remindDays: [30, 14, 7, 1] })
    setMsg('Email reminder scheduled')
  }

  return <Panel title="Dutch filing forms" icon="document">
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-empire-text-muted">VAT quarter<input className={`${modalInput} mt-1 w-28`} value={period} onChange={e => setPeriod(e.target.value)} /></label>
        <label className="text-xs text-empire-text-muted">Aangifte year<input className={`${modalInput} mt-1 w-24`} value={year} onChange={e => setYear(e.target.value)} /></label>
        <button className="empire-btn-primary" onClick={load}>Build forms</button>
      </div>
      {[vat, vpb].filter(Boolean).map(form => <div key={form!.type} className="rounded-lg border border-empire-border p-3">
        <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold text-empire-text">{form!.type} · {form!.period}</h3><button className="text-xs text-empire-gold" onClick={() => save(form!)}>Save draft</button></div>
        <div className="space-y-1">{form!.form.map(row => <div key={row.code} className="grid grid-cols-[3rem_1fr_auto] gap-2 border-t border-empire-border/40 py-1.5 text-xs"><span className="font-data text-empire-gold">{row.code}</span><span className="text-empire-text-muted" title={row.source}>{row.label}</span><span className="font-data text-empire-text">{eur(row.amount)}</span></div>)}</div>
        {form!.warnings.map(w => <p key={w} className="mt-2 text-[10px] text-rag-amber">{w}</p>)}
      </div>)}
      <div className="grid gap-2 border-t border-empire-border pt-3 sm:grid-cols-[1fr_10rem_auto]">
        <input type="email" className={modalInput} placeholder="Reminder email" value={recipient} onChange={e => setRecipient(e.target.value)} />
        <input type="date" className={modalInput} value={dueDate} onChange={e => setDueDate(e.target.value)} />
        <button className="empire-btn-primary" onClick={remind} disabled={!recipient || !dueDate}>Schedule reminder</button>
      </div>
      {msg && <p className="text-xs text-empire-green-bright">{msg}</p>}
    </div>
  </Panel>
}

function JurisdictionCard({ j, recommended }: { j: Jurisdiction; recommended: boolean }) {
  const vatPayable = j.vat.netVatPayable
  const sortedGuidance = [...j.guidance].sort((a, c) => c.estSavingEur - a.estSavingEur)
  return (
    <Panel
      title={`${j.name} (${j.currency})`}
      icon={j.code === 'NL' ? 'compass' : 'flag'}
      actions={recommended ? <Pill text="Recommended" color="#3a9d5c" /> : undefined}
    >
      <div className="space-y-4">
        <Grid cols={2}>
          <KpiCard label="Corporate Income Tax" value={localFmt(j.cit.total, j.currency)} sub={`eff. ${j.cit.effectiveRate}%${j.cit.smallBusinessRelief ? ' · relief' : ''}`} accent={ACCENT} icon="finance" />
          <KpiCard label={vatPayable >= 0 ? 'Net VAT Payable' : 'VAT Reclaimable'} value={localFmt(Math.abs(vatPayable), j.currency)} accent={vatPayable >= 0 ? '#c94f4f' : '#3a9d5c'} icon="coins" />
        </Grid>

        <div>
          <div className="text-[11px] uppercase tracking-wide text-empire-text-dim mb-1.5">Total tax burden</div>
          <div className="flex items-baseline justify-between border-t border-empire-border/40 pt-2">
            <span className="text-sm text-empire-text-muted">{j.code === 'NL' ? 'In EUR' : `In ${j.currency} (€${Math.round(j.totalTaxEur).toLocaleString()})`}</span>
            <span className="font-empire text-empire-gold text-lg">{localFmt(j.totalTaxLocal, j.currency)}</span>
          </div>
          <div className="mt-1"><ProgressBar value={Math.min(100, j.effectiveTaxRate)} color={ACCENT} /></div>
          <div className="text-[10px] text-empire-text-dim mt-0.5">{j.effectiveTaxRate}% effective on revenue</div>
        </div>

        {j.cit.brackets.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-empire-text-dim mb-1">CIT brackets</div>
            {j.cit.brackets.map((bk, i) => (
              <Field key={i} label={`${(bk.rate * 100).toFixed(bk.rate * 100 % 1 ? 1 : 0)}% · ${localFmt(bk.from, j.currency)}${bk.to ? `–${localFmt(bk.to, j.currency)}` : '+'}`}>
                {localFmt(bk.tax, j.currency)}
              </Field>
            ))}
          </div>
        )}

        <div>
          <div className="text-[11px] uppercase tracking-wide text-empire-text-dim mb-1.5">How to lower it</div>
          <div className="space-y-2">
            {sortedGuidance.map((g, i) => (
              <div key={i} className="rounded border border-empire-border/50 bg-empire-bg/40 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-empire-text font-medium flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: IMPACT_COLOR[g.impact] }} />
                    {g.title}
                  </span>
                  {g.estSavingEur > 0 && <Pill text={`~${eur(g.estSavingEur)}`} color={IMPACT_COLOR[g.impact]} />}
                </div>
                <p className="text-xs text-empire-text-dim mt-1 leading-relaxed">{g.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}

/* ---------------- Ledger (journal + post entry) ---------------- */
type Account = { id: string; code: string; name: string; type: string; balance: number; debitTotal?: number; creditTotal?: number; subtype?: string; sortOrder?: number }
const ACCT_TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense']
const ACCT_TYPE_COLOR: Record<string, string> = { asset: '#3a9d5c', liability: '#c94f4f', equity: '#4f8ff7', revenue: '#c9a233', expense: '#b06ad6' }
type JournalEntry = { id: string; date: string; memo: string; source: string; debitTotal: number; creditTotal: number; lines: { id: string; debit: number; credit: number; account: { code: string; name: string } }[] }
type JournalPage = { data: JournalEntry[]; page: number; pageSize: number; total: number; totalPages: number }

function Ledger({ departmentSlug }: { departmentSlug: string }) {
  const { data: accts, reload: reloadAccts } = useFin<Account[]>('accounts')
  const [page, setPage] = useState(0) // 0-based for the Pagination molecule
  const { data: journal, loading, reload } = useFin<JournalPage>(`journal?pageSize=25&page=${page + 1}`)
  const [showForm, setShowForm] = useState(false)
  const [memo, setMemo] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState([{ accountId: '', debit: '', credit: '' }, { accountId: '', debit: '', credit: '' }])
  const [err, setErr] = useState('')
  // CRUD modal state
  const [viewAcct, setViewAcct] = useState<Account | null>(null)
  const [editAcct, setEditAcct] = useState<Account | null>(null)
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null)

  async function deleteAccount(id: string) { await del(`/api/finance/accounts/${id}`).catch(e => setErr(e?.message || 'delete failed')); reloadAccts() }
  async function deleteEntry(id: string) { await del(`/api/finance/journal/${id}`).catch(e => setErr(e?.message || 'delete failed')); setPage(0); reload() }

  const debit = rows.reduce((s, r) => s + (Number(r.debit) || 0), 0)
  const credit = rows.reduce((s, r) => s + (Number(r.credit) || 0), 0)
  const balanced = Math.abs(debit - credit) < 0.005 && debit > 0

  async function submit() {
    setErr('')
    if (!memo || !balanced) { setErr('Entry must have a memo and balance (debits = credits).'); return }
    try {
      await post('/api/finance/journal', {
        date, memo, departmentSlug,
        lines: rows.filter(r => r.accountId && (Number(r.debit) || Number(r.credit))).map(r => ({ accountId: r.accountId, debit: Number(r.debit) || 0, credit: Number(r.credit) || 0 })),
      })
      setMemo(''); setRows([{ accountId: '', debit: '', credit: '' }, { accountId: '', debit: '', credit: '' }]); setShowForm(false); setPage(0); reload()
    } catch (e: any) { setErr(e?.message || 'Failed to post entry') }
  }

  const cols: Column<JournalEntry>[] = [
    { key: 'date', label: 'Date', render: r => <span className="text-empire-text-muted text-xs">{new Date(r.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span> },
    { key: 'memo', label: 'Memo', render: r => <div><div className="text-empire-text text-sm">{r.memo}</div><div className="text-empire-text-dim text-[11px]">{r.lines.map(l => l.account.code).join(' · ')}</div></div> },
    { key: 'source', label: 'Source', align: 'center', render: r => <Badge tone={r.source === 'manual' ? 'gold' : 'muted'}>{r.source}</Badge> },
    { key: 'debitTotal', label: 'Amount', align: 'right', render: r => <span className="tabular-nums">{eur(r.debitTotal)}</span> },
    { key: 'actions', label: '', align: 'right', render: r => (
      <RowActions
        onView={() => setViewEntry(r)}
        onDelete={() => deleteEntry(r.id)}
        deleteLabel={`the entry “${r.memo}”`}
      />
    ) },
  ]

  // Trial balance health — the sum of every account's debit & credit movement.
  // In a correct double-entry ledger these are equal to the cent.
  const tbDebit = (accts || []).reduce((s, a) => s + (a.debitTotal || 0), 0)
  const tbCredit = (accts || []).reduce((s, a) => s + (a.creditTotal || 0), 0)
  const tbBalanced = Math.abs(tbDebit - tbCredit) < 0.005
  const manualCount = (journal?.data || []).filter(e => e.source === 'manual').length

  return (
    <div className="space-y-6">
      <Grid cols={4}>
        <KpiCard label="Posted Entries" value={`${journal?.total ?? 0}`} sub="all balanced" accent={ACCENT} icon="book" />
        <KpiCard label="Trial Balance" value={tbBalanced ? 'In balance' : `Off ${eur(tbDebit - tbCredit)}`} sub={`Dr ${eurK(tbDebit)} = Cr ${eurK(tbCredit)}`} accent={tbBalanced ? '#3a9d5c' : '#c94f4f'} icon={tbBalanced ? 'check' : 'alert'} />
        <KpiCard label="Accounts" value={`${accts?.length ?? 0}`} sub="chart of accounts" accent={ACCENT} icon="document" />
        <KpiCard label="Manual / Page" value={`${manualCount}`} sub="hand-posted entries" accent="#b06ad6" icon="pen" />
      </Grid>

      <div className="flex items-center justify-between">
        <p className="text-empire-text-muted text-xs">{journal?.total ?? 0} posted entries · every one balances to the cent.</p>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-empire-gold-dim border border-empire-gold/30 text-empire-gold text-xs uppercase tracking-widest rounded hover:bg-empire-gold/20 transition-colors">
          <EmpireIcon name="plus" size={13} className="text-empire-gold-muted" />Journal Entry
        </button>
      </div>

      {showForm && (
        <div className="bg-empire-surface border border-empire-gold/20 rounded-lg p-5 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="empire-input" />
            <input placeholder="Memo (e.g. Stripe payout)" value={memo} onChange={e => setMemo(e.target.value)} className="empire-input col-span-2" />
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[11px] uppercase tracking-wider text-empire-text-dim px-1">
              <span className="col-span-6">Account</span><span className="col-span-3 text-right">Debit</span><span className="col-span-3 text-right">Credit</span>
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <select value={r.accountId} onChange={e => setRows(rows.map((x, j) => j === i ? { ...x, accountId: e.target.value } : x))} className="empire-input col-span-6">
                  <option value="">— select account —</option>
                  {accts?.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
                </select>
                <input type="number" placeholder="0" value={r.debit} onChange={e => setRows(rows.map((x, j) => j === i ? { ...x, debit: e.target.value, credit: e.target.value ? '' : x.credit } : x))} className="empire-input col-span-3 text-right" />
                <input type="number" placeholder="0" value={r.credit} onChange={e => setRows(rows.map((x, j) => j === i ? { ...x, credit: e.target.value, debit: e.target.value ? '' : x.debit } : x))} className="empire-input col-span-3 text-right" />
              </div>
            ))}
            <button onClick={() => setRows([...rows, { accountId: '', debit: '', credit: '' }])} className="inline-flex items-center gap-1 text-empire-gold text-xs hover:underline"><EmpireIcon name="plus" size={12} />add line</button>
          </div>
          <div className="flex items-center justify-between border-t border-empire-border pt-3">
            <span className={`inline-flex items-center gap-1.5 text-xs ${balanced ? 'text-rag-green' : 'text-rag-red'}`}>Debits {eur(debit)} · Credits {eur(credit)}{balanced ? <><span>· balanced</span><EmpireIcon name="check" size={12} /></> : ' · must balance'}</span>
            <button onClick={submit} disabled={!balanced} className="empire-btn-primary disabled:opacity-40 disabled:cursor-not-allowed">Post Entry</button>
          </div>
          {err && <p className="text-rag-red text-xs">{err}</p>}
        </div>
      )}

      <Panel title="Chart of Accounts" icon="book">
        {accts && accts.length > 0 ? (
          <div className="space-y-5">
            {ACCT_TYPE_ORDER.filter(t => accts.some(a => a.type === t)).map(type => {
              const group = accts.filter(a => a.type === type).sort((a, b) => a.code.localeCompare(b.code))
              const subtotal = group.reduce((s, a) => s + (a.balance || 0), 0)
              const color = ACCT_TYPE_COLOR[type] || ACCENT
              return (
                <div key={type}>
                  <div className="flex items-center justify-between border-b border-empire-border/60 pb-1.5 mb-2.5">
                    <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest" style={{ color }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />{type}
                      <span className="text-empire-text-dim normal-case tracking-normal">· {group.length}</span>
                    </span>
                    <span className="font-data text-xs tabular-nums" style={{ color }}>{eur(subtotal)}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {group.map(a => (
                      <div key={a.id} className="bg-empire-surface border border-empire-border rounded-lg p-3 group hover:border-empire-gold/40 transition-colors">
                        <div className="flex items-start justify-between gap-1">
                          <div className="font-data text-empire-text-dim text-[11px]">{a.code}{a.subtype ? ` · ${a.subtype.replace(/_/g, ' ')}` : ''}</div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <RowActions
                              size={13}
                              onView={() => setViewAcct(a)}
                              onEdit={() => setEditAcct(a)}
                              onDelete={() => deleteAccount(a.id)}
                              deleteLabel={`account ${a.code} · ${a.name}`}
                            />
                          </div>
                        </div>
                        <div className="text-empire-text text-xs font-medium truncate">{a.name}</div>
                        <div className="text-sm tabular-nums mt-1 font-data" style={{ color }}>{eur(a.balance)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : <EmptyState icon="book" title="No accounts" hint="Seed or create a chart of accounts." />}
      </Panel>

      <Panel title="General Journal" icon="document"
        actions={<ExportBtn onClick={() => download('/api/finance/export/ledger.csv', 'empire-ledger.csv')} label="Export CSV" icon="arrow-down" />}>
        {loading ? <Loading /> : <DataTable columns={cols} rows={journal?.data || []} empty="No journal entries yet" />}
        {journal && (
          <Pagination page={page} pageCount={journal.totalPages} total={journal.total} onPage={setPage} accent={ACCENT} />
        )}
      </Panel>

      {/* View account */}
      <Modal open={!!viewAcct} onClose={() => setViewAcct(null)} title={viewAcct ? `${viewAcct.code} · ${viewAcct.name}` : 'Account'} icon={<EmpireIcon name="book" size={18} />}>
        {viewAcct && (
          <div className="space-y-0.5">
            <Field label="Code">{viewAcct.code}</Field>
            <Field label="Name">{viewAcct.name}</Field>
            <Field label="Type"><span className="capitalize">{viewAcct.type}</span></Field>
            {viewAcct.subtype && <Field label="Subtype"><span className="capitalize">{viewAcct.subtype.replace(/_/g, ' ')}</span></Field>}
            {viewAcct.debitTotal != null && <Field label="Total Debits"><span className="tabular-nums">{eur(viewAcct.debitTotal)}</span></Field>}
            {viewAcct.creditTotal != null && <Field label="Total Credits"><span className="tabular-nums">{eur(viewAcct.creditTotal)}</span></Field>}
            <Field label="Balance"><span className="text-empire-gold tabular-nums">{eur(viewAcct.balance)}</span></Field>
          </div>
        )}
      </Modal>

      {/* Edit account */}
      <AccountEdit account={editAcct} onClose={() => setEditAcct(null)} onSaved={() => { setEditAcct(null); reloadAccts() }} />

      {/* View journal entry */}
      <Modal open={!!viewEntry} onClose={() => setViewEntry(null)} title={viewEntry?.memo || 'Journal entry'} icon={<EmpireIcon name="document" size={18} />} width="max-w-xl">
        {viewEntry && (
          <div className="space-y-3">
            <div className="space-y-0.5">
              <Field label="Date">{new Date(viewEntry.date).toLocaleDateString()}</Field>
              <Field label="Source"><span className="capitalize">{viewEntry.source}</span></Field>
              <Field label="Total"><span className="tabular-nums">{eur(viewEntry.debitTotal)}</span></Field>
            </div>
            <div className="rounded-lg border border-empire-border overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="text-empire-text-dim text-[10px] uppercase tracking-wide"><th className="text-left px-3 py-1.5">Account</th><th className="text-right px-3 py-1.5">Debit</th><th className="text-right px-3 py-1.5">Credit</th></tr></thead>
                <tbody>
                  {viewEntry.lines.map(l => (
                    <tr key={l.id} className="border-t border-empire-border/40">
                      <td className="px-3 py-1.5 text-empire-text-muted">{l.account.code} · {l.account.name}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{l.debit ? eur(l.debit) : '—'}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{l.credit ? eur(l.credit) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {err && <p className="text-rag-red text-xs">{err}</p>}
    </div>
  )
}

/* Edit a ledger account (name / subtype / sortOrder — code & type are immutable). */
function AccountEdit({ account, onClose, onSaved }: { account: Account | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<{ name: string; sortOrder: string }>({ name: '', sortOrder: '0' })
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (account) setF({ name: account.name, sortOrder: String((account as any).sortOrder ?? 0) }) }, [account])
  async function save() {
    if (!account) return
    setBusy(true)
    await patch(`/api/finance/accounts/${account.id}`, { name: f.name, sortOrder: Number(f.sortOrder) || 0 }).catch(console.error)
    setBusy(false); onSaved()
  }
  return (
    <Modal open={!!account} onClose={onClose} title="Edit account" icon={<EmpireIcon name="pen" size={18} />}>
      <div className="space-y-3">
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Name</span>
          <input className={modalInput} value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} /></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Sort order</span>
          <input type="number" className={modalInput} value={f.sortOrder} onChange={e => setF(p => ({ ...p, sortOrder: e.target.value }))} /></label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy || !f.name} className="rounded px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50" style={{ background: ACCENT }}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- Bank Connections (open banking) ---------------- */
type BankProvider = { id: string; name: string; region: string; method: string; feasible: boolean; institutions: string[]; note: string }
type BankRegion = { region: string; label: string; feasible: boolean; framework: string; summary: string; providers: string[] }
type Feasibility = { regions: BankRegion[]; providers: BankProvider[] }
type BankConn = { id: string; provider: string; region: string; institution: string; accountName: string | null; iban: string | null; currency: string; status: string; lastSyncedAt: string | null; consentExpiresAt: string | null; balance: number }
type ConnList = { data: BankConn[]; total: number; totalPages: number; totalBalance: number; connected: number }

const CONN_STATUS_COLOR: Record<string, string> = { connected: '#3a9d5c', pending: '#c9a233', disconnected: '#7a7a82', error: '#c94f4f' }

function BankCenter() {
  const { data: feas } = useFin<Feasibility>('bank/feasibility')
  const [conns, setConns] = useState<ConnList | null>(null)
  const [page, setPage] = useState(0)
  const [edit, setEdit] = useState<BankConn | null>(null)
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(() => {
    fetcher(`/api/finance/bank/connections?page=${page + 1}&pageSize=10`).then(setConns).catch(console.error)
  }, [page])
  useEffect(() => { reload() }, [reload])

  async function sync(id: string) {
    setBusyId(id)
    await post(`/api/finance/bank/connections/${id}/sync`, {}).catch(console.error)
    setBusyId(null); reload()
  }
  async function remove(id: string) {
    await del(`/api/finance/bank/connections/${id}`).catch(console.error); reload()
  }

  return (
    <div className="space-y-6">
      {/* Feasibility briefing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {feas?.regions.map(r => (
          <Panel key={r.region} title={r.label} icon={r.region === 'NL' ? 'compass' : 'flag'}
            actions={<Pill text={r.feasible ? 'Feasible today' : 'Not yet'} color={r.feasible ? '#3a9d5c' : '#c94f4f'} />}>
            <div className="space-y-2">
              <Field label="Framework">{r.framework}</Field>
              <p className="text-xs text-empire-text-dim leading-relaxed">{r.summary}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {feas.providers.filter(p => r.providers.includes(p.id)).map(p => (
                  <span key={p.id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] text-empire-text-muted border border-empire-border/60 bg-empire-bg/40" title={p.note}>{p.name}</span>
                ))}
              </div>
            </div>
          </Panel>
        ))}
      </div>

      {/* Connections */}
      <Panel title="Linked Accounts" icon="card"
        actions={<button onClick={() => setCreating(true)} className="rounded px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black" style={{ background: ACCENT }}>Connect bank</button>}>
        {!conns ? <Loading /> : conns.data.length === 0 ? (
          <EmptyState icon="card" title="No banks linked" hint="Connect an account to pull balances and transactions." />
        ) : (
          <>
            <Grid cols={3}>
              <KpiCard label="Linked Accounts" value={`${conns.total}`} accent={ACCENT} icon="card" />
              <KpiCard label="Connected (live)" value={`${conns.connected}`} accent="#3a9d5c" icon="check" />
              <KpiCard label="Aggregate Balance" value={eurK(conns.totalBalance)} sub="connected accounts" accent={ACCENT} icon="coins" />
            </Grid>
            <div className="mt-4 space-y-2">
              {conns.data.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded border border-empire-border/50 bg-empire-bg/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-empire-text font-medium truncate">{c.institution}</span>
                      <Pill text={c.status} color={CONN_STATUS_COLOR[c.status] || '#7a7a82'} />
                      <span className="text-[10px] uppercase tracking-wide text-empire-text-dim">{c.region}</span>
                    </div>
                    <div className="text-[11px] text-empire-text-dim mt-0.5 truncate">
                      {c.accountName ? `${c.accountName} · ` : ''}{c.provider}{c.lastSyncedAt ? ` · synced ${new Date(c.lastSyncedAt).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => sync(c.id)} disabled={busyId === c.id} className="rounded px-2.5 py-1 text-[10px] uppercase tracking-widest text-empire-gold border border-empire-gold/40 hover:bg-empire-gold/10 disabled:opacity-50">{busyId === c.id ? 'Syncing…' : 'Sync'}</button>
                    <RowActions onEdit={() => setEdit(c)} onDelete={() => remove(c.id)} />
                  </div>
                </div>
              ))}
            </div>
            {conns.totalPages > 1 && (
              <div className="mt-4"><Pagination page={page} pageCount={conns.totalPages} total={conns.total} onPage={setPage} accent={ACCENT} /></div>
            )}
          </>
        )}
      </Panel>

      <BankConnectionEdit conn={edit} creating={creating} providers={feas?.providers || []}
        onClose={() => { setEdit(null); setCreating(false) }}
        onSaved={() => { setEdit(null); setCreating(false); reload() }} />
    </div>
  )
}

function BankConnectionEdit({ conn, creating, providers, onClose, onSaved }: { conn: BankConn | null; creating: boolean; providers: BankProvider[]; onClose: () => void; onSaved: () => void }) {
  const open = !!conn || creating
  const [f, setF] = useState({ provider: 'gocardless', region: 'NL', institution: '', accountName: '', iban: '', currency: 'EUR', status: 'pending' })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (conn) setF({ provider: conn.provider, region: conn.region, institution: conn.institution, accountName: conn.accountName || '', iban: conn.iban || '', currency: conn.currency, status: conn.status })
    else if (creating) setF({ provider: 'gocardless', region: 'NL', institution: '', accountName: '', iban: '', currency: 'EUR', status: 'pending' })
  }, [conn, creating])

  const provider = providers.find(p => p.id === f.provider)
  const institutions = provider?.institutions.filter(i => i !== 'Any') || []

  async function save() {
    if (!f.institution) return
    setBusy(true)
    const body = { provider: f.provider, region: f.region, institution: f.institution, accountName: f.accountName || null, iban: f.iban || null, currency: f.currency, status: f.status }
    if (conn) await patch(`/api/finance/bank/connections/${conn.id}`, body).catch(console.error)
    else await post('/api/finance/bank/connections', body).catch(console.error)
    setBusy(false); onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={conn ? 'Edit connection' : 'Connect a bank'} icon={<EmpireIcon name={conn ? 'pen' : 'card'} size={18} />} width="max-w-md">
      <div className="space-y-3">
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Region</span>
          <select className={modalInput} value={f.region} onChange={e => setF(p => ({ ...p, region: e.target.value }))}>
            <option value="NL">Netherlands</option><option value="UAE">United Arab Emirates</option><option value="EU">EU (other)</option>
          </select></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Provider</span>
          <select className={modalInput} value={f.provider} onChange={e => setF(p => ({ ...p, provider: e.target.value }))}>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.method})</option>)}
          </select></label>
        {provider && <p className="text-[11px] text-empire-text-dim -mt-1 leading-relaxed">{provider.note}</p>}
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Institution</span>
          {institutions.length > 0 ? (
            <select className={modalInput} value={f.institution} onChange={e => setF(p => ({ ...p, institution: e.target.value }))}>
              <option value="">Select bank…</option>
              {institutions.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          ) : (
            <input className={modalInput} value={f.institution} onChange={e => setF(p => ({ ...p, institution: e.target.value }))} placeholder="Bank name" />
          )}</label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Account name</span>
            <input className={modalInput} value={f.accountName} onChange={e => setF(p => ({ ...p, accountName: e.target.value }))} placeholder="e.g. Operating" /></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">Currency</span>
            <select className={modalInput} value={f.currency} onChange={e => setF(p => ({ ...p, currency: e.target.value }))}>
              <option value="EUR">EUR</option><option value="AED">AED</option><option value="USD">USD</option>
            </select></label>
        </div>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-empire-text-muted">IBAN (last 4 / masked)</span>
          <input className={modalInput} value={f.iban} onChange={e => setF(p => ({ ...p, iban: e.target.value }))} placeholder="•••• 4521" /></label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={busy} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy || !f.institution} className="rounded px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50" style={{ background: ACCENT }}>{busy ? 'Saving…' : conn ? 'Save' : 'Connect'}</button>
        </div>
      </div>
    </Modal>
  )
}
