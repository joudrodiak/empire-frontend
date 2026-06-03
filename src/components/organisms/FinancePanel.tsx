'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { fetcher, post, patch, del } from '@/lib/api'
import { KpiCard, Panel, AreaChart, BarChart, DonutChart, ProgressBar, DataTable, Badge, TabBar, Grid, EmptyState, type Column } from '@/lib/ui'
import { Pagination } from '@/components/molecules/Pagination'
import { RowActions } from '@/components/molecules/RowActions'
import { Modal } from '@/components/molecules/Modal'
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
  { id: 'arap', label: 'AR / AP' },
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
      {tab === 'arap' && <ARAP />}
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
  return (
    <div className="space-y-6">
      <Grid cols={4}>
        <KpiCard label="Revenue" value={eurK(p.revenue)} accent={ACCENT} icon="chart-line" />
        <KpiCard label="Gross Profit" value={eurK(p.grossProfit)} sub={`${p.grossMarginPct}% margin`} accent="#3a9d5c" icon="coins" />
        <KpiCard label="Operating Income" value={eurK(p.operatingIncome)} accent={ACCENT} icon="gauge" />
        <KpiCard label="Net Income" value={eurK(p.netIncome)} delta={p.netIncome >= 0 ? 'profit' : 'loss'} deltaGood={p.netIncome >= 0} accent={p.netIncome >= 0 ? '#3a9d5c' : '#c94f4f'} icon="finance" />
      </Grid>
      <Panel title="Income Statement" icon="document"><DataTable columns={cols} rows={rows} /></Panel>
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
  return (
    <div className="space-y-6">
      <Grid cols={4}>
        <KpiCard label="Total Assets" value={eurK(b.totalAssets)} accent={ACCENT} icon="coins" />
        <KpiCard label="Total Liabilities" value={eurK(b.totalLiabilities)} accent="#c94f4f" icon="card" />
        <KpiCard label="Total Equity" value={eurK(b.totalEquity)} sub={`incl. retained ${eurK(b.retainedEarnings)}`} accent="#3a9d5c" icon="shield" />
        <KpiCard label="A = L + E" value={b.balanced ? 'Balanced' : `Off ${eur(b.difference)}`} accent={b.balanced ? '#3a9d5c' : '#c94f4f'} icon={b.balanced ? 'check' : 'alert'} />
      </Grid>
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

/* ---------------- Cash Flow ---------------- */
type CFData = { operating: number; investing: number; financing: number; netCashFlow: number; openingCash: number; closingCash: number; activity: { date: string; memo: string; section: string; amount: number }[] }

function CashFlow() {
  const { data: c, loading } = useFin<CFData>('cash-flow')
  if (loading) return <Loading />
  if (!c) return <EmptyState icon="coins" title="No cash flow data" hint="Post entries that touch cash." />
  const cols: Column<CFData['activity'][number]>[] = [
    { key: 'section', label: 'Section', render: r => <Badge tone="muted">{r.section}</Badge> },
    { key: 'memo', label: 'Activity' },
    { key: 'amount', label: 'Amount', align: 'right', render: r => <span className={r.amount >= 0 ? 'text-rag-green' : 'text-empire-text'}>{r.amount >= 0 ? '+' : ''}{eur(r.amount)}</span> },
  ]
  return (
    <div className="space-y-6">
      <Grid cols={4}>
        <KpiCard label="Operating" value={eurK(c.operating)} accent={c.operating >= 0 ? '#3a9d5c' : '#c94f4f'} icon="cog" />
        <KpiCard label="Investing" value={eurK(c.investing)} accent={ACCENT} icon="chart-line" />
        <KpiCard label="Financing" value={eurK(c.financing)} accent={ACCENT} icon="coins" />
        <KpiCard label="Net Cash Flow" value={eurK(c.netCashFlow)} delta={c.netCashFlow >= 0 ? 'inflow' : 'outflow'} deltaGood={c.netCashFlow >= 0} accent={ACCENT} icon={c.netCashFlow >= 0 ? 'arrow-up' : 'arrow-down'} />
      </Grid>
      <Panel title="Cash Movements (direct method)" icon="chart-line"><DataTable columns={cols} rows={c.activity} empty="No cash activity" /></Panel>
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

/* ---------------- Ledger (journal + post entry) ---------------- */
type Account = { id: string; code: string; name: string; type: string; balance: number }
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

  return (
    <div className="space-y-6">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {accts.map(a => (
              <div key={a.id} className="bg-empire-surface border border-empire-border rounded-lg p-3 group">
                <div className="flex items-start justify-between gap-1">
                  <div className="text-empire-text-dim text-[11px]">{a.code} · {a.type}</div>
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
                <div className="text-empire-gold text-sm tabular-nums mt-1">{eur(a.balance)}</div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon="book" title="No accounts" hint="Seed or create a chart of accounts." />}
      </Panel>

      <Panel title="General Journal" icon="document">
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
