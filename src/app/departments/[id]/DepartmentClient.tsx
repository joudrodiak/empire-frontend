'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { fetcher, post, patch, del, ragColor, ragLabel, formatCurrency } from '@/lib/api'
import { useAuth, userCan } from '@/lib/auth'
import { rankFor } from '@/lib/game-logic'
import { EmpireIcon, asIconName, type IconName } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'
import { RowActions } from '@/components/molecules/RowActions'
import { PhotoDrop } from '@/components/molecules/PhotoDrop'
import { Modal } from '@/components/molecules/Modal'
import { PasswordInput } from '@/components/molecules/PasswordInput'
import { Pagination } from '@/components/molecules/Pagination'
import { rankIcon } from '@/lib/rank-icons'
import { ContractsPanel } from '@/components/organisms/ContractsPanel'
import { TicketsPanel } from '@/components/organisms/TicketsPanel'
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
import { GuidedTour, type TourStep } from '@/components/organisms/GuidedTour'
import { formatDistanceToNow, format } from 'date-fns'
import { empireColor, empireTint } from '@/lib/theme'
import { AffixInput } from '@/components/molecules/AffixInput'
import { DatePicker } from '@/components/molecules/DatePicker'

type Dept = {
  id: string; name: string; slug: string; description: string
  kpiFramework: string; icon: string; color: string
  managedByAI: boolean; aiManagerName: string | null
  employees: Employee[]; kpiDefinitions: KPIDef[]
  compositeScores: CompositeScore[]; activities: Activity[]
  agents?: UnitAgent[]
}
type UnitAgent = { id: string; name: string; codename: string | null; role: string; status: string; kind: string; avatarSeed: string | null; permissions: string[] | null; createdAt: string }
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

export default function DepartmentClient() {
  const { id: slug } = useParams()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const isAdmin = userCan(user, 'iam:manage')   // C6 — Automate Unit is Admin-only
  const [dept, setDept] = useState<Dept | null>(null)
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [entries, setEntries] = useState<DeptEntry[]>([])
  const [allDepts, setAllDepts] = useState<AllDept[]>([])
  const [loading, setLoading] = useState(true)
  type TabId = 'overview' | 'structure' | 'metrics' | 'interactions' | 'finance' | 'engineering' | 'legal' | 'marketing' | 'client-success' | 'partnerships' | 'hr' | 'operations' | 'creative' | 'executive' | 'advisory' | 'kpis' | 'followups' | 'requests' | 'leave' | 'dept' | 'tickets' | 'contracts' | 'automate'
  const initialTab = (searchParams.get('tab') as TabId) || 'overview'
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const [tourOpen, setTourOpen] = useState(false)   // C3 — guided walkthrough overlay
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
  // People Ops (and any roster) → "create a contract for this person" jumps to the
  // Contracts tab with the form pre-opened for that employee.
  const [contractPrefill, setContractPrefill] = useState<string | null>(null)
  const createContractFor = useCallback((empId: string) => {
    setContractPrefill(empId)
    selectTab('contracts')
  }, [selectTab])

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
  const accent = empireColor(dept.color)
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
    { id: 'requests', label: 'Requests', icon: 'scales' },
    { id: 'followups', label: `Follow-ups${openFollowUps > 0 ? ` (${openFollowUps})` : ''}`, icon: 'flag' },
    { id: 'leave', label: 'Leave', icon: 'calendar' },
    ...(deptTab ? [{ id: 'dept' as const, label: deptTab.label, icon: deptTab.icon }] : []),
    { id: 'tickets', label: 'Tickets', icon: 'rocket' },
    { id: 'contracts', label: 'Contracts', icon: 'document' },
    ...(isAdmin ? [{ id: 'automate' as const, label: 'Automate', icon: 'sparkle' as const }] : []),
  ]

  // C3 — guided walkthrough. Each step names the tab it lives on (switched via
  // onBeforeStep before the anchor is highlighted) and a data-tour selector. The
  // engine polls for the anchor after the tab switch, so cross-tab steps work.
  const tour: { tab: TabId; step: TourStep }[] = [
    { tab: 'overview', step: { selector: '[data-tour="unit-tutorial"]', title: `Welcome to ${dept.name}`, body: 'This is the unit cockpit. Every aspect of running this unit lives behind the tabs below — let’s walk through the essentials. Use Next, or Skip any time.' } },
    { tab: 'overview', step: { selector: '[data-tour="tab-overview"]', title: 'Overview', body: 'The home of the unit: its health score, recent activity, and the people who run it. Start here every day.' } },
    { tab: 'overview', step: { selector: '[data-tour="roster-add"]', title: 'Create a role / add a person', body: 'The basics: click Add to create a role and place a person in this unit. Give them a name and title — they’ll appear on the roster and can hold contracts and KPIs.' } },
    { tab: 'kpis', step: { selector: '[data-tour="tab-kpis"]', title: 'KPIs', body: 'Define what “good” means for this unit and track it over time. KPI records roll up into the unit’s health score.' } },
    { tab: 'requests', step: { selector: '[data-tour="tab-requests"]', title: 'Cross-unit requests', body: 'Ask another unit for a decision — Legal clearance for an ad, a permit, or a budget from Finance. Incoming requests land here for you to approve or reject.' } },
    { tab: 'followups', step: { selector: '[data-tour="tab-followups"]', title: 'Follow-ups', body: 'Open loops that need action — anything left unresolved surfaces here with a count so nothing falls through.' } },
    { tab: 'leave', step: { selector: '[data-tour="tab-leave"]', title: 'Leave & calendar', body: 'A live calendar of the unit: national public holidays, who is off, sick days (reported and HR-confirmed), and birthdays. Request vacation, sick or other leave straight from each person’s balance.' } },
    { tab: 'contracts', step: { selector: '[data-tour="tab-contracts"]', title: 'Contracts', body: 'The paperwork for the people in this unit: draft, view, export, and sign. Outputs are viewable, exportable, and actionable — no dead ends.' } },
    ...(isAdmin ? [{ tab: 'automate' as TabId, step: { selector: '[data-tour="tab-automate"]', title: 'Automate the unit', body: 'Appoint an operator agent to run this unit autonomously. Once at least one operator is in place you can flip the unit to AI-managed.' } as TourStep }] : []),
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
              <span className="text-empire-gold text-xs inline-flex items-center gap-1.5">
                <EmpireIcon name="cog" size={13} className="text-empire-gold" /> Automated unit
              </span>
            )}
            {latestScore && (
              <span className={`px-3 py-1 rounded text-xs font-medium ${ragColor(latestScore.ragStatus)}`}>
                {latestScore.score != null ? `Score: ${latestScore.score}` : ragLabel(latestScore.ragStatus)}
              </span>
            )}
            <button
              data-tour="unit-tutorial"
              onClick={() => setTourOpen(true)}
              title="Guided walkthrough of this unit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-empire-gold/30 px-2.5 py-1 text-[10px] uppercase tracking-widest text-empire-gold transition-colors hover:bg-empire-gold/10"
            >
              <EmpireIcon name="sparkle" size={12} /> Tutorial
            </button>
            <RuleBook accent={accent} />
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 flex flex-wrap gap-1 pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              data-tour={`tab-${tab.id}`}
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
          <OverviewTab dept={dept} latestScore={latestScore} followUps={followUps} entries={entries} allDepts={allDepts} onUpdate={load} onCreateContract={createContractFor} accent={accent} />
        )}
        {activeTab === 'structure' && (
          <StructurePanel departmentSlug={dept.slug} accent={accent} />
        )}
        {activeTab === 'metrics' && (
          <MetricsPanel departmentSlug={dept.slug} accent={accent} />
        )}
        {activeTab === 'interactions' && dept.managedByAI && (
          <InteractionsPanel departmentSlug={dept.slug} accent={accent} />
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
        {activeTab === 'tickets' && (
          <TicketsPanel departmentSlug={dept.slug} accent={accent} />
        )}
        {activeTab === 'contracts' && (
          <ContractsPanel
            departmentSlug={dept.slug}
            accent={accent}
            prefillEmployeeId={contractPrefill}
            onConsumePrefill={() => setContractPrefill(null)}
          />
        )}
        {activeTab === 'requests' && (
          <RequestsTab dept={dept} accent={accent} />
        )}
        {activeTab === 'leave' && (
          <LeaveTab dept={dept} />
        )}
        {activeTab === 'automate' && isAdmin && (
          <AutomateTab dept={dept} accent={accent} onUpdate={load} />
        )}
      </main>
      {tourOpen && (
        <GuidedTour
          title={`${dept.name} tour`}
          steps={tour.map(t => t.step)}
          onBeforeStep={(idx) => selectTab(tour[idx].tab)}
          onClose={() => setTourOpen(false)}
        />
      )}
    </div>
  )
}

function OverviewTab({ dept, latestScore, followUps, entries, allDepts, onUpdate, onCreateContract, accent }: {
  dept: Dept; latestScore?: CompositeScore; followUps: FollowUp[]; entries: DeptEntry[]; allDepts: AllDept[]; onUpdate: () => void
  onCreateContract?: (empId: string) => void; accent: string
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
          <Roster dept={dept} allDepts={allDepts} onUpdate={onUpdate} onCreateContract={onCreateContract} accent={accent} />
          {dept.managedByAI && (
            <div className="p-3 mt-2 bg-empire-surface border border-empire-gold/25 rounded-lg text-center">
              <div className="text-empire-gold text-xs inline-flex items-center gap-1.5">
                <EmpireIcon name="cog" size={13} className="text-empire-gold" /> Automated unit
              </div>
            </div>
          )}
          <div className="mt-2">
            <RuleBook variant="inline" accent={accent} initialSection="cross-dept" />
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
        <StructurePanel departmentSlug={dept.slug} accent={accent} />
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

function Roster({ dept, allDepts, onUpdate, onCreateContract, accent }: { dept: Dept; allDepts: AllDept[]; onUpdate: () => void; onCreateContract?: (empId: string) => void; accent: string }) {
  const [page, setPage] = useState(0)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [viewing, setViewing] = useState<Employee | null>(null)
  const [dashboardOf, setDashboardOf] = useState<Employee | null>(null)

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
          data-tour="roster-add"
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
                  style={{ background: empireTint(accent, '30'), color: accent }}
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
              <div className="flex-shrink-0 flex items-center gap-1">
                <button
                  onClick={() => setDashboardOf(emp)}
                  title={`Unit member dashboard for ${emp.name}`}
                  className="p-1.5 rounded text-empire-text-dim hover:text-empire-gold hover:bg-empire-gold/10 transition-colors"
                >
                  <EmpireIcon name="gauge" size={14} />
                </button>
                {onCreateContract && (
                  <button
                    onClick={() => onCreateContract(emp.id)}
                    title={`Create a contract for ${emp.name}`}
                    className="p-1.5 rounded text-empire-text-dim hover:text-empire-gold hover:bg-empire-gold/10 transition-colors"
                  >
                    <EmpireIcon name="document" size={14} />
                  </button>
                )}
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
        <Pagination page={safePage} pageCount={pageCount} total={employees.length} onPage={setPage} accent={accent} />
      )}

      {/* C1 — operators (agents) created in this unit appear here automatically. */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-2">
          <SectionHeader title="Operators" />
          <a
            href={`/agent?unit=${dept.slug}`}
            className="px-3 py-1.5 bg-empire-elevated/40 border border-empire-border text-empire-text-dim text-[10px] uppercase tracking-widest rounded hover:text-empire-gold hover:border-empire-gold/30 transition-colors inline-flex items-center gap-1"
          >
            <EmpireIcon name="sparkle" size={11} /> Manage operators
          </a>
        </div>
        <div className="space-y-2 mt-3">
          {(dept.agents || []).length === 0 && (
            <div className="text-empire-text-dim text-xs italic p-3">No operators in this unit yet — create one from the agent console and it lands here automatically.</div>
          )}
          {(dept.agents || []).map(a => {
            const slug = (a.codename || a.name || 'agent').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'agent'
            return (
            <div
              key={a.id}
              className="flex items-center gap-3 p-3 bg-empire-surface border border-empire-border rounded-lg hover:border-empire-gold/20 transition-colors"
            >
              <div
                className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: empireTint(accent, '30'), color: accent }}
              >
                <EmpireIcon name="sparkle" size={15} />
              </div>
              <a href={`/agent?id=${a.id}`} className="min-w-0 flex-1 group">
                <div className="text-empire-text text-xs font-medium truncate inline-flex items-center gap-1.5 group-hover:text-empire-gold transition-colors">
                  {a.name}
                  {a.codename && <span className="text-empire-text-muted">· {a.codename}</span>}
                  <span className="text-[9px] px-1 py-0.5 rounded border border-empire-gold/40 text-empire-gold uppercase tracking-wide">Operator</span>
                </div>
                <div className="text-empire-text-dim text-xs truncate">{a.role}</div>
                <span className="text-[10px] text-empire-text-muted inline-flex items-center gap-1 mt-0.5">
                  <EmpireIcon name={a.status === 'active' ? 'check' : 'clock'} size={11} className={a.status === 'active' ? 'text-empire-green-bright' : 'text-empire-text-muted'} />
                  {a.status}
                  {Array.isArray(a.permissions) && a.permissions.length > 0 && (
                    <span className="text-empire-gold-muted ml-1">· {a.permissions.length} {a.permissions.length === 1 ? 'capability' : 'capabilities'}</span>
                  )}
                </span>
              </a>
              <a
                href={`/agent?id=${a.id}&view=md`}
                title="Read agent.md — the portable hat the MCP wears (opens in the operator viewer; download from there)"
                className="px-2 py-1 bg-empire-elevated/40 border border-empire-border text-empire-text-dim text-[10px] uppercase tracking-widest rounded hover:text-empire-gold hover:border-empire-gold/30 transition-colors inline-flex items-center gap-1 flex-shrink-0"
              >
                <EmpireIcon name="document" size={11} /> agent.md
              </a>
              <a href={`/agent?id=${a.id}`}><EmpireIcon name="chevron-right" size={14} className="text-empire-text-dim flex-shrink-0" /></a>
            </div>
          )})}
        </div>
      </div>

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
                : <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: empireTint(accent, '30'), color: accent }}>{viewing.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>}
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
              {viewing.commissionRate != null && <Detail label="Commission">{viewing.commissionRate.toFixed(1)}%</Detail>}
              {viewing.contractType === 'contractor' && <Detail label="Contract ends">{viewing.contractEndsAt ? format(new Date(viewing.contractEndsAt), 'MMM d, yyyy') : '—'}</Detail>}
            </div>
          </div>
        )}
      </Modal>

      <UnitMemberDashboard employee={dashboardOf} accent={accent} onClose={() => setDashboardOf(null)} />
    </div>
  )
}

/* ---------------- C9 — Unit Member Dashboard ----------------
 * Per-member, company-scoped snapshot: level/XP, deals, tickets, activity,
 * leave, payroll, and (only when commissionRate > 0) commissions with the
 * deals that earned them. Data: GET /api/employees/:id/dashboard. */
type MemberDashboard = {
  employee: { id: string; name: string; role: string; avatarUrl: string | null; level: number; xp: number; joinedAt: string | null; contractType: string; commissionRate: number; department: { name: string; slug: string; color: string; icon: string } | null }
  metrics: {
    level: number; xp: number
    deals: { won: number; open: number; wonValue: number; pipelineValue: number }
    tickets: { assigned: number; done: number; inProgress: number; storyPointsDone: number }
    activity90d: number
    leave: { allowance: number; vacationUsed: number; vacationRemaining: number; sickDays: number }
  }
  payroll: { salaryAmount: number | null; salaryCurrency: string; monthly: number | null; contractType: string; runs: { id: string; period: string; status: string; agreedDate: string | null; executedAt: string | null; currency: string }[] }
  commissions: { rate: number; earned: number; currency: string; deals: { id: string; title: string; client: string | null; amount: number | null; currency: string; commissionAmount: number | null; closedAt: string | null }[] } | null
}

function StatCard({ icon, label, value, sub, accent }: { icon: IconName; label: string; value: React.ReactNode; sub?: React.ReactNode; accent: string }) {
  return (
    <div className="p-3 bg-empire-surface border border-empire-border rounded-lg">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-empire-text-dim">
        <EmpireIcon name={icon} size={12} style={{ color: accent }} /> {label}
      </div>
      <div className="text-empire-text text-lg font-empire mt-1">{value}</div>
      {sub != null && <div className="text-empire-text-dim text-[11px] mt-0.5">{sub}</div>}
    </div>
  )
}

function UnitMemberDashboard({ employee, accent, onClose }: { employee: Employee | null; accent: string; onClose: () => void }) {
  const [data, setData] = useState<MemberDashboard | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!employee) { setData(null); setErr(''); return }
    let alive = true
    setLoading(true); setErr('')
    fetcher(`/api/employees/${employee.id}/dashboard`)
      .then((d: MemberDashboard) => { if (alive) setData(d) })
      .catch((e: unknown) => { if (alive) setErr(e instanceof Error ? e.message : 'Failed to load dashboard') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [employee])

  const rank = employee ? rankFor(employee.level ?? 1) : null

  return (
    <Modal open={!!employee} onClose={onClose} title="Unit Member Dashboard" icon={<EmpireIcon name="gauge" size={18} />}>
      {loading && <div className="text-empire-text-dim text-xs italic p-3">Loading dashboard…</div>}
      {err && !loading && <div className="text-empire-rose text-xs p-3">{err}</div>}
      {data && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {data.employee.avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={data.employee.avatarUrl} alt={data.employee.name} className="w-12 h-12 rounded-full object-cover border border-empire-border" />
              : <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: empireTint(accent, '30'), color: accent }}>{data.employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>}
            <div className="min-w-0">
              <div className="font-empire text-empire-text text-lg truncate">{data.employee.name}</div>
              <div className="text-empire-text-dim text-xs truncate">
                {data.employee.role}{data.employee.department ? ` · ${data.employee.department.name}` : ''}
              </div>
            </div>
          </div>

          {/* Standing */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard icon="trophy" label="Level" value={`L${data.metrics.level}`} sub={rank?.name} accent={accent} />
            <StatCard icon="chart-line" label="XP" value={data.metrics.xp.toLocaleString()} accent={accent} />
            <StatCard icon="gauge" label="Activity 90d" value={data.metrics.activity90d} sub="events" accent={accent} />
            <StatCard icon="sun" label="Vacation left" value={`${data.metrics.leave.vacationRemaining}d`} sub={`${data.metrics.leave.vacationUsed}/${data.metrics.leave.allowance} used · ${data.metrics.leave.sickDays}d sick`} accent={accent} />
          </div>

          {/* Deals + tickets */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-empire-text-dim mb-2">Deals & delivery</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatCard icon="handshake" label="Won deals" value={data.metrics.deals.won} sub={formatCurrency(data.metrics.deals.wonValue)} accent={accent} />
              <StatCard icon="chart-bar" label="Pipeline" value={data.metrics.deals.open} sub={formatCurrency(data.metrics.deals.pipelineValue)} accent={accent} />
              <StatCard icon="check" label="Tickets done" value={`${data.metrics.tickets.done}/${data.metrics.tickets.assigned}`} sub={`${data.metrics.tickets.inProgress} in progress`} accent={accent} />
              <StatCard icon="rocket" label="Story points" value={data.metrics.tickets.storyPointsDone} sub="delivered" accent={accent} />
            </div>
          </div>

          {/* Payroll */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-empire-text-dim mb-2">Payroll</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <StatCard icon="coins" label="Salary" value={data.payroll.salaryAmount != null ? formatCurrency(data.payroll.salaryAmount) : '—'} sub={data.payroll.contractType} accent={accent} />
              <StatCard icon="card" label="Monthly" value={data.payroll.monthly != null ? formatCurrency(data.payroll.monthly) : '—'} accent={accent} />
              <StatCard icon="calendar" label="Recent runs" value={data.payroll.runs.length} sub={data.payroll.runs[0] ? data.payroll.runs[0].period : 'none yet'} accent={accent} />
            </div>
            {data.payroll.runs.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {data.payroll.runs.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-2 p-2 bg-empire-surface border border-empire-border rounded text-xs">
                    <span className="text-empire-text">{r.period}</span>
                    <span className="text-empire-text-dim inline-flex items-center gap-1">
                      <EmpireIcon name={r.status === 'executed' ? 'check' : 'clock'} size={11} className={r.status === 'executed' ? 'text-empire-green-bright' : 'text-empire-text-muted'} />
                      {r.status}{r.executedAt ? ` · ${format(new Date(r.executedAt), 'MMM d, yyyy')}` : r.agreedDate ? ` · agreed ${format(new Date(r.agreedDate), 'MMM d')}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Commissions — only when commissionRate > 0 */}
          {data.commissions && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-empire-text-dim mb-2 inline-flex items-center gap-1.5">
                <EmpireIcon name="coins" size={12} style={{ color: accent }} /> Commissions · {data.commissions.rate.toFixed(1)}%
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <StatCard icon="coins" label="Earned" value={formatCurrency(data.commissions.earned)} sub={`${data.commissions.deals.length} closed deals`} accent={accent} />
                <StatCard icon="chart-line" label="Rate" value={`${data.commissions.rate.toFixed(1)}%`} accent={accent} />
              </div>
              {data.commissions.deals.length > 0 ? (
                <div className="space-y-1.5">
                  {data.commissions.deals.map(d => (
                    <div key={d.id} className="flex items-center justify-between gap-2 p-2 bg-empire-surface border border-empire-border rounded text-xs">
                      <div className="min-w-0">
                        <div className="text-empire-text truncate">{d.title}</div>
                        {d.client && <div className="text-empire-text-dim truncate">{d.client}</div>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-empire-gold">{d.commissionAmount != null ? formatCurrency(d.commissionAmount) : '—'}</div>
                        <div className="text-empire-text-dim">{d.amount != null ? formatCurrency(d.amount) : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-empire-text-dim text-xs italic p-2">No commission-earning deals closed yet.</div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
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
  const nameParts = (employee?.name || '').trim().split(/\s+/)
  // C10 — adding to a unit, you choose person vs operator (a bot/agent the MCP
  // can wear as a hat). Operators are ops-only: no login, no password.
  const [mode, setMode] = useState<'person' | 'operator'>('person')
  const [f, setF] = useState({
    name: employee?.name ?? '',
    firstName: isEdit ? nameParts[0] || '' : '',
    lastName: isEdit ? nameParts.slice(1).join(' ') : '',
    email: '',
    password: '',
    role: employee?.role ?? '',
    description: '',                              // beside role (→ bio)
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
  const [err, setErr] = useState('')
  const isOperator = !isEdit && mode === 'operator'

  async function save() {
    setErr('')
    if (isOperator) {
      if (!f.name.trim() || !f.role.trim()) return
      setBusy(true)
      try {
        // Operator = an agent bound to this unit, no login/credentials.
        await post('/api/agents', { name: f.name.trim(), role: f.role.trim(), kind: 'bot', bio: f.description.trim() || null, departmentId: dept.id, permissions: [] })
        onSaved()
      } catch (e: any) { console.error(e); setErr(e?.message || 'Failed to create operator'); setBusy(false) }
      return
    }
    if ((!isEdit && (!f.firstName || !f.lastName || !f.email || f.password.length < 10)) || (isEdit && !f.name) || !f.role) return
    setBusy(true)
    const fteNum = Math.min(1, Math.max(0.1, Number(f.fte) || 1))
    const body = {
      name: f.name,
      ...(!isEdit ? { firstName: f.firstName, lastName: f.lastName, email: f.email, password: f.password } : {}),
      role: f.role,
      ...(f.description.trim() ? { bio: f.description.trim() } : {}),
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
    } catch (e: any) { console.error(e); setErr(e?.message || 'Save failed'); setBusy(false) }
  }

  const reassigning = isEdit && f.departmentId !== dept.id

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit person' : 'Add to unit'} icon={<EmpireIcon name={isEdit ? 'pen' : isOperator ? 'sparkle' : 'user'} size={18} />}>
      <div className="flex flex-col max-h-[calc(100vh-8rem)]">
        {/* C10 — choose person vs operator before filling the form (create only). */}
        {!isEdit && (
          <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
            {(['person', 'operator'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setErr('') }}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${mode === m ? 'border-empire-gold/50 bg-empire-gold/10' : 'border-empire-border hover:border-empire-gold/20'}`}
              >
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-empire-text">
                  <EmpireIcon name={m === 'person' ? 'user' : 'sparkle'} size={13} className={mode === m ? 'text-empire-gold' : 'text-empire-text-muted'} />
                  {m === 'person' ? 'Person' : 'Operator'}
                </div>
                <div className="text-[10px] text-empire-text-dim mt-0.5">{m === 'person' ? 'A teammate with a login' : 'An agent — no login, MCP wears it as a hat'}</div>
              </button>
            ))}
          </div>
        )}

        {/* Scrollable form body — long unit forms no longer clip (C10). */}
        <div className="space-y-3 overflow-y-auto pr-1 -mr-1">
          {isOperator ? (
            <div>
              <label className="empire-label">Operator name *</label>
              <input className="empire-input w-full mt-1" placeholder="e.g. Ops Concierge" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
            </div>
          ) : isEdit ? (
            <div>
              <label className="empire-label">Name *</label>
              <input className="empire-input w-full mt-1" placeholder="Full name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="empire-label">First name *</label><input className="empire-input w-full mt-1" value={f.firstName} placeholder="First name" onChange={e => setF({ ...f, firstName: e.target.value })} /></div>
              <div><label className="empire-label">Last name *</label><input className="empire-input w-full mt-1" value={f.lastName} placeholder="Last name" onChange={e => setF({ ...f, lastName: e.target.value })} /></div>
              <div><label className="empire-label">Email *</label><input type="email" className="empire-input w-full mt-1" value={f.email} placeholder="name@company.com" onChange={e => setF({ ...f, email: e.target.value })} /></div>
              <div>
                <label className="empire-label">Temporary password *</label>
                <PasswordInput minLength={10} inputClassName="empire-input w-full mt-1" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
                <p className="mt-1 text-[10px] text-empire-text-dim">Minimum 10 characters.</p>
              </div>
            </div>
          )}
          <div>
            <label className="empire-label">Role *</label>
            <input className="empire-input w-full mt-1" placeholder="Title / role" value={f.role} onChange={e => setF({ ...f, role: e.target.value })} />
          </div>
          <div>
            <label className="empire-label">Description</label>
            <textarea className="empire-input w-full mt-1 resize-none" rows={isOperator ? 3 : 2} placeholder={isOperator ? 'What this operator does — the brief the MCP follows when wearing this hat.' : 'Short bio / what this person owns.'} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
          </div>

          {isOperator ? (
            <p className="text-[11px] text-empire-text-dim inline-flex items-start gap-1.5">
              <EmpireIcon name="shield" size={12} className="text-empire-text-muted mt-0.5 shrink-0" />
              Ops-only — no login, no password. It lands in this unit and the MCP can wear it as a hat or dispatch a sub-agent. Grant capabilities later in the agent console.
            </p>
          ) : (
            <>
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
                  <input className="empire-input w-full mt-1" type="number" min={1} value={f.level} placeholder="1" onChange={e => setF({ ...f, level: e.target.value })} />
                </div>
                <div>
                  <label className="empire-label">Salary (€)</label>
                  <AffixInput money className="empire-input w-full mt-1" type="number" placeholder="0" value={f.salaryAmount} onChange={e => setF({ ...f, salaryAmount: e.target.value })} />
                </div>
                <div>
                  <label className="empire-label">Commission (0–1)</label>
                  <AffixInput pct className="empire-input w-full mt-1" type="number" step="0.01" placeholder="0.10" value={f.commissionRate} onChange={e => setF({ ...f, commissionRate: e.target.value })} />
                </div>
                <div>
                  <label className="empire-label">FTE (0.1–1)</label>
                  <input className="empire-input w-full mt-1" type="number" step="0.1" min={0.1} max={1} placeholder="1" value={f.fte} onChange={e => setF({ ...f, fte: e.target.value })} />
                </div>
                {f.contractType === 'contractor' && (
                  <div>
                    <label className="empire-label">Contract ends</label>
                    <DatePicker className="empire-input w-full mt-1" value={f.contractEndsAt} onChange={e => setF({ ...f, contractEndsAt: e.target.value })} />
                  </div>
                )}
              </div>
              <PhotoDrop
                label="Profile picture"
                value={f.avatarUrl}
                onChange={v => setF({ ...f, avatarUrl: v })}
              />
            </>
          )}
        </div>

        {err && <p className="text-[11px] text-empire-red-bright mt-2 shrink-0">{err}</p>}
        <div className="flex justify-end gap-2 pt-3 shrink-0">
          <button onClick={onClose} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy || !f.role || (isOperator ? !f.name.trim() : isEdit ? !f.name : (!f.firstName || !f.lastName || !f.email || f.password.length < 10))} className="empire-btn-primary disabled:opacity-50">
            {busy ? 'Saving…' : isEdit ? 'Save changes' : isOperator ? 'Create operator' : 'Add to unit'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// C6 — Automate Unit (Admin-only). Toggle AI-management for the unit + a wizard
// to appoint existing operators or create one from the per-unit templates. The
// appointed operators are orchestrated by the agent that drives Empire via MCP.
type AutomationOperator = { id: string; name: string; codename: string | null; role: string; status: string }
type AutomationTemplate = { slug: string; role: string; desc: string; suggestedName: string }
type AutomationState = { unit: { id: string; name: string; slug: string }; enabled: boolean; appointed: AutomationOperator[]; operators: AutomationOperator[]; templates: AutomationTemplate[] }

/* ── C12 · Cross-unit Requests ────────────────────────────────────────────────
 * Every unit can raise a request to another unit and see what was raised TO it.
 * It rides the existing ApprovalRequest backbone (source/target department +
 * metadata.requestType), so a request shows up here AND in the Approval Hub, and
 * the Throne's decision flows back. Friendly, guided templates remove the dead end
 * of "what do I even ask Legal/Finance for" — e.g. Marketing → Legal for ad/film/
 * event clearance, any unit → Finance for a budget. The generic template lets a
 * unit raise to any other unit.
 */
type RequestApproval = {
  id: string; requestedBy: string; title: string; description: string | null
  category: string; priority: string; status: string; createdAt: string
  metadata?: Record<string, unknown> | null
}
type RequestTemplate = {
  id: string; label: string; icon: IconName; blurb: string
  targetSlug: string | null  // null = raiser chooses the unit
  requestType: string; titleTpl: string; descScaffold: string; priority: string
}
const REQUEST_TEMPLATES: RequestTemplate[] = [
  { id: 'legal-ad', label: 'Ad / creative sign-off', icon: 'scales', blurb: 'Ask Legal whether a campaign or creative has the approvals it needs to run.',
    targetSlug: 'legal', requestType: 'legal_ad_clearance', priority: 'high',
    titleTpl: 'Legal sign-off — ad / creative', descScaffold: 'Campaign / creative:\nChannels & markets:\nClaims or talent involved:\nGo-live date:' },
  { id: 'legal-film', label: 'Filming / location permit', icon: 'scales', blurb: 'Confirm with Legal that filming at a location is cleared (permits, releases, IP).',
    targetSlug: 'legal', requestType: 'legal_film_permit', priority: 'high',
    titleTpl: 'Legal sign-off — filming at a location', descScaffold: 'Location & dates:\nWhat is being filmed:\nPeople / property in frame:\nPermits already held:' },
  { id: 'legal-event', label: 'Event clearance', icon: 'scales', blurb: 'Get Legal clearance for a public event (venue, liability, sponsorships).',
    targetSlug: 'legal', requestType: 'legal_event_clearance', priority: 'normal',
    titleTpl: 'Legal sign-off — public event', descScaffold: 'Event & date:\nVenue & attendance:\nSponsors / partners:\nRisks to review:' },
  { id: 'finance-budget', label: 'Budget request', icon: 'coins', blurb: 'Ask Finance to approve a budget or spend for this unit.',
    targetSlug: 'finance', requestType: 'finance_budget', priority: 'normal',
    titleTpl: 'Budget request', descScaffold: 'Amount & currency:\nWhat it funds:\nPeriod:\nExpected return / why now:' },
  { id: 'generic', label: 'Request to another unit', icon: 'handshake', blurb: 'Raise any request and pick which unit should decide it.',
    targetSlug: null, requestType: 'cross_dept_request', priority: 'normal',
    titleTpl: '', descScaffold: '' },
]

function RequestsTab({ dept, accent }: { dept: Dept; accent: string }) {
  const { user } = useAuth()
  const canDecide = userCan(user, 'approvals:decide') || userCan(user, '*')
  const [rows, setRows] = useState<RequestApproval[] | null>(null)
  const [depts, setDepts] = useState<AllDept[]>([])
  const [view, setView] = useState<'incoming' | 'raise' | 'sent'>('incoming')
  const [raising, setRaising] = useState<RequestTemplate | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const list = await fetcher('/api/approvals').catch(() => [])
    setRows(Array.isArray(list) ? list : [])
  }, [])
  useEffect(() => { reload() }, [reload])
  useEffect(() => { fetcher('/api/departments').then((d: AllDept[]) => setDepts(Array.isArray(d) ? d : [])).catch(() => {}) }, [])

  const slugOf = (a: RequestApproval, key: 'source' | 'target') =>
    (a.metadata as any)?.[`${key}DepartmentSlug`] as string | undefined
  const incoming = (rows || []).filter(a => slugOf(a, 'target') === dept.slug)
  const sent = (rows || []).filter(a => slugOf(a, 'source') === dept.slug)
  const incomingPending = incoming.filter(a => a.status === 'pending').length

  async function decide(id: string, status: 'approved' | 'rejected') {
    setBusyId(id)
    try { await patch(`/api/approvals/${id}/decide`, { status }); await reload() }
    catch (e) { console.error(e) } finally { setBusyId(null) }
  }

  if (!rows) return <div className="text-empire-text-dim text-sm p-6">Loading requests…</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader title="Requests" subtitle={`Raise a request to another unit, and act on what's been sent to ${dept.name}. Everything also lands in the Approval Hub for the Throne.`} />

      <div className="flex gap-1 border-b border-empire-border">
        {([
          { id: 'incoming' as const, label: `Incoming${incomingPending ? ` (${incomingPending})` : ''}` },
          { id: 'raise' as const, label: 'Raise a request' },
          { id: 'sent' as const, label: `Sent${sent.length ? ` (${sent.length})` : ''}` },
        ]).map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`px-3 py-2 text-xs uppercase tracking-widest transition-colors -mb-px border-b-2 ${view === t.id ? 'border-empire-gold text-empire-gold' : 'border-transparent text-empire-text-dim hover:text-empire-text'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {view === 'incoming' && (
        incoming.length === 0 ? (
          <EmptyRequests icon="check" text={`No requests waiting on ${dept.name}.`} />
        ) : (
          <div className="space-y-2">
            {incoming.map(a => (
              <RequestRow key={a.id} a={a} side="from" canDecide={canDecide} busy={busyId === a.id} onDecide={(s) => decide(a.id, s)} />
            ))}
          </div>
        )
      )}

      {view === 'sent' && (
        sent.length === 0 ? (
          <EmptyRequests icon="document" text={`${dept.name} hasn't raised any requests yet.`} />
        ) : (
          <div className="space-y-2">
            {sent.map(a => <RequestRow key={a.id} a={a} side="to" canDecide={false} busy={false} onDecide={() => {}} />)}
          </div>
        )
      )}

      {view === 'raise' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REQUEST_TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setRaising(t)} className="text-left bg-empire-surface border border-empire-border rounded-lg p-4 hover:border-empire-gold/30 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ background: empireTint(accent, '30'), color: accent }}>
                  <EmpireIcon name={t.icon} size={15} />
                </div>
                <div className="text-empire-text text-sm font-medium">{t.label}</div>
              </div>
              <div className="text-empire-text-dim text-xs">{t.blurb}</div>
            </button>
          ))}
        </div>
      )}

      {raising && (
        <RaiseRequestModal source={dept} template={raising} depts={depts}
          onClose={() => setRaising(null)}
          onCreated={() => { setRaising(null); setView('sent'); reload() }} />
      )}
    </div>
  )
}

function EmptyRequests({ icon, text }: { icon: IconName; text: string }) {
  return (
    <div className="p-8 text-center bg-empire-surface border border-empire-border rounded-lg">
      <div className="mb-2 flex justify-center text-empire-green-bright"><EmpireIcon name={icon} size={22} /></div>
      <p className="text-sm text-empire-text-muted">{text}</p>
    </div>
  )
}

function RequestRow({ a, side, canDecide, busy, onDecide }: {
  a: RequestApproval; side: 'from' | 'to'; canDecide: boolean; busy: boolean; onDecide: (s: 'approved' | 'rejected') => void
}) {
  const meta = (a.metadata as any) || {}
  const counterparty = side === 'from' ? meta.sourceDepartmentName : meta.targetDepartmentName
  const pending = a.status === 'pending'
  const tone = a.status === 'approved' ? 'text-empire-green-bright' : a.status === 'rejected' ? 'text-empire-red-bright' : 'text-empire-amber-bright'
  return (
    <div className="bg-empire-surface border border-empire-border rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-medium text-empire-text">{a.title}</h4>
            <span className={`text-[10px] uppercase tracking-widest ${tone}`}>{a.status}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-empire-text-dim">
            <span className="text-empire-text-muted">{a.category}</span>
            {counterparty && <span>{side === 'from' ? 'from' : 'to'} {counterparty}</span>}
            <span>by {a.requestedBy}</span>
            <span>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
            <span className="uppercase tracking-widest text-empire-text-muted">{a.priority}</span>
          </div>
          {a.description && <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-empire-text-muted">{a.description}</p>}
        </div>
        <a href="/approvals" title="Open in the Approval Hub" className="shrink-0 rounded-lg border border-empire-border px-2 py-1 text-empire-text-muted transition-colors hover:border-empire-gold/40 hover:text-empire-gold">
          <EmpireIcon name="scales" size={13} />
        </a>
      </div>
      {side === 'from' && pending && canDecide && (
        <div className="mt-3 flex gap-2">
          <button onClick={() => onDecide('approved')} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-empire-green/40 bg-empire-green-bg px-3 py-1.5 text-[10px] uppercase tracking-widest text-empire-green-bright transition-colors hover:bg-empire-green/20 disabled:opacity-40">
            <EmpireIcon name="check" size={12} /> Approve
          </button>
          <button onClick={() => onDecide('rejected')} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-empire-red/40 bg-empire-red-bg px-3 py-1.5 text-[10px] uppercase tracking-widest text-empire-red-bright transition-colors hover:bg-empire-red/20 disabled:opacity-40">
            <EmpireIcon name="close" size={12} /> Reject
          </button>
        </div>
      )}
    </div>
  )
}

/* ── C4 · Leave & calendar ─────────────────────────────────────────────────
 * Per-unit absence cockpit: national public holidays (by company HQ), members'
 * off-days, sick days (reported + HR-confirmed) and birthdays on a month grid,
 * plus per-person vacation balances and a request form. Output is viewable, the
 * calendar is navigable, and HR can act on every row — no dead-end.
 */
type LeaveKind = 'vacation' | 'sick' | 'other'
type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
type LeaveRow = {
  id: string; employeeId: string; type: LeaveKind; startDate: string; endDate: string
  days: number; reason: string | null; status: LeaveStatus; reported: boolean; hrConfirmed: boolean
  employee: { id: string; name: string; role: string; avatarUrl: string | null }
}
type LeaveBalance = {
  employeeId: string; name: string; role: string; avatarUrl: string | null
  allowance: number; taken: number; pending: number; remaining: number; sickDays: number; birthday: string | null
}
type LeavePayload = {
  year: number; country: string
  holidays: { date: string; name: string; country: string }[]
  requests: LeaveRow[]
  balances: LeaveBalance[]
  birthdays: { employeeId: string; name: string; date: string }[]
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const KIND_TONE: Record<LeaveKind, { dot: string; text: string; label: string }> = {
  vacation: { dot: 'bg-empire-gold', text: 'text-empire-gold', label: 'Vacation' },
  sick: { dot: 'bg-empire-red-bright', text: 'text-empire-red-bright', label: 'Sick' },
  other: { dot: 'bg-empire-text-dim', text: 'text-empire-text-muted', label: 'Other' },
}

function LeaveTab({ dept }: { dept: Dept }) {
  const { user } = useAuth()
  const canManage = userCan(user, 'people:write') || userCan(user, '*')
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-11
  const [data, setData] = useState<LeavePayload | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const d = await fetcher(`/api/leave?departmentSlug=${dept.slug}&year=${year}`).catch(() => null)
    setData(d && typeof d === 'object' ? (d as LeavePayload) : null)
  }, [dept.slug, year])
  useEffect(() => { reload() }, [reload])

  async function act(fn: () => Promise<any>, id: string) {
    setBusyId(id)
    try { await fn(); await reload() } catch (e) { console.error(e) } finally { setBusyId(null) }
  }
  const decide = (id: string, status: LeaveStatus) => act(() => patch(`/api/leave/${id}/decide`, { status }), id)
  const confirmSick = (id: string) => act(() => patch(`/api/leave/${id}/confirm`, { hrConfirmed: true }), id)
  const remove = (id: string) => act(() => del(`/api/leave/${id}`), id)

  if (!data) return <div className="text-empire-text-dim text-sm p-6">Loading calendar…</div>

  const live = data.requests.filter(r => r.status === 'approved' || r.status === 'pending')
  const pending = data.requests.filter(r => r.status === 'pending')
  const sick = data.requests.filter(r => r.type === 'sick')

  // Day → events for the visible month (Monday-based grid).
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const dateKey = (d: number) => `${year}-${pad2(month + 1)}-${pad2(d)}`
  const holidayOn = (k: string) => data.holidays.find(h => h.date === k)
  const birthdaysOn = (k: string) => data.birthdays.filter(b => b.date === k)
  const leaveOn = (k: string) => live.filter(r => k >= r.startDate.slice(0, 10) && k <= r.endDate.slice(0, 10))
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const todayKey = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeader title="Leave & calendar"
          subtitle={`Public holidays (${data.country}), who's off, sick days and birthdays for ${dept.name}. Request vacation, sick or other leave from each person's balance.`} />
        <button onClick={() => setRequesting(true)} data-tour="leave-request" className="empire-btn-primary inline-flex items-center gap-1.5">
          <EmpireIcon name="plus" size={13} /> Request leave
        </button>
      </div>

      <div className="bg-empire-surface border border-empire-border rounded-lg p-4">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={prevMonth} aria-label="Previous month" className="rounded-lg border border-empire-border p-1.5 text-empire-text-muted hover:text-empire-gold hover:border-empire-gold/40">
            <EmpireIcon name="chevron-left" size={14} />
          </button>
          <div className="text-sm font-medium text-empire-text">{MONTH_NAMES[month]} {year}</div>
          <button onClick={nextMonth} aria-label="Next month" className="rounded-lg border border-empire-border p-1.5 text-empire-text-muted hover:text-empire-gold hover:border-empire-gold/40">
            <EmpireIcon name="chevron-right" size={14} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="text-[10px] uppercase tracking-widest text-empire-text-dim pb-1">{d}</div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={`b${i}`} className="aspect-square" />
            const k = dateKey(d)
            const hol = holidayOn(k)
            const bds = birthdaysOn(k)
            const lv = leaveOn(k)
            const weekend = ((firstWeekday + d - 1) % 7) >= 5
            const tip = [hol && `Holiday: ${hol.name}`, ...bds.map(b => `🎂 ${b.name}`),
              ...lv.map(r => `${r.employee.name} — ${KIND_TONE[r.type].label}${r.status === 'pending' ? ' (pending)' : ''}`)].filter(Boolean).join('\n')
            return (
              <div key={k} title={tip || undefined}
                className={`aspect-square rounded p-1 border ${hol ? 'border-empire-gold/40 bg-empire-gold/5' : weekend ? 'border-transparent bg-empire-bg/40' : 'border-empire-border/40'} ${k === todayKey ? 'ring-1 ring-empire-gold' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] ${hol ? 'text-empire-gold' : 'text-empire-text-muted'}`}>{d}</span>
                  {bds.length > 0 && <EmpireIcon name="star" size={9} className="text-empire-amber-bright" />}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-0.5">
                  {lv.slice(0, 4).map(r => (
                    <span key={r.id} className={`h-1.5 w-1.5 rounded-full ${KIND_TONE[r.type].dot} ${r.status === 'pending' ? 'opacity-40' : ''}`} />
                  ))}
                  {lv.length > 4 && <span className="text-[8px] text-empire-text-dim">+{lv.length - 4}</span>}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-empire-text-dim">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-empire-gold" /> Vacation</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-empire-red-bright" /> Sick</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-empire-text-dim" /> Other</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm border border-empire-gold/40 bg-empire-gold/10" /> Holiday</span>
          <span className="inline-flex items-center gap-1"><EmpireIcon name="star" size={9} className="text-empire-amber-bright" /> Birthday</span>
          <span className="opacity-60">faded = pending approval</span>
        </div>
      </div>

      {canManage && pending.length > 0 && (
        <div>
          <h4 className="mb-2 text-[11px] uppercase tracking-widest text-empire-text-muted">Awaiting decision ({pending.length})</h4>
          <div className="space-y-2">
            {pending.map(r => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-empire-border bg-empire-surface p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm text-empire-text">
                    <span className={`h-2 w-2 rounded-full ${KIND_TONE[r.type].dot}`} />
                    <span className="truncate">{r.employee.name}</span>
                    <span className="text-[10px] uppercase tracking-widest text-empire-text-dim">{KIND_TONE[r.type].label}</span>
                  </div>
                  <div className="text-xs text-empire-text-dim">{r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)} · {r.days} day(s){r.reason ? ` · ${r.reason}` : ''}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => decide(r.id, 'approved')} disabled={busyId === r.id} className="inline-flex items-center gap-1.5 rounded-lg border border-empire-green/40 bg-empire-green-bg px-3 py-1.5 text-[10px] uppercase tracking-widest text-empire-green-bright hover:bg-empire-green/20 disabled:opacity-40"><EmpireIcon name="check" size={12} /> Approve</button>
                  <button onClick={() => decide(r.id, 'rejected')} disabled={busyId === r.id} className="inline-flex items-center gap-1.5 rounded-lg border border-empire-red/40 bg-empire-red-bg px-3 py-1.5 text-[10px] uppercase tracking-widest text-empire-red-bright hover:bg-empire-red/20 disabled:opacity-40"><EmpireIcon name="close" size={12} /> Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sick.length > 0 && (
        <div>
          <h4 className="mb-2 text-[11px] uppercase tracking-widest text-empire-text-muted">Sick days</h4>
          <div className="space-y-2">
            {sick.map(r => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-empire-border bg-empire-surface p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm text-empire-text">{r.employee.name}</div>
                  <div className="text-xs text-empire-text-dim">{r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)} · {r.days} day(s)</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase tracking-widest ${r.reported ? 'text-empire-text-muted' : 'text-empire-amber-bright'}`}>{r.reported ? 'reported' : 'unreported'}</span>
                  <span className={`text-[10px] uppercase tracking-widest ${r.hrConfirmed ? 'text-empire-green-bright' : 'text-empire-text-dim'}`}>{r.hrConfirmed ? 'HR confirmed' : 'unconfirmed'}</span>
                  {canManage && !r.hrConfirmed && (
                    <button onClick={() => confirmSick(r.id)} disabled={busyId === r.id} className="rounded-lg border border-empire-green/40 px-2 py-1 text-[10px] uppercase tracking-widest text-empire-green-bright hover:bg-empire-green/15 disabled:opacity-40">Confirm</button>
                  )}
                  {canManage && (
                    <button onClick={() => remove(r.id)} disabled={busyId === r.id} aria-label="Remove" className="text-empire-text-dim hover:text-empire-red-bright disabled:opacity-40"><EmpireIcon name="close" size={12} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="mb-2 text-[11px] uppercase tracking-widest text-empire-text-muted">Vacation balances · {year}</h4>
        <div className="overflow-x-auto rounded-lg border border-empire-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-empire-border text-left text-[10px] uppercase tracking-widest text-empire-text-dim">
                <th className="px-3 py-2 font-medium">Member</th>
                <th className="px-3 py-2 font-medium text-right">Allowance</th>
                <th className="px-3 py-2 font-medium text-right">Taken</th>
                <th className="px-3 py-2 font-medium text-right">Pending</th>
                <th className="px-3 py-2 font-medium text-right">Remaining</th>
                <th className="px-3 py-2 font-medium text-right">Sick</th>
                <th className="px-3 py-2 font-medium">Birthday</th>
              </tr>
            </thead>
            <tbody>
              {data.balances.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-empire-text-dim">No people in this unit yet.</td></tr>
              )}
              {data.balances.map(b => (
                <tr key={b.employeeId} className="border-b border-empire-border/40 last:border-0">
                  <td className="px-3 py-2">
                    <div className="text-empire-text">{b.name}</div>
                    <div className="text-[11px] text-empire-text-dim">{b.role}</div>
                  </td>
                  <td className="px-3 py-2 text-right text-empire-text-muted">{b.allowance}</td>
                  <td className="px-3 py-2 text-right text-empire-text-muted">{b.taken}</td>
                  <td className="px-3 py-2 text-right text-empire-amber-bright">{b.pending || '—'}</td>
                  <td className={`px-3 py-2 text-right font-medium ${b.remaining <= 3 ? 'text-empire-red-bright' : 'text-empire-green-bright'}`}>{b.remaining}</td>
                  <td className="px-3 py-2 text-right text-empire-text-muted">{b.sickDays || '—'}</td>
                  <td className="px-3 py-2 text-empire-text-dim">{b.birthday ? `${b.birthday.slice(3)}/${b.birthday.slice(0, 2)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {requesting && (
        <LeaveRequestModal dept={dept} balances={data.balances}
          onClose={() => setRequesting(false)}
          onCreated={() => { setRequesting(false); reload() }} />
      )}
    </div>
  )
}

function LeaveRequestModal({ dept, balances, onClose, onCreated }: {
  dept: Dept; balances: LeaveBalance[]; onClose: () => void; onCreated: () => void
}) {
  const [employeeId, setEmployeeId] = useState(balances[0]?.employeeId || '')
  const [type, setType] = useState<LeaveKind>('vacation')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [reported, setReported] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const chosen = balances.find(b => b.employeeId === employeeId)

  async function submit() {
    if (!employeeId) { setErr('Choose a person'); return }
    if (!startDate || !endDate) { setErr('Pick a start and end date'); return }
    if (endDate < startDate) { setErr('The end date is before the start date'); return }
    setBusy(true); setErr('')
    try {
      await post('/api/leave', { employeeId, type, startDate, endDate, reason: reason.trim() || null, reported })
      onCreated()
    } catch (e: any) { setErr(e?.message || 'Could not file the request'); setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={`Request leave — ${dept.name}`} icon={<EmpireIcon name="calendar" size={18} />}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-empire-text-muted">Person</label>
          <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="w-full rounded-lg border border-empire-border bg-empire-surface/60 px-3 py-2 text-sm text-empire-text outline-none focus:border-empire-gold/50">
            {balances.length === 0 && <option value="">No people in this unit</option>}
            {balances.map(b => <option key={b.employeeId} value={b.employeeId}>{b.name} — {b.remaining} days left</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-empire-text-muted">Type</label>
          <div className="flex gap-2">
            {(['vacation', 'sick', 'other'] as LeaveKind[]).map(t => (
              <button key={t} type="button" onClick={() => setType(t)} className={`flex-1 rounded-lg border px-3 py-2 text-xs uppercase tracking-widest transition-colors ${type === t ? 'border-empire-gold text-empire-gold' : 'border-empire-border text-empire-text-dim hover:text-empire-text'}`}>{KIND_TONE[t].label}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-empire-text-muted">From</label>
            <DatePicker value={startDate} onChange={e => setStartDate(e.target.value)} className="empire-input w-full" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-empire-text-muted">To</label>
            <DatePicker value={endDate} onChange={e => setEndDate(e.target.value)} className="empire-input w-full" />
          </div>
        </div>
        {type === 'vacation' && chosen && (
          <p className="text-[11px] text-empire-text-dim">{chosen.remaining} of {chosen.allowance} vacation days remaining. Only working days (Mon–Fri) are counted.</p>
        )}
        {type === 'sick' && (
          <label className="flex items-center gap-2 text-[11px] text-empire-text-muted">
            <input type="checkbox" checked={reported} onChange={e => setReported(e.target.checked)} className="accent-empire-gold" />
            Reported in advance (uncheck for an unreported sick day)
          </label>
        )}
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-empire-text-muted">Reason <span className="text-empire-text-dim">(optional)</span></label>
          <input value={reason} onChange={e => setReason(e.target.value)} className="w-full rounded-lg border border-empire-border bg-empire-surface/60 px-3 py-2 text-sm text-empire-text placeholder:text-empire-text-dim outline-none focus:border-empire-gold/50" placeholder="Context for HR…" />
        </div>
        {err && <p className="text-[11px] text-empire-red-bright">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg border border-empire-border px-4 py-2 text-xs uppercase tracking-widest text-empire-text-muted transition-colors hover:text-empire-text">Cancel</button>
          <button onClick={submit} disabled={busy} className="empire-btn-primary disabled:opacity-50">{busy ? 'Filing…' : 'File request'}</button>
        </div>
      </div>
    </Modal>
  )
}

function RaiseRequestModal({ source, template, depts, onClose, onCreated }: {
  source: Dept; template: RequestTemplate; depts: AllDept[]; onClose: () => void; onCreated: () => void
}) {
  const fixedTarget = template.targetSlug ? depts.find(d => d.slug === template.targetSlug) : undefined
  const [targetId, setTargetId] = useState(fixedTarget?.id || '')
  const [title, setTitle] = useState(template.titleTpl)
  const [description, setDescription] = useState(template.descScaffold)
  const [priority, setPriority] = useState(template.priority)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit() {
    const target = fixedTarget || depts.find(d => d.id === targetId)
    if (!title.trim()) { setErr('A title is required'); return }
    if (!target) { setErr('Choose the unit that should decide this'); return }
    setBusy(true); setErr('')
    try {
      await post('/api/approvals', {
        title: title.trim(), description: description.trim() || null,
        category: target.name, priority,
        sourceDepartmentId: source.id, targetDepartmentId: target.id,
        metadata: { requestType: template.requestType, kind: 'cross_dept_request' },
      })
      onCreated()
    } catch (e: any) { setErr(e?.message || 'Could not raise the request'); setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={template.label} icon={template.icon}>
      <div className="space-y-3">
        <p className="text-[11px] text-empire-text-dim">From <span className="text-empire-text-muted">{source.name}</span>{fixedTarget && <> → <span className="text-empire-text-muted">{fixedTarget.name}</span></>}</p>
        {!fixedTarget && (
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-empire-text-muted">Send to</label>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full rounded-lg border border-empire-border bg-empire-surface/60 px-3 py-2 text-sm text-empire-text outline-none focus:border-empire-gold/50">
              <option value="">Choose a unit…</option>
              {depts.filter(d => d.id !== source.id).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-empire-text-muted">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-empire-border bg-empire-surface/60 px-3 py-2 text-sm text-empire-text placeholder:text-empire-text-dim outline-none focus:border-empire-gold/50" placeholder="What are you asking for?" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-empire-text-muted">Detail</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full rounded-lg border border-empire-border bg-empire-surface/60 px-3 py-2 text-sm text-empire-text placeholder:text-empire-text-dim outline-none focus:border-empire-gold/50" placeholder="Context the deciding unit needs…" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-empire-text-muted">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-empire-border bg-empire-surface/60 px-3 py-2 text-sm text-empire-text outline-none focus:border-empire-gold/50">
            {['low', 'normal', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {err && <p className="text-[11px] text-empire-red-bright">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg border border-empire-border px-4 py-2 text-xs uppercase tracking-widest text-empire-text-muted transition-colors hover:text-empire-text">Cancel</button>
          <button onClick={submit} disabled={busy} className="empire-btn-primary disabled:opacity-50">{busy ? 'Sending…' : 'Send request'}</button>
        </div>
      </div>
    </Modal>
  )
}

function AutomateTab({ dept, accent, onUpdate }: { dept: Dept; accent: string; onUpdate: () => void }) {
  const [state, setState] = useState<AutomationState | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState<AutomationTemplate | null>(null)
  const [err, setErr] = useState('')

  const reload = useCallback(async () => {
    try {
      const s: AutomationState = await fetcher(`/api/departments/${dept.slug}/automation`)
      setState(s)
      setPicked(new Set(s.appointed.map(a => a.id)))
    } catch (e) { console.error(e) }
  }, [dept.slug])
  useEffect(() => { reload() }, [reload])

  function toggle(id: string) {
    setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function setEnabled(enabled: boolean) {
    setErr(''); setBusy(true)
    try {
      await patch(`/api/departments/${dept.slug}/automation`, { enabled, appointAgentIds: enabled ? Array.from(picked) : [] })
      await reload(); onUpdate()
    } catch (e: any) { setErr(e?.message || 'Failed to update automation') }
    finally { setBusy(false) }
  }

  async function createFromTemplate(t: AutomationTemplate, name: string) {
    setErr(''); setBusy(true)
    try {
      await post('/api/agents', { name: name.trim() || t.suggestedName, role: t.role, kind: 'bot', bio: t.desc, departmentId: state?.unit.id, permissions: [] })
      setCreating(null)
      await reload(); onUpdate()
    } catch (e: any) { setErr(e?.message || 'Failed to create operator') }
    finally { setBusy(false) }
  }

  if (!state) return <div className="text-empire-text-dim text-sm p-6">Loading automation…</div>
  const hasOperators = state.operators.length > 0

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader title="Automate Unit" subtitle="Admin-only. Hand this unit's day-to-day to one or more operators, orchestrated by the agent that drives Empire through the MCP." />

      {/* status + master toggle */}
      <div className="bg-empire-surface border border-empire-border rounded-lg p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ background: empireTint(accent, '30'), color: accent }}>
            <EmpireIcon name={state.enabled ? 'sparkle' : 'cog'} size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-empire-text text-sm font-medium">{state.enabled ? 'This unit is automated' : 'This unit is run manually'}</div>
            <div className="text-empire-text-dim text-xs mt-0.5">
              {state.enabled
                ? `${state.appointed.length} operator(s) appointed${state.appointed.length ? ' · ' + state.appointed.map(a => a.name).join(', ') : ''}`
                : hasOperators ? 'Appoint operators below, then turn it on.' : 'Create an operator first — automation needs at least one.'}
            </div>
          </div>
        </div>
        {state.enabled ? (
          <button onClick={() => setEnabled(false)} disabled={busy} className="px-3 py-2 rounded border border-empire-border text-empire-text-muted text-[10px] uppercase tracking-widest hover:text-empire-red-bright hover:border-empire-red/40 transition-colors disabled:opacity-50 flex-shrink-0">
            Turn off
          </button>
        ) : (
          <button onClick={() => setEnabled(true)} disabled={busy || !hasOperators || picked.size === 0} className="empire-btn-primary disabled:opacity-50 flex-shrink-0">
            {busy ? 'Saving…' : 'Automate unit'}
          </button>
        )}
      </div>

      {err && <p className="text-[11px] text-empire-red-bright">{err}</p>}

      {/* appoint existing operators */}
      <div>
        <div className="text-empire-text text-xs uppercase tracking-widest mb-2 inline-flex items-center gap-1.5"><EmpireIcon name="sparkle" size={12} className="text-empire-gold" /> Appoint operators</div>
        {!hasOperators ? (
          <div className="text-empire-text-dim text-xs italic p-3 bg-empire-surface border border-empire-border rounded-lg">No operators in this unit yet — create one from a template below; it appears here to appoint.</div>
        ) : (
          <div className="space-y-2">
            {state.operators.map(a => {
              const on = picked.has(a.id)
              return (
                <button key={a.id} type="button" onClick={() => toggle(a.id)} className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${on ? 'border-empire-gold/50 bg-empire-gold/10' : 'border-empire-border bg-empire-surface hover:border-empire-gold/20'}`}>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${on ? 'border-empire-gold bg-empire-gold/20' : 'border-empire-border'}`}>
                    {on && <EmpireIcon name="check" size={12} className="text-empire-gold" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-empire-text text-xs font-medium truncate">{a.name}{a.codename && <span className="text-empire-text-muted"> · {a.codename}</span>}</div>
                    <div className="text-empire-text-dim text-xs truncate">{a.role}</div>
                  </div>
                  <span className="text-[10px] text-empire-text-muted flex-shrink-0">{a.status}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* per-unit templates → create an operator step by step */}
      <div>
        <div className="text-empire-text text-xs uppercase tracking-widest mb-2 inline-flex items-center gap-1.5"><EmpireIcon name="plus" size={12} className="text-empire-gold" /> Create from template</div>
        <div className="grid grid-cols-2 gap-3">
          {state.templates.map(t => (
            <div key={t.slug} className="bg-empire-surface border border-empire-border rounded-lg p-4">
              <div className="text-empire-text text-sm font-medium">{t.role}</div>
              <div className="text-empire-text-dim text-xs mt-1 mb-3">{t.desc}</div>
              <button onClick={() => { setCreating(t); setErr('') }} className="px-3 py-1.5 bg-empire-elevated/40 border border-empire-border text-empire-text-dim text-[10px] uppercase tracking-widest rounded hover:text-empire-gold hover:border-empire-gold/30 transition-colors inline-flex items-center gap-1">
                <EmpireIcon name="plus" size={11} /> Create operator
              </button>
            </div>
          ))}
        </div>
      </div>

      {creating && (
        <CreateOperatorModal template={creating} busy={busy} onClose={() => setCreating(null)} onCreate={(name) => createFromTemplate(creating, name)} />
      )}
    </div>
  )
}

function CreateOperatorModal({ template, busy, onClose, onCreate }: { template: AutomationTemplate; busy: boolean; onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState(template.suggestedName)
  return (
    <Modal open onClose={onClose} title={`New ${template.role}`} icon={<EmpireIcon name="sparkle" size={18} />}>
      <div className="space-y-3">
        <p className="text-empire-text-dim text-xs">{template.desc} Ops-only — no login. The MCP agent wears it as a hat.</p>
        <div>
          <label className="empire-label">Operator name *</label>
          <input className="empire-input w-full mt-1" value={name} onChange={e => setName(e.target.value)} placeholder={template.suggestedName} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={() => onCreate(name)} disabled={busy || !name.trim()} className="empire-btn-primary disabled:opacity-50">{busy ? 'Creating…' : 'Create operator'}</button>
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
  const [editing, setEditing] = useState<FollowUp | null>(null)
  const [viewing, setViewing] = useState<FollowUp | null>(null)

  const filtered = followUps.filter(f => {
    if (filter === 'open') return f.status !== 'done'
    if (filter === 'done') return f.status === 'done'
    return true
  })

  async function remove(id: string) {
    await del(`/api/followups/${id}`)
    onUpdate()
  }

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
              <DatePicker value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="empire-input w-full mt-1" />
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
              <div className="flex items-center gap-2">
                {f.status !== 'done' && f.status !== 'in_progress' && (
                  <button onClick={() => updateStatus(f.id, 'in_progress')} className="text-xs px-2 py-1 border border-empire-amber/40 text-empire-amber-bright rounded hover:bg-empire-amber/10 transition-colors">
                    Start
                  </button>
                )}
                <RowActions
                  onView={() => setViewing(f)}
                  onEdit={() => setEditing(f)}
                  onDelete={() => remove(f.id)}
                  deleteLabel={`follow-up "${f.title}"`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.title} icon={<EmpireIcon name="flag" size={18} />}>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <PriorityBadge priority={viewing.priority} />
              <StatusBadge status={viewing.status} />
            </div>
            {viewing.description && <p className="text-empire-text-muted">{viewing.description}</p>}
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {viewing.dueDate && (
                <div><dt className="text-empire-text-dim uppercase tracking-wide">Due</dt><dd className="text-empire-text">{format(new Date(viewing.dueDate), 'MMM d, yyyy')}</dd></div>
              )}
              {viewing.assignee && (
                <div><dt className="text-empire-text-dim uppercase tracking-wide">Assignee</dt><dd className="text-empire-text">{viewing.assignee.name}</dd></div>
              )}
              <div><dt className="text-empire-text-dim uppercase tracking-wide">Created</dt><dd className="text-empire-text">{formatDistanceToNow(new Date(viewing.createdAt), { addSuffix: true })}</dd></div>
            </dl>
          </div>
        </Modal>
      )}

      {editing && (
        <EditFollowUpModal followUp={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onUpdate() }} />
      )}
    </div>
  )
}

function EditFollowUpModal({ followUp, onClose, onSaved }: {
  followUp: FollowUp; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    title: followUp.title,
    description: followUp.description || '',
    priority: followUp.priority,
    dueDate: followUp.dueDate ? followUp.dueDate.slice(0, 10) : '',
  })
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!form.title) return
    setBusy(true)
    try {
      await patch(`/api/followups/${followUp.id}`, {
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        dueDate: form.dueDate || null,
      })
      onSaved()
    } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title="Edit follow-up" icon={<EmpireIcon name="pen" size={18} />}>
      <div className="space-y-3">
        <div>
          <label className="empire-label">Title</label>
          <input value={form.title} placeholder="Follow-up title" onChange={e => setForm({ ...form, title: e.target.value })} className="empire-input w-full mt-1" />
        </div>
        <div>
          <label className="empire-label">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="empire-input w-full mt-1 resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="empire-label">Priority</label>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="empire-input w-full mt-1">
              {['low', 'normal', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="empire-label">Due Date</label>
            <DatePicker value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="empire-input w-full mt-1" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy} className="empire-btn-primary disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
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
                <AffixInput money type="number" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="empire-input w-full mt-1" />
              </div>
            )}
            <div>
              <label className="empire-label">{cfg.refLabel}</label>
              <input placeholder="Optional ref" value={form.refId} onChange={e => setForm({ ...form, refId: e.target.value })} className="empire-input w-full mt-1" />
            </div>
            <div>
              <label className="empire-label">Start → End</label>
              <div className="flex gap-2 mt-1">
                <DatePicker value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="empire-input flex-1" />
                <DatePicker value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="empire-input flex-1" />
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
