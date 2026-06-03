'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { fetcher, post, patch, del, ragColor, ragLabel, formatCurrency } from '@/lib/api'
import { rankFor } from '@/lib/game-logic'
import { EmpireIcon, asIconName, type IconName } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'
import { RowActions } from '@/components/molecules/RowActions'
import { Modal } from '@/components/molecules/Modal'
import { Pagination } from '@/components/molecules/Pagination'
import { rankIcon } from '@/lib/rank-icons'
import { ContractsPanel } from '@/components/organisms/ContractsPanel'
import { RuleBook } from '@/components/organisms/RuleBook'
import { MetricsPanel } from '@/components/organisms/MetricsPanel'
import { InteractionsPanel } from '@/components/organisms/InteractionsPanel'
import { FinancePanel } from '@/components/organisms/FinancePanel'
import { EngineeringPanel } from '@/components/organisms/EngineeringPanel'
import { LegalPanel } from '@/components/organisms/LegalPanel'
import { MarketingPanel } from '@/components/organisms/MarketingPanel'
import { ClientSuccessPanel } from '@/components/organisms/ClientSuccessPanel'
import { PartnershipsPanel } from '@/components/organisms/PartnershipsPanel'
import { HRPanel } from '@/components/organisms/HRPanel'
import { OperationsPanel } from '@/components/organisms/OperationsPanel'
import { CreativePanel } from '@/components/organisms/CreativePanel'
import { ExecutivePanel } from '@/components/organisms/ExecutivePanel'
import { AdvisoryPanel } from '@/components/organisms/AdvisoryPanel'
import { StructurePanel } from '@/components/organisms/StructurePanel'
import { NotificationsPanel } from '@/components/organisms/NotificationsPanel'
import { formatDistanceToNow, format } from 'date-fns'

type Dept = {
  id: string; name: string; slug: string; description: string
  kpiFramework: string; icon: string; color: string
  managedByAI: boolean; aiManagerName: string | null
  employees: Employee[]; kpiDefinitions: KPIDef[]
  compositeScores: CompositeScore[]; activities: Activity[]
}
type Employee = { id: string; name: string; role: string; salaryAmount: number | null; contractType: string; commissionRate: number | null; xp: number; level: number; fte?: number | null; avatarUrl?: string | null; contractEndsAt?: string | null; reportsToId?: string | null }
type KPIDef = { id: string; name: string; slug: string; description: string | null; unit: string | null; weight: number; records: KPIRecord[] }
type KPIRecord = { id: string; value: number | null; period: string; notes: string | null }
type CompositeScore = { id: string; score: number | null; ragStatus: string; period: string; breakdown: Record<string, any> | null }
type Activity = { id: string; title: string; description: string | null; createdAt: string; eventType: string }
type FollowUp = {
  id: string; title: string; description: string | null; status: string; priority: string
  dueDate: string | null; completedAt: string | null; source: string | null; createdAt: string
  department: { name: string; slug: string; icon: string; color: string }
  assignee: { name: string; role: string } | null
  crossRefDeptIds: string[] | null
}
type DeptEntry = {
  id: string; category: string; title: string; description: string | null; status: string
  amount: number | null; currency: string; refId: string | null; metadata: any
  startDate: string | null; endDate: string | null; createdAt: string
  department: { name: string; slug: string; icon: string; color: string }
}
type AllDept = { id: string; name: string; slug: string; icon: string; color: string }

// Map kpiFramework to dept-specific tab label + entry category
const DEPT_TAB: Record<string, { label: string; category: string; icon: IconName }> = {
  DORA: { label: 'Sprints', category: 'sprint', icon: 'rocket' },
  AARRR: { label: 'Campaigns', category: 'campaign', icon: 'megaphone' },
  BurnHealth: { label: 'Budget', category: 'invoice', icon: 'card' },
  Creative: { label: 'Projects', category: 'project', icon: 'pen-nib' },
  Partnerships: { label: 'Partners', category: 'partner_note', icon: 'handshake' },
  ClientSuccess: { label: 'Clients', category: 'client', icon: 'briefcase' },
  Executive: { label: 'Decisions', category: 'decision', icon: 'crown' },
  Governance: { label: 'Contracts', category: 'contract', icon: 'scales' },
  Finance: { label: 'Ledger', category: 'invoice', icon: 'card' },
  People: { label: 'Roster', category: 'role', icon: 'people' },
  Legal: { label: 'Contracts', category: 'contract', icon: 'scales' },
}

export default function DepartmentPage() {
  const { id: slug } = useParams()
  const searchParams = useSearchParams()
  const [dept, setDept] = useState<Dept | null>(null)
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [entries, setEntries] = useState<DeptEntry[]>([])
  const [allDepts, setAllDepts] = useState<AllDept[]>([])
  const [loading, setLoading] = useState(true)
  type TabId = 'overview' | 'structure' | 'metrics' | 'interactions' | 'finance' | 'engineering' | 'legal' | 'marketing' | 'client-success' | 'partnerships' | 'hr' | 'operations' | 'creative' | 'executive' | 'advisory' | 'kpis' | 'followups' | 'dept' | 'contracts'
  const initialTab = (searchParams.get('tab') as TabId) || 'overview'
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  // Persist the active tab in the URL so a reload restores the same section
  // instead of snapping back to Overview.
  const selectTab = useCallback((id: TabId) => {
    setActiveTab(id)
    try {
      const u = new URL(window.location.href)
      u.searchParams.set('tab', id)
      window.history.replaceState(null, '', u.toString())
    } catch { /* ignore */ }
  }, [])

  const load = useCallback(async () => {
    try {
      const [d, fu, en, ad] = await Promise.all([
        fetcher(`/api/departments/${slug}`),
        fetcher(`/api/followups?departmentSlug=${slug}`),
        fetcher(`/api/entries?departmentSlug=${slug}`),
        fetcher('/api/departments'),
      ])
      setDept(d)
      setFollowUps(fu)
      setEntries(en)
      setAllDepts(ad)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [slug])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="min-h-screen bg-empire-void flex items-center justify-center">
      <EmpireIcon name="crown" size={40} className="text-empire-gold animate-pulse" />
    </div>
  )
  if (!dept) return (
    <div className="min-h-screen bg-empire-void flex items-center justify-center text-empire-text-muted">
      Territory not found.
    </div>
  )

  const latestScore = dept.compositeScores?.[0]
  // Depts with a dedicated enterprise panel render their domain inside that panel
  // (Finance → Financials, Engineering → Delivery). Suppress the generic catch-all
  // tab so we don't show two ledgers / two sprint lists. ADD new dedicated panels here.
  const DEDICATED_PANEL_SLUGS = new Set(['finance', 'engineering', 'legal', 'marketing', 'client-success', 'partnerships', 'hr', 'operations', 'creative', 'executive', 'advisory'])
  const deptTab = DEDICATED_PANEL_SLUGS.has(dept.slug) ? undefined : DEPT_TAB[dept.kpiFramework]
  const openFollowUps = followUps.filter(f => f.status !== 'done').length

  const tabs: { id: TabId; label: string; icon: IconName }[] = [
    { id: 'overview', label: 'Overview', icon: 'overview' },
    { id: 'structure', label: 'Structure', icon: 'sitemap' },
    { id: 'metrics', label: 'Metrics', icon: 'chart-line' },
    ...(dept.managedByAI ? [{ id: 'interactions' as const, label: 'Interactions', icon: 'cog' as const }] : []),
    ...(dept.slug === 'finance' ? [{ id: 'finance' as const, label: 'Financials', icon: 'coins' as const }] : []),
    ...(dept.slug === 'engineering' ? [{ id: 'engineering' as const, label: 'Delivery', icon: 'rocket' as const }] : []),
    ...(dept.slug === 'legal' ? [{ id: 'legal' as const, label: 'Legal Desk', icon: 'scales' as const }] : []),
    ...(dept.slug === 'marketing' ? [{ id: 'marketing' as const, label: 'Growth', icon: 'megaphone' as const }] : []),
    ...(dept.slug === 'client-success' ? [{ id: 'client-success' as const, label: 'Accounts', icon: 'handshake' as const }] : []),
    ...(dept.slug === 'partnerships' ? [{ id: 'partnerships' as const, label: 'Channel', icon: 'handshake' as const }] : []),
    ...(dept.slug === 'hr' ? [{ id: 'hr' as const, label: 'People', icon: 'people' as const }] : []),
    ...(dept.slug === 'operations' ? [{ id: 'operations' as const, label: 'Engine Room', icon: 'operations' as const }] : []),
    ...(dept.slug === 'creative' ? [{ id: 'creative' as const, label: 'Studio', icon: 'pen-nib' as const }] : []),
    ...(dept.slug === 'executive' ? [{ id: 'executive' as const, label: 'Cockpit', icon: 'crown' as const }] : []),
    ...(dept.slug === 'advisory' ? [{ id: 'advisory' as const, label: 'Council', icon: 'compass' as const }] : []),
    { id: 'kpis', label: 'KPIs', icon: 'chart-bar' },
    { id: 'followups', label: `Follow-ups${openFollowUps > 0 ? ` (${openFollowUps})` : ''}`, icon: 'flag' },
    ...(deptTab ? [{ id: 'dept' as const, label: deptTab.label, icon: deptTab.icon }] : []),
    { id: 'contracts', label: 'Contracts', icon: 'document' },
  ]

  return (
    <div className="min-h-screen bg-empire-void">
      <header className="border-b border-empire-border bg-empire-deep/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-empire-text-muted hover:text-empire-gold text-xs uppercase tracking-widest transition-colors">
            ← Empire
          </Link>
          <span className="text-empire-border">/</span>
          <div className="flex items-center gap-2.5">
            <EmpireIcon name={deptIcon(dept.slug)} size={20} className="text-empire-gold" />
            <span className="font-empire text-empire-gold text-base tracking-wide">{dept.name}</span>
            <span className="text-empire-text-dim text-xs px-2 py-0.5 rounded border border-empire-border">
              {dept.kpiFramework}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {dept.managedByAI && (
              <span className="text-purple-400 text-xs inline-flex items-center gap-1.5">
                <EmpireIcon name="cog" size={13} className="text-purple-400" /> {dept.aiManagerName}
              </span>
            )}
            {latestScore && (
              <span className={`px-3 py-1 rounded text-xs font-medium ${ragColor(latestScore.ragStatus)}`}>
                {latestScore.score != null ? `Score: ${latestScore.score}` : ragLabel(latestScore.ragStatus)}
              </span>
            )}
            <RuleBook accent={dept.color || '#c9a233'} />
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 flex flex-wrap gap-1 pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              className={`px-4 py-2.5 text-xs uppercase tracking-widest font-medium border-b-2 transition-colors inline-flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-empire-gold text-empire-gold'
                  : 'border-transparent text-empire-text-muted hover:text-empire-text'
              }`}
            >
              <EmpireIcon
                name={tab.icon}
                size={13}
                className={activeTab === tab.id ? 'text-empire-gold' : 'text-empire-text-dim'}
              />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main key={activeTab} className="max-w-screen-xl mx-auto px-6 py-8 animate-slide-up">
        {activeTab === 'overview' && (
          <OverviewTab dept={dept} latestScore={latestScore} followUps={followUps} entries={entries} allDepts={allDepts} onUpdate={load} />
        )}
        {activeTab === 'structure' && (
          <StructurePanel departmentSlug={dept.slug} accent={dept.color || '#c9a233'} />
        )}
        {activeTab === 'metrics' && (
          <MetricsPanel departmentSlug={dept.slug} accent={dept.color || '#c9a233'} />
        )}
        {activeTab === 'interactions' && dept.managedByAI && (
          <InteractionsPanel departmentSlug={dept.slug} accent={dept.color || '#8b5cf6'} aiManagerName={dept.aiManagerName} />
        )}
        {activeTab === 'finance' && dept.slug === 'finance' && (
          <FinancePanel departmentSlug={dept.slug} />
        )}
        {activeTab === 'engineering' && dept.slug === 'engineering' && (
          <EngineeringPanel />
        )}
        {activeTab === 'legal' && dept.slug === 'legal' && (
          <LegalPanel />
        )}
        {activeTab === 'marketing' && dept.slug === 'marketing' && (
          <MarketingPanel />
        )}
        {activeTab === 'client-success' && dept.slug === 'client-success' && (
          <ClientSuccessPanel />
        )}
        {activeTab === 'partnerships' && dept.slug === 'partnerships' && (
          <PartnershipsPanel />
        )}
        {activeTab === 'hr' && dept.slug === 'hr' && (
          <HRPanel />
        )}
        {activeTab === 'operations' && dept.slug === 'operations' && (
          <OperationsPanel />
        )}
        {activeTab === 'creative' && dept.slug === 'creative' && (
          <CreativePanel />
        )}
        {activeTab === 'executive' && dept.slug === 'executive' && (
          <ExecutivePanel />
        )}
        {activeTab === 'advisory' && dept.slug === 'advisory' && (
          <AdvisoryPanel />
        )}
        {activeTab === 'kpis' && <KPIsTab dept={dept} />}
        {activeTab === 'followups' && (
          <FollowUpsTab
            followUps={followUps}
            dept={dept}
            allDepts={allDepts}
            onUpdate={load}
          />
        )}
        {activeTab === 'dept' && deptTab && (
          <DeptSpecificTab
            dept={dept}
            entries={entries}
            category={deptTab.category}
            label={deptTab.label}
            allDepts={allDepts}
            onUpdate={load}
          />
        )}
        {activeTab === 'contracts' && (
          <ContractsPanel departmentSlug={dept.slug} accent={dept.color || '#c9a233'} />
        )}
      </main>
    </div>
  )
}

function OverviewTab({ dept, latestScore, followUps, entries, allDepts, onUpdate }: {
  dept: Dept; latestScore?: CompositeScore; followUps: FollowUp[]; entries: DeptEntry[]; allDepts: AllDept[]; onUpdate: () => void
}) {
  const openFollowUps = followUps.filter(f => f.status !== 'done')
  const criticalFollowUps = openFollowUps.filter(f => f.priority === 'critical' || f.priority === 'high')
  const totalPayroll = dept.employees
    .filter(e => e.contractType === 'fixed' && e.salaryAmount)
    .reduce((s, e) => s + (e.salaryAmount || 0), 0)

  const crossRefDeptIds = new Set(followUps.flatMap(f => (f.crossRefDeptIds as string[] || [])))
  const crossDepts = allDepts.filter(d => crossRefDeptIds.has(d.id) && d.id !== dept.id)

  return (
    <div className="space-y-8">
      {/* Metrics bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Health Score" value={latestScore?.score != null ? `${latestScore.score}` : '—'} sub={latestScore ? ragLabel(latestScore.ragStatus) : 'No data'} icon="gauge" />
        <MetricCard label="Team Size" value={dept.employees.length.toString()} sub="active members" icon="people" />
        <MetricCard label="Monthly Cost" value={totalPayroll > 0 ? formatCurrency(totalPayroll) : '—'} sub="fixed salaries" icon="coins" />
        <MetricCard label="Open Follow-ups" value={openFollowUps.length.toString()} sub={`${criticalFollowUps.length} high/critical`} icon="flag" />
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Roster — full CRUD + cross-unit reassignment */}
        <div className="col-span-1">
          <Roster dept={dept} allDepts={allDepts} onUpdate={onUpdate} />
          {dept.managedByAI && (
            <div className="p-3 mt-2 bg-empire-surface border border-purple-800/40 rounded-lg text-center">
              <div className="text-purple-400 text-xs inline-flex items-center gap-1.5">
                <EmpireIcon name="cog" size={13} className="text-purple-400" /> {dept.aiManagerName}
              </div>
            </div>
          )}
          <div className="mt-2">
            <RuleBook variant="inline" accent={dept.color || '#c9a233'} initialSection="cross-dept" />
          </div>
        </div>

        {/* Critical follow-ups */}
        <div className="col-span-1">
          <SectionHeader title="Critical Follow-ups" />
          <div className="space-y-2 mt-3">
            {criticalFollowUps.length === 0 && (
              <div className="text-empire-text-dim text-xs italic p-3">No critical items. Empire is calm.</div>
            )}
            {criticalFollowUps.slice(0, 5).map(f => (
              <div key={f.id} className="p-3 bg-empire-surface border border-empire-red/20 rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-empire-text text-xs font-medium">{f.title}</div>
                  <PriorityBadge priority={f.priority} />
                </div>
                {f.dueDate && (
                  <div className="text-empire-text-dim text-xs mt-1">
                    Due {format(new Date(f.dueDate), 'MMM d')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cross-references + Activity */}
        <div className="col-span-1 space-y-6">
          <div>
            <SectionHeader title="Notifications" />
            <div className="mt-3"><NotificationsPanel departmentSlug={dept.slug} limit={6} /></div>
          </div>
          {crossDepts.length > 0 && (
            <div>
              <SectionHeader title="Cross-links" />
              <div className="space-y-2 mt-3">
                {crossDepts.map(d => (
                  <Link key={d.id} href={`/departments/${d.slug}`}>
                    <div className="flex items-center gap-2 p-2 bg-empire-surface border border-empire-border rounded hover:border-empire-gold/30 transition-colors">
                      <EmpireIcon name={deptIcon(d.slug)} size={14} className="text-empire-gold-muted" />
                      <span className="text-empire-text text-xs">{d.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div>
            <SectionHeader title="Recent Activity" />
            <div className="space-y-2 mt-3">
              {dept.activities.slice(0, 6).map(act => (
                <div key={act.id} className="p-2 bg-empire-surface border border-empire-border rounded text-xs">
                  <div className="text-empire-text">{act.title}</div>
                  <div className="text-empire-text-dim mt-0.5">
                    {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                  </div>
                </div>
              ))}
              {dept.activities.length === 0 && (
                <div className="text-empire-text-dim text-xs italic p-2">Chronicle begins today.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reporting structure — also surfaced here on the Overview, not only its own tab */}
      <div className="rounded-xl border border-empire-border bg-empire-elevated/20 p-4">
        <StructurePanel departmentSlug={dept.slug} accent={dept.color || '#c9a233'} />
      </div>
    </div>
  )
}

/* ---------------- Roster (full CRUD + cross-unit reassignment) ----------------
 * The unit roster. Add a person (POST /api/employees with this unit), edit a
 * person (PATCH /api/employees/:id — including moving them to a DIFFERENT unit
 * via the unit selector, the cross-reference requirement), and remove a person
 * (DELETE /api/employees/:id). Paginated. */
const ROSTER_PAGE_SIZE = 6

function Roster({ dept, allDepts, onUpdate }: { dept: Dept; allDepts: AllDept[]; onUpdate: () => void }) {
  const [page, setPage] = useState(0)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [viewing, setViewing] = useState<Employee | null>(null)

  const employees = dept.employees || []
  const pageCount = Math.max(1, Math.ceil(employees.length / ROSTER_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const slice = employees.slice(safePage * ROSTER_PAGE_SIZE, safePage * ROSTER_PAGE_SIZE + ROSTER_PAGE_SIZE)

  async function remove(emp: Employee) {
    try { await del(`/api/employees/${emp.id}`); onUpdate() }
    catch (e) { console.error(e) }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <SectionHeader title="Roster" />
        <button
          onClick={() => setAdding(true)}
          className="px-3 py-1.5 bg-empire-gold-dim border border-empire-gold/30 text-empire-gold text-[10px] uppercase tracking-widest rounded hover:bg-empire-gold/20 transition-colors inline-flex items-center gap-1"
        >
          <EmpireIcon name="plus" size={11} /> Add
        </button>
      </div>
      <div className="space-y-2 mt-3">
        {slice.length === 0 && (
          <div className="text-empire-text-dim text-xs italic p-3">No one assigned to this unit yet.</div>
        )}
        {slice.map(emp => {
          const rank = rankFor(emp.level ?? 1)
          return (
            <div key={emp.id} className="flex items-center gap-3 p-3 bg-empire-surface border border-empire-border rounded-lg hover:border-empire-gold/20 transition-colors">
              {emp.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={emp.avatarUrl} alt={emp.name} className="w-8 h-8 rounded object-cover flex-shrink-0 border border-empire-border" />
              ) : (
                <div
                  className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: (dept.color || '#C9A233') + '30', color: dept.color || '#C9A233' }}
                >
                  {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-empire-text text-xs font-medium truncate inline-flex items-center gap-1.5">
                  {emp.name}
                  {emp.fte != null && emp.fte < 1 && (
                    <span className="text-[9px] px-1 py-0.5 rounded border border-empire-amber/40 text-empire-amber-bright">{emp.fte} FTE</span>
                  )}
                </div>
                <div className="text-empire-text-dim text-xs truncate">{emp.role}</div>
                <span className="text-[10px] text-empire-text-muted inline-flex items-center gap-1 mt-0.5" title={`${emp.xp ?? 0} XP`}>
                  <EmpireIcon name={asIconName(rank.icon, rankIcon(rank.name))} size={11} className="text-empire-gold-muted" />
                  L{emp.level ?? 1} · {rank.name}
                  {emp.salaryAmount ? <span className="text-empire-gold-muted ml-1">· {formatCurrency(emp.salaryAmount)}</span> : null}
                </span>
              </div>
              <div className="flex-shrink-0">
                <RowActions
                  onView={() => setViewing(emp)}
                  onEdit={() => setEditing(emp)}
                  onDelete={() => remove(emp)}
                  deleteLabel={`${emp.name} from the roster`}
                  size={14}
                />
              </div>
            </div>
          )
        })}
      </div>
      {employees.length > ROSTER_PAGE_SIZE && (
        <Pagination page={safePage} pageCount={pageCount} total={employees.length} onPage={setPage} accent={dept.color || '#c9a233'} />
      )}

      {(adding || editing) && (
        <RosterEmployeeModal
          dept={dept}
          allDepts={allDepts}
          employee={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={() => { setAdding(false); setEditing(null); onUpdate() }}
        />
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Person" icon={<EmpireIcon name="user" size={18} />}>
        {viewing && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {viewing.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={viewing.avatarUrl} alt={viewing.name} className="w-12 h-12 rounded-full object-cover border border-empire-border" />
                : <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: (dept.color || '#C9A233') + '30', color: dept.color || '#C9A233' }}>{viewing.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>}
              <div className="font-empire text-empire-text text-lg">{viewing.name}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Role">{viewing.role}</Detail>
              <Detail label="Unit">{dept.name}</Detail>
              <Detail label="Level">L{viewing.level ?? 1} · {rankFor(viewing.level ?? 1).name}</Detail>
              <Detail label="XP">{viewing.xp ?? 0}</Detail>
              <Detail label="Contract">{viewing.contractType || '—'}</Detail>
              <Detail label="FTE">{viewing.fte != null ? viewing.fte : '1'}</Detail>
              <Detail label="Salary">{viewing.salaryAmount ? formatCurrency(viewing.salaryAmount) : '—'}</Detail>
              {viewing.commissionRate != null && <Detail label="Commission">{(viewing.commissionRate * 100).toFixed(1)}%</Detail>}
              {viewing.contractType === 'contractor' && <Detail label="Contract ends">{viewing.contractEndsAt ? format(new Date(viewing.contractEndsAt), 'MMM d, yyyy') : '—'}</Detail>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-empire-text-dim mb-0.5">{label}</div>
      <div className="text-empire-text">{children}</div>
    </div>
  )
}

function RosterEmployeeModal({ dept, allDepts, employee, onClose, onSaved }: {
  dept: Dept; allDepts: AllDept[]; employee: Employee | null; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!employee
  const [f, setF] = useState({
    name: employee?.name ?? '',
    role: employee?.role ?? '',
    departmentId: dept.id,                       // default this unit; editable → cross-ref reassignment
    contractType: employee?.contractType ?? 'fixed',
    level: String(employee?.level ?? 1),
    salaryAmount: employee?.salaryAmount != null ? String(employee.salaryAmount) : '',
    commissionRate: employee?.commissionRate != null ? String(employee.commissionRate) : '',
    fte: employee?.fte != null ? String(employee.fte) : '1',
    avatarUrl: employee?.avatarUrl ?? '',
    contractEndsAt: employee?.contractEndsAt ? employee.contractEndsAt.slice(0, 10) : '',
  })
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!f.name || !f.role) return
    setBusy(true)
    const fteNum = Math.min(1, Math.max(0.1, Number(f.fte) || 1))
    const body = {
      name: f.name,
      role: f.role,
      departmentId: f.departmentId,              // moving to a different unit reassigns the person
      contractType: f.contractType,
      level: Number(f.level) || 1,
      salaryAmount: f.salaryAmount ? Number(f.salaryAmount) : null,
      commissionRate: f.commissionRate ? Number(f.commissionRate) : null,
      fte: fteNum,
      avatarUrl: f.avatarUrl || null,
      // Only contractors carry an end date; clear it otherwise.
      contractEndsAt: f.contractType === 'contractor' && f.contractEndsAt ? f.contractEndsAt : null,
    }
    try {
      if (isEdit && employee) await patch(`/api/employees/${employee.id}`, body)
      else await post('/api/employees', body)
      onSaved()
    } catch (e) { console.error(e); setBusy(false) }
  }

  const reassigning = isEdit && f.departmentId !== dept.id

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit person' : 'Add person to unit'} icon={<EmpireIcon name={isEdit ? 'pen' : 'user'} size={18} />}>
      <div className="space-y-3">
        <div>
          <label className="empire-label">Name *</label>
          <input className="empire-input w-full mt-1" placeholder="Full name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <label className="empire-label">Role *</label>
          <input className="empire-input w-full mt-1" placeholder="Title / role" value={f.role} onChange={e => setF({ ...f, role: e.target.value })} />
        </div>
        <div>
          <label className="empire-label">Unit {isEdit && '(reassign to move across units)'}</label>
          <select className="empire-input w-full mt-1" value={f.departmentId} onChange={e => setF({ ...f, departmentId: e.target.value })}>
            {allDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {reassigning && (
            <p className="text-[11px] text-empire-amber-bright mt-1 inline-flex items-center gap-1">
              <EmpireIcon name="link" size={11} className="text-empire-amber-bright" />
              Will move {f.name || 'this person'} to {allDepts.find(d => d.id === f.departmentId)?.name}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="empire-label">Contract</label>
            <select className="empire-input w-full mt-1" value={f.contractType} onChange={e => setF({ ...f, contractType: e.target.value })}>
              {['fixed', 'commission', 'contractor', 'advisor'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="empire-label">Level</label>
            <input className="empire-input w-full mt-1" type="number" min={1} value={f.level} onChange={e => setF({ ...f, level: e.target.value })} />
          </div>
          <div>
            <label className="empire-label">Salary (€)</label>
            <input className="empire-input w-full mt-1" type="number" placeholder="0" value={f.salaryAmount} onChange={e => setF({ ...f, salaryAmount: e.target.value })} />
          </div>
          <div>
            <label className="empire-label">Commission (0–1)</label>
            <input className="empire-input w-full mt-1" type="number" step="0.01" placeholder="0.10" value={f.commissionRate} onChange={e => setF({ ...f, commissionRate: e.target.value })} />
          </div>
          <div>
            <label className="empire-label">FTE (0.1–1)</label>
            <input className="empire-input w-full mt-1" type="number" step="0.1" min={0.1} max={1} placeholder="1" value={f.fte} onChange={e => setF({ ...f, fte: e.target.value })} />
          </div>
          {f.contractType === 'contractor' && (
            <div>
              <label className="empire-label">Contract ends</label>
              <input className="empire-input w-full mt-1" type="date" value={f.contractEndsAt} onChange={e => setF({ ...f, contractEndsAt: e.target.value })} />
            </div>
          )}
        </div>
        <div>
          <label className="empire-label">Profile picture URL</label>
          <div className="flex items-center gap-3 mt-1">
            {f.avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={f.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-empire-border flex-shrink-0" />
              : <div className="w-10 h-10 rounded-full border border-dashed border-empire-border flex items-center justify-center flex-shrink-0"><EmpireIcon name="user" size={16} className="text-empire-text-dim" /></div>}
            <input className="empire-input flex-1" placeholder="https://…/photo.jpg" value={f.avatarUrl} onChange={e => setF({ ...f, avatarUrl: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy || !f.name || !f.role} className="empire-btn-primary disabled:opacity-50">
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add to unit'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function KPIsTab({ dept }: { dept: Dept }) {
  return (
    <div className="space-y-6">
      <SectionHeader title={`${dept.kpiFramework} Metrics`} subtitle={dept.description} />
      <div className="grid grid-cols-2 gap-4">
        {dept.kpiDefinitions?.map((kpi) => {
          const latest = kpi.records?.[0]
          const history = kpi.records?.slice(0, 6).reverse()
          return (
            <div key={kpi.id} className="bg-empire-surface border border-empire-border rounded-lg p-5 hover:border-empire-gold/20 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-empire-text text-sm font-medium">{kpi.name}</div>
                  {kpi.description && <div className="text-empire-text-dim text-xs mt-0.5">{kpi.description}</div>}
                </div>
                <div className="text-xs text-empire-text-dim bg-empire-elevated px-2 py-0.5 rounded">{kpi.unit || 'pts'}</div>
              </div>
              {latest?.value != null ? (
                <div>
                  <div className="font-empire text-empire-gold text-2xl">
                    {latest.value}{kpi.unit ? ` ${kpi.unit}` : ''}
                  </div>
                  <div className="text-empire-text-dim text-xs mt-1">{latest.period}</div>
                </div>
              ) : (
                <div className="font-empire text-empire-text-dim text-2xl">—</div>
              )}
              {history && history.length > 1 && (
                <div className="flex items-end gap-1 mt-3 h-8">
                  {history.map((r, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-empire-gold/20 rounded-t"
                      style={{ height: `${Math.min(100, ((r.value || 0) / Math.max(...history.map(h => h.value || 1))) * 100)}%`, minHeight: '2px' }}
                      title={`${r.period}: ${r.value}`}
                    />
                  ))}
                </div>
              )}
              <div className="text-xs text-empire-text-dim mt-2">Weight: {(kpi.weight * 100).toFixed(0)}%</div>
            </div>
          )
        })}
      </div>

      {/* Score history */}
      {dept.compositeScores?.length > 0 && (
        <div className="mt-6">
          <SectionHeader title="Composite Score History" />
          <div className="flex gap-3 mt-3 flex-wrap">
            {dept.compositeScores.map(s => (
              <div key={s.id} className={`px-4 py-3 rounded-lg border text-center min-w-[80px] ${ragColor(s.ragStatus)}`}>
                <div className="font-empire text-lg">{s.score ?? '—'}</div>
                <div className="text-xs mt-0.5 opacity-75">{s.period}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FollowUpsTab({ followUps, dept, allDepts, onUpdate }: {
  followUps: FollowUp[]; dept: Dept; allDepts: AllDept[]; onUpdate: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', priority: 'normal', dueDate: '', crossRefSlugs: [] as string[] })
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('open')

  const filtered = followUps.filter(f => {
    if (filter === 'open') return f.status !== 'done'
    if (filter === 'done') return f.status === 'done'
    return true
  })

  async function submit() {
    if (!form.title) return
    await post('/api/followups', {
      title: form.title,
      description: form.description || undefined,
      departmentSlug: dept.slug,
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      crossRefDeptSlugs: form.crossRefSlugs,
      source: 'manual',
    })
    setForm({ title: '', description: '', priority: 'normal', dueDate: '', crossRefSlugs: [] })
    setShowForm(false)
    onUpdate()
  }

  async function updateStatus(id: string, status: string) {
    await patch(`/api/followups/${id}/status`, { status })
    onUpdate()
  }

  const priorityOrder: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 }
  const sorted = [...filtered].sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Follow-ups" subtitle="Track what needs to happen — across departments" />
        <div className="flex items-center gap-3">
          <div className="flex border border-empire-border rounded overflow-hidden">
            {(['open', 'all', 'done'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs uppercase tracking-wide transition-colors ${filter === f ? 'bg-empire-gold text-empire-void' : 'text-empire-text-muted hover:text-empire-text'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-empire-gold-dim border border-empire-gold/30 text-empire-gold text-xs uppercase tracking-widest rounded hover:bg-empire-gold/20 transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-empire-surface border border-empire-gold/20 rounded-lg p-5 space-y-4">
          <h4 className="font-empire text-empire-gold text-sm">New Follow-up</h4>
          <div className="grid grid-cols-2 gap-4">
            <input
              placeholder="Title *"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="col-span-2 empire-input"
            />
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="col-span-2 empire-input resize-none"
            />
            <div>
              <label className="empire-label">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="empire-input w-full mt-1">
                {['low', 'normal', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="empire-label">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="empire-input w-full mt-1" />
            </div>
          </div>
          <div>
            <label className="empire-label">Cross-reference departments</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {allDepts.filter(d => d.slug !== dept.slug).map(d => (
                <button
                  key={d.id}
                  onClick={() => setForm(prev => ({
                    ...prev,
                    crossRefSlugs: prev.crossRefSlugs.includes(d.slug)
                      ? prev.crossRefSlugs.filter(s => s !== d.slug)
                      : [...prev.crossRefSlugs, d.slug]
                  }))}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${form.crossRefSlugs.includes(d.slug) ? 'border-empire-gold bg-empire-gold/10 text-empire-gold' : 'border-empire-border text-empire-text-muted hover:border-empire-gold/30'}`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <EmpireIcon name={deptIcon(d.slug)} size={12} className="text-empire-gold-muted" />
                    {d.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <button onClick={submit} className="empire-btn-primary">Create Follow-up</button>
        </div>
      )}

      <div className="space-y-2">
        {sorted.length === 0 && (
          <div className="text-center py-12 text-empire-text-muted text-sm">
            {filter === 'open' ? 'All clear — no open follow-ups.' : 'Nothing here.'}
          </div>
        )}
        {sorted.map(f => (
          <div key={f.id} className={`bg-empire-surface border rounded-lg p-4 transition-colors ${f.status === 'done' ? 'opacity-50 border-empire-border' : 'border-empire-border hover:border-empire-gold/20'}`}>
            <div className="flex items-start gap-3">
              <button
                onClick={() => updateStatus(f.id, f.status === 'done' ? 'open' : 'done')}
                className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${f.status === 'done' ? 'bg-empire-green/20 border-empire-green/40 text-empire-green-bright' : 'border-empire-border hover:border-empire-gold/40'}`}
              >
                {f.status === 'done' && <EmpireIcon name="check" size={12} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${f.status === 'done' ? 'text-empire-text-dim line-through' : 'text-empire-text'}`}>{f.title}</span>
                  <PriorityBadge priority={f.priority} />
                  <StatusBadge status={f.status} />
                </div>
                {f.description && <div className="text-empire-text-muted text-xs mt-1">{f.description}</div>}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {f.dueDate && (
                    <span className="text-xs text-empire-amber-bright inline-flex items-center gap-1">
                      <EmpireIcon name="calendar" size={12} className="text-empire-amber-bright" /> {format(new Date(f.dueDate), 'MMM d, yyyy')}
                    </span>
                  )}
                  {f.assignee && (
                    <span className="text-xs text-empire-text-dim inline-flex items-center gap-1">
                      <EmpireIcon name="user" size={12} className="text-empire-text-dim" /> {f.assignee.name}
                    </span>
                  )}
                  <span className="text-xs text-empire-text-dim">
                    {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {f.status !== 'done' && f.status !== 'in_progress' && (
                  <button onClick={() => updateStatus(f.id, 'in_progress')} className="text-xs px-2 py-1 border border-empire-amber/40 text-empire-amber-bright rounded hover:bg-empire-amber/10 transition-colors">
                    Start
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DeptSpecificTab({ dept, entries, category, label, allDepts, onUpdate }: {
  dept: Dept; entries: DeptEntry[]; category: string; label: string; allDepts: AllDept[]; onUpdate: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', status: 'active', amount: '', refId: '', startDate: '', endDate: '', crossRefSlugs: [] as string[]
  })

  const relevant = entries.filter(e => e.category === category)

  async function submit() {
    if (!form.title) return
    await post('/api/entries', {
      departmentSlug: dept.slug,
      category,
      title: form.title,
      description: form.description || undefined,
      status: form.status,
      amount: form.amount ? Number(form.amount) : undefined,
      refId: form.refId || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      crossRefDeptSlugs: form.crossRefSlugs,
    })
    setForm({ title: '', description: '', status: 'active', amount: '', refId: '', startDate: '', endDate: '', crossRefSlugs: [] })
    setShowForm(false)
    onUpdate()
  }

  const categoryConfig: Record<string, { showAmount: boolean; refLabel: string; statusOptions: string[] }> = {
    sprint:       { showAmount: false, refLabel: 'GitHub Repo', statusOptions: ['planning', 'active', 'done', 'blocked'] },
    campaign:     { showAmount: true,  refLabel: 'Campaign URL', statusOptions: ['draft', 'active', 'paused', 'completed'] },
    invoice:      { showAmount: true,  refLabel: 'Invoice #', statusOptions: ['pending', 'paid', 'overdue', 'cancelled'] },
    project:      { showAmount: false, refLabel: 'Project Ref', statusOptions: ['planning', 'active', 'review', 'done'] },
    partner_note: { showAmount: true,  refLabel: 'Partner Contact', statusOptions: ['active', 'in_talks', 'paused', 'closed'] },
    client:       { showAmount: true,  refLabel: 'Client ID', statusOptions: ['healthy', 'at_risk', 'churned', 'won_back'] },
    decision:     { showAmount: false, refLabel: 'Decision Ref', statusOptions: ['pending', 'approved', 'rejected', 'deferred'] },
    contract:     { showAmount: true,  refLabel: 'Contract #', statusOptions: ['draft', 'active', 'expired', 'terminated'] },
    role:         { showAmount: false, refLabel: 'Req / Role ID', statusOptions: ['open', 'interviewing', 'filled', 'on_hold'] },
  }
  const cfg = categoryConfig[category] || { showAmount: true, refLabel: 'Reference', statusOptions: ['active', 'done', 'cancelled'] }

  const statusColors: Record<string, string> = {
    active: 'text-empire-green-bright border-empire-green/40',
    healthy: 'text-empire-green-bright border-empire-green/40',
    paid: 'text-empire-green-bright border-empire-green/40',
    done: 'text-empire-green-bright border-empire-green/40',
    completed: 'text-empire-green-bright border-empire-green/40',
    won_back: 'text-empire-green-bright border-empire-green/40',
    approved: 'text-empire-green-bright border-empire-green/40',
    pending: 'text-empire-amber-bright border-empire-amber/40',
    planning: 'text-empire-amber-bright border-empire-amber/40',
    draft: 'text-empire-amber-bright border-empire-amber/40',
    in_talks: 'text-empire-amber-bright border-empire-amber/40',
    review: 'text-empire-amber-bright border-empire-amber/40',
    paused: 'text-empire-text-muted border-empire-border',
    overdue: 'text-empire-red-bright border-empire-red/40',
    at_risk: 'text-empire-red-bright border-empire-red/40',
    blocked: 'text-empire-red-bright border-empire-red/40',
    churned: 'text-empire-red-bright border-empire-red/40',
    cancelled: 'text-empire-text-dim border-empire-border',
    expired: 'text-empire-text-dim border-empire-border',
    terminated: 'text-empire-text-dim border-empire-border',
    closed: 'text-empire-text-dim border-empire-border',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title={label} subtitle={`${dept.name} — ${category} records`} />
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-empire-gold-dim border border-empire-gold/30 text-empire-gold text-xs uppercase tracking-widest rounded hover:bg-empire-gold/20 transition-colors"
        >
          + Add {label.slice(0, -1)}
        </button>
      </div>

      {showForm && (
        <div className="bg-empire-surface border border-empire-gold/20 rounded-lg p-5 space-y-4">
          <h4 className="font-empire text-empire-gold text-sm">New {label.slice(0, -1)}</h4>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="col-span-2 empire-input" />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="col-span-2 empire-input resize-none" />
            <div>
              <label className="empire-label">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="empire-input w-full mt-1">
                {cfg.statusOptions.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            {cfg.showAmount && (
              <div>
                <label className="empire-label">Amount (€)</label>
                <input type="number" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="empire-input w-full mt-1" />
              </div>
            )}
            <div>
              <label className="empire-label">{cfg.refLabel}</label>
              <input placeholder="Optional ref" value={form.refId} onChange={e => setForm({ ...form, refId: e.target.value })} className="empire-input w-full mt-1" />
            </div>
            <div>
              <label className="empire-label">Start → End</label>
              <div className="flex gap-2 mt-1">
                <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="empire-input flex-1" />
                <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="empire-input flex-1" />
              </div>
            </div>
          </div>
          <div>
            <label className="empire-label">Cross-reference departments</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {allDepts.filter(d => d.slug !== dept.slug).map(d => (
                <button
                  key={d.id}
                  onClick={() => setForm(prev => ({
                    ...prev,
                    crossRefSlugs: prev.crossRefSlugs.includes(d.slug)
                      ? prev.crossRefSlugs.filter(s => s !== d.slug)
                      : [...prev.crossRefSlugs, d.slug]
                  }))}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${form.crossRefSlugs.includes(d.slug) ? 'border-empire-gold bg-empire-gold/10 text-empire-gold' : 'border-empire-border text-empire-text-muted hover:border-empire-gold/30'}`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <EmpireIcon name={deptIcon(d.slug)} size={12} className="text-empire-gold-muted" />
                    {d.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <button onClick={submit} className="empire-btn-primary">Create</button>
        </div>
      )}

      {/* Summary totals for financial categories */}
      {cfg.showAmount && relevant.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {['active', 'healthy', 'paid', 'completed'].some(s => relevant.find(e => e.status === s)) && (
            <MetricCard
              label="Active Value"
              value={formatCurrency(relevant.filter(e => ['active','healthy','paid','completed'].includes(e.status)).reduce((s, e) => s + (e.amount || 0), 0))}
              sub="active/completed"
              icon="check"
            />
          )}
          <MetricCard
            label="Total Records"
            value={relevant.length.toString()}
            sub={`${category} entries`}
            icon="document"
          />
          <MetricCard
            label="Total Value"
            value={formatCurrency(relevant.reduce((s, e) => s + (e.amount || 0), 0))}
            sub="all time"
            icon="coins"
          />
        </div>
      )}

      <div className="space-y-3">
        {relevant.length === 0 && (
          <div className="text-center py-16 text-empire-text-muted text-sm">
            No {label.toLowerCase()} logged yet.
          </div>
        )}
        {relevant.map(entry => (
          <div key={entry.id} className="bg-empire-surface border border-empire-border rounded-lg p-4 hover:border-empire-gold/20 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-empire-text text-sm font-medium">{entry.title}</span>
                  <span className={`px-2 py-0.5 text-xs rounded border ${statusColors[entry.status] || 'text-empire-text-muted border-empire-border'}`}>
                    {entry.status.replace('_', ' ')}
                  </span>
                  {entry.refId && (
                    <span className="text-empire-text-dim text-xs font-mono bg-empire-elevated px-1.5 py-0.5 rounded">{entry.refId}</span>
                  )}
                </div>
                {entry.description && <div className="text-empire-text-muted text-xs">{entry.description}</div>}
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {entry.startDate && (
                    <span className="text-xs text-empire-text-dim">
                      {format(new Date(entry.startDate), 'MMM d')}
                      {entry.endDate && ` → ${format(new Date(entry.endDate), 'MMM d, yyyy')}`}
                    </span>
                  )}
                  <span className="text-xs text-empire-text-dim">
                    {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              {entry.amount != null && (
                <div className="text-empire-gold font-empire text-lg flex-shrink-0">{formatCurrency(entry.amount, entry.currency)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: IconName }) {
  return (
    <div className="group bg-empire-surface border border-empire-border rounded-lg p-5 transition-all hover:border-empire-gold/40 hover:shadow-gold-glow">
      <div className="flex items-start justify-between mb-3">
        <span className="text-empire-text-muted text-[10px] uppercase tracking-[0.18em]">{label}</span>
        <EmpireIcon name={icon} size={15} className="text-empire-text-dim transition-colors group-hover:text-empire-gold-muted" />
      </div>
      <div className="font-empire text-empire-gold text-3xl font-bold tabular-nums leading-none">{value}</div>
      <div className="text-empire-text-dim text-xs mt-2">{sub}</div>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-empire-red/20 text-empire-red-bright border border-empire-red/40',
    high: 'bg-empire-amber-bg text-empire-amber-bright border border-empire-amber/40',
    normal: 'bg-empire-elevated text-empire-text-muted border border-empire-border',
    low: 'bg-empire-elevated text-empire-text-dim border border-empire-border',
  }
  return (
    <span className={`px-1.5 py-0.5 text-xs rounded ${colors[priority] || colors.normal}`}>
      {priority}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-empire-elevated text-empire-text-muted border border-empire-border',
    in_progress: 'bg-empire-gold/10 text-empire-gold border border-empire-gold/30',
    blocked: 'bg-empire-red/10 text-empire-red-bright border border-empire-red/30',
    done: 'bg-empire-green/10 text-empire-green-bright border border-empire-green/30',
  }
  return (
    <span className={`px-1.5 py-0.5 text-xs rounded ${colors[status] || colors.open}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="font-empire text-empire-gold text-sm tracking-widest uppercase inline-block pb-1 border-b border-empire-gold/30">{title}</h2>
      {subtitle && <p className="text-empire-text-muted text-xs mt-1.5">{subtitle}</p>}
    </div>
  )
}
