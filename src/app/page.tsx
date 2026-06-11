'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import '@aejkatappaja/phantom-ui'
import { fetcher, ragColor, ragLabel, formatCurrency, post, patch, del } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { RowActions } from '@/components/molecules/RowActions'
import { Modal } from '@/components/molecules/Modal'
import { Pagination } from '@/components/molecules/Pagination'
import { DealLinkModal, type DealLink } from '@/components/molecules/DealLinkModal'
import { PersonModal, type PersonLite } from '@/lib/ui'
import { MICROSERVICES } from '@/lib/microservices'
import { gameFor } from '@/lib/game'
import StandingsBoard from '@/components/organisms/StandingsBoard'
import { NotificationsPanel } from '@/components/organisms/NotificationsPanel'
import { EmpireIcon, asIconName, type IconName } from '@/components/atoms/EmpireIcon'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { UnitMedallion } from '@/components/atoms/UnitMedallion'
import { ProfileSwitcher } from '@/components/molecules/ProfileSwitcher'
import { TERMS } from '@/lib/terms'
import { empireColor, empireTint } from '@/lib/theme'
import { AffixInput } from '@/components/molecules/AffixInput'

type Department = {
  id: string
  name: string
  slug: string
  description: string
  kpiFramework: string
  icon: string
  color: string
  managedByAI: boolean
  aiManagerName: string | null
  _count: { employees: number }
  compositeScores: Array<{ score: number | null; ragStatus: string; period: string }>
}

type Employee = {
  id: string
  name: string
  role: string
  salaryAmount: number | null
  contractType: string
  commissionRate: number | null
  joinedAt?: string
  notes?: string | null
  department: { name: string; slug: string; color: string; icon: string }
}

type ActivityEvent = {
  id: string
  eventType: string
  title: string
  description: string | null
  createdAt: string
  department: { name: string; icon: string } | null
}

type Deal = {
  id: string
  title: string
  client: string
  amount: number
  currency: string
  status: string
  notes?: string | null
  partnerId?: string | null
  commissionRate?: number | null
  commissionAmount: number | null
  linkedUnitSlug?: string | null
  linkedEntityType?: string | null
  linkedEntityId?: string | null
  createdAt: string
}

type ApprovalRequest = {
  id: string
  title: string
  category: string
  priority: string
  status: string
  requestedBy: string
  createdAt: string
}

export default function EmpireDashboard() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'network' | 'roster' | 'deals' | 'chronicle' | 'approvals'>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [depts, emps, evts, dlz, apvs] = await Promise.all([
          fetcher('/api/departments'),
          fetcher('/api/employees'),
          fetcher('/api/events?limit=30'),
          fetcher('/api/deals'),
          fetcher('/api/approvals?status=pending'),
        ])
        setDepartments(depts)
        setEmployees(emps)
        setEvents(evts.events)
        setDeals(dlz)
        setApprovals(apvs)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalPayroll = employees
    .filter(e => e.contractType === 'fixed' && e.salaryAmount)
    .reduce((sum, e) => sum + (e.salaryAmount || 0), 0)

  const pendingApprovals = approvals.filter(a => a.status === 'pending').length
  const activeDeals = deals.filter(d => ['prospect', 'negotiating'].includes(d.status)).length
  const pipelineValue = deals
    .filter(d => ['prospect', 'negotiating'].includes(d.status))
    .reduce((sum, d) => sum + d.amount, 0)

  if (loading) return <EmpireLoader />

  return (
    <div className="min-h-screen bg-empire-void">
      {/* Header */}
      <header className="border-b border-empire-border bg-empire-deep/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <ProfileSwitcher />
          <div className="flex items-center gap-3">
            {pendingApprovals > 0 && (
              <button
                onClick={() => setActiveTab('approvals')}
                className="flex items-center gap-2 px-3 py-1.5 bg-empire-amber-bg border border-empire-amber/40 rounded text-empire-amber-bright text-xs font-medium hover:border-empire-amber transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-empire-amber/20 flex items-center justify-center text-xs">
                  {pendingApprovals}
                </span>
                Decision pending
              </button>
            )}
            <div className="text-empire-text-muted text-xs">
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="max-w-screen-2xl mx-auto px-6 pb-0">
          <div className="relative flex gap-1">
          {(['overview', 'network', 'roster', 'deals', 'chronicle', 'approvals'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative min-w-[7.5rem] px-4 py-2 text-xs uppercase tracking-widest font-medium transition-all duration-200 hover:-translate-y-0.5 ${
                activeTab === tab
                  ? 'text-empire-gold'
                  : 'text-empire-text-muted hover:text-empire-text'
              }`}
            >
              {tab}
              {tab === 'approvals' && pendingApprovals > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-empire-amber/20 text-empire-amber-bright text-xs">
                  {pendingApprovals}
                </span>
              )}
            </button>
          ))}
          <span
            aria-hidden
            className="absolute bottom-0 h-0.5 rounded-full bg-empire-gold transition-transform duration-300 ease-out"
            style={{
              width: '7.5rem',
              transform: `translateX(${(['overview', 'network', 'roster', 'deals', 'chronicle', 'approvals'] as const).indexOf(activeTab) * 7.75}rem)`,
            }}
          />
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewTab
            departments={departments}
            totalPayroll={totalPayroll}
            activeDeals={activeDeals}
            pipelineValue={pipelineValue}
            headcount={employees.filter(e => e.contractType !== 'ai_agent').length}
          />
        )}
        {activeTab === 'network' && <CompanyNetworkTab departments={departments} employees={employees} />}
        {activeTab === 'roster' && <RosterTab employees={employees} />}
        {activeTab === 'deals' && <DealsTab deals={deals} setDeals={setDeals} employees={employees} />}
        {activeTab === 'chronicle' && <ChronicleTab events={events} />}
        {activeTab === 'approvals' && <ApprovalsTab approvals={approvals} setApprovals={setApprovals} />}
      </main>
    </div>
  )
}

function useActiveCompanyName(): string {
  const [name, setName] = useState('Empire')
  useEffect(() => {
    let alive = true
    const resolve = async () => {
      try {
        const rows: Array<{ slug: string; name: string }> = await fetcher('/api/companies')
        const slug = localStorage.getItem('empire-os-active-profile')
        const active = rows.find(c => c.slug === slug) ?? rows[0]
        if (alive && active) setName(active.name)
      } catch { /* keep last known name */ }
    }
    resolve()
    window.addEventListener('empire-profile-change', resolve)
    return () => { alive = false; window.removeEventListener('empire-profile-change', resolve) }
  }, [])
  return name
}

function CompanyNetworkTab({ departments, employees }: { departments: Department[]; employees: Employee[] }) {
  const companyName = useActiveCompanyName()
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const units = departments.slice(0, 12)
  const center = { x: 50, y: 50 }
  // Two alternating orbit radii so neighbouring unit clusters breathe instead
  // of packing onto one ring and overlapping each other's member/doc satellites.
  const ringRadius = (index: number) => (index % 2 === 0 ? 33 : 41)
  const zoomBy = (delta: number) => setScale(value => Math.min(1.8, Math.max(0.68, Number((value + delta).toFixed(2)))))
  const centerMap = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  const unitNodes = units.map((dept, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(units.length, 1) - Math.PI / 2
    const radius = ringRadius(index)
    const x = center.x + Math.cos(angle) * radius
    const y = center.y + Math.sin(angle) * radius
    const members = employees.filter(e => e.department.slug === dept.slug && e.contractType !== 'ai_agent').slice(0, 3)
    return { dept, x, y, angle, members }
  })

  const edges: Array<{ x1: number; y1: number; x2: number; y2: number; color: string; delay: number }> = []
  const childNodes: Array<{ id: string; kind: 'members' | 'documents' | 'person'; label: string; x: number; y: number; color: string; href?: string; delay: number }> = []

  unitNodes.forEach((node, index) => {
    const accent = empireColor(node.dept.color)
    edges.push({ x1: center.x, y1: center.y, x2: node.x, y2: node.y, color: accent, delay: index * 70 })
    const memberHubX = node.x + Math.cos(node.angle - 0.3) * 15
    const memberHubY = node.y + Math.sin(node.angle - 0.3) * 15
    const docHubX = node.x + Math.cos(node.angle + 0.55) * 17
    const docHubY = node.y + Math.sin(node.angle + 0.55) * 17
    edges.push({ x1: node.x, y1: node.y, x2: memberHubX, y2: memberHubY, color: '#F4EFE3', delay: 180 + index * 45 })
    edges.push({ x1: node.x, y1: node.y, x2: docHubX, y2: docHubY, color: '#C9A233', delay: 240 + index * 45 })
    childNodes.push({ id: `${node.dept.id}-members`, kind: 'members', label: `${node.dept.name} members`, x: memberHubX, y: memberHubY, color: '#F4EFE3', href: `/departments/${node.dept.slug}`, delay: index * 60 })
    childNodes.push({ id: `${node.dept.id}-docs`, kind: 'documents', label: `${node.dept.name} documents`, x: docHubX, y: docHubY, color: '#C9A233', href: `/departments/${node.dept.slug}`, delay: index * 60 + 90 })
    node.members.forEach((member, memberIndex) => {
      const spread = (memberIndex - (node.members.length - 1) / 2) * 0.42
      const px = memberHubX + Math.cos(node.angle + spread) * 10
      const py = memberHubY + Math.sin(node.angle + spread) * 10
      edges.push({ x1: memberHubX, y1: memberHubY, x2: px, y2: py, color: '#F4EFE3', delay: 320 + index * 35 + memberIndex * 45 })
      childNodes.push({ id: member.id, kind: 'person', label: `${member.name} · ${member.role}`, x: px, y: py, color: accent, delay: index * 80 + memberIndex * 60 })
    })
  })

  return (
    <div className="space-y-6 animate-slide-up">
      <SectionHeader title="Company Network" subtitle="Company intelligence map for MCP agents: units, members and documents as connected context" />
      <GlassPanel variant="glass" className="relative overflow-hidden rounded-xl p-0">
        <div
          className="network-canvas relative h-[760px] min-h-[620px] touch-none cursor-grab overflow-hidden active:cursor-grabbing"
          onWheel={event => {
            event.preventDefault()
            zoomBy(event.deltaY > 0 ? -0.08 : 0.08)
          }}
          onPointerDown={event => {
            if ((event.target as HTMLElement).closest('a,button')) return
            event.currentTarget.setPointerCapture(event.pointerId)
            dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }
          }}
          onPointerMove={event => {
            const drag = dragRef.current
            if (!drag) return
            setOffset({ x: drag.ox + event.clientX - drag.x, y: drag.oy + event.clientY - drag.y })
          }}
          onPointerUp={() => { dragRef.current = null }}
          onPointerCancel={() => { dragRef.current = null }}
        >
          <div className="absolute right-4 top-4 z-20 flex items-center gap-1 rounded-full border border-empire-border/70 bg-empire-deep/80 p-1 backdrop-blur">
            <button type="button" onClick={() => zoomBy(-0.12)} aria-label="Zoom network out" className="grid h-8 w-8 place-items-center rounded-full text-empire-text-muted transition-colors hover:bg-empire-elevated hover:text-empire-gold">
              <EmpireIcon name="close" size={13} />
            </button>
            <span className="min-w-12 text-center font-data text-[11px] text-empire-text-dim">{Math.round(scale * 100)}%</span>
            <button type="button" onClick={() => zoomBy(0.12)} aria-label="Zoom network in" className="grid h-8 w-8 place-items-center rounded-full text-empire-text-muted transition-colors hover:bg-empire-elevated hover:text-empire-gold">
              <EmpireIcon name="plus" size={14} />
            </button>
            <button type="button" onClick={centerMap} aria-label="Center network" className="grid h-8 w-8 place-items-center rounded-full text-empire-text-muted transition-colors hover:bg-empire-elevated hover:text-empire-gold">
              <EmpireIcon name="compass" size={14} />
            </button>
          </div>
          <div
            className="absolute inset-0 will-change-transform"
            style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`, transformOrigin: '50% 50%' }}
          >
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {edges.map((edge, i) => (
                <path
                  key={i}
                  d={`M ${edge.x1} ${edge.y1} Q ${(edge.x1 + edge.x2) / 2} ${(edge.y1 + edge.y2) / 2 - 1.4} ${edge.x2} ${edge.y2}`}
                  vectorEffect="non-scaling-stroke"
                  fill="none"
                  stroke={edge.color}
                  // non-scaling-stroke makes strokeWidth screen pixels, not viewBox
                  // units — sub-pixel values (0.2) antialias into broken dots.
                  strokeWidth={edge.x1 === center.x && edge.y1 === center.y ? 1.6 : 1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  shapeRendering="geometricPrecision"
                  className="network-edge"
                  style={{ animationDelay: `${edge.delay}ms` }}
                />
              ))}
            </svg>

            <div className="network-aura" style={{ left: `${center.x}%`, top: `${center.y}%` }} aria-hidden />
            <div className="network-node network-company" style={{ left: `${center.x}%`, top: `${center.y}%` }}>
              <span className="font-empire text-lg leading-tight text-empire-gold">{companyName}</span>
              <span className="network-tip">Mother node: {companyName}</span>
            </div>

            {unitNodes.map((node, index) => (
              <Link key={node.dept.id} href={`/departments/${node.dept.slug}`} className="network-node network-unit" style={{ left: `${node.x}%`, top: `${node.y}%`, borderColor: `${empireColor(node.dept.color)}70`, animationDelay: `${index * 80}ms` }}>
                <UnitMedallion slug={node.dept.slug} size={38} />
                <span className="mt-1 max-w-[110px] truncate text-center text-[11px] font-semibold text-empire-text">{node.dept.name}</span>
                <span className="network-tip">{node.dept.name} · {node.dept._count.employees} members</span>
              </Link>
            ))}

            {childNodes.map(node => (
              node.href ? (
                <Link key={node.id} href={node.href} className={`network-node network-child network-${node.kind}`} style={{ left: `${node.x}%`, top: `${node.y}%`, borderColor: `${node.color}70`, color: node.color, animationDelay: `${node.delay}ms` }}>
                  <EmpireIcon name={node.kind === 'documents' ? 'document' : 'people'} size={15} />
                  <span className="network-tip">{node.label}</span>
                </Link>
              ) : (
                <button key={node.id} className="network-node network-child network-person" style={{ left: `${node.x}%`, top: `${node.y}%`, borderColor: `${node.color}70`, color: node.color, animationDelay: `${node.delay}ms` }}>
                  <EmpireIcon name="user" size={13} />
                  <span className="network-tip">{node.label}</span>
                </button>
              )
            ))}
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}

function OverviewTab({ departments, totalPayroll, activeDeals, pipelineValue, headcount }: {
  departments: Department[]
  totalPayroll: number
  activeDeals: number
  pipelineValue: number
  headcount: number
}) {
  return (
    <div className="space-y-8 animate-slide-up">
      {/* Throne metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ThroneMetric label="Headcount" value={headcount.toString()} sub="active members" icon="people" />
        <ThroneMetric label="Monthly Payroll" value={formatCurrency(totalPayroll)} sub="fixed salaries" icon="coins" />
        <ThroneMetric label="Active Deals" value={activeDeals.toString()} sub="in pipeline" icon="handshake" />
        <ThroneMetric label="Pipeline Value" value={formatCurrency(pipelineValue)} sub="potential revenue" icon="chart-line" />
      </div>

      {/* Empire leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionHeader title="The Standings" subtitle="Top earners — pick a quarter" />
          <StandingsBoard />
        </div>
        <div className="space-y-6">
          <div>
            <SectionHeader title="Territory Health" subtitle="RAG roll-up across every unit" />
            <TerritoryHealth departments={departments} />
          </div>
          <div>
            <SectionHeader title="Notifications" subtitle="Live alerts across the empire" />
            <div className="mt-4"><NotificationsPanel /></div>
          </div>
        </div>
      </div>
    </div>
  )
}

const SLUG_ALIAS: Record<string, string> = { tech: 'engineering' }

function MicroservicesLauncher({ departments }: { departments: Department[] }) {
  const bySlug = new Map(departments.map(d => [d.slug, d]))
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
      {MICROSERVICES.map(ms => {
        const dept = bySlug.get(ms.slug) || bySlug.get(SLUG_ALIAS[ms.slug])
        const rag = dept?.compositeScores?.[0]?.ragStatus || 'PENDING'
        const score = dept?.compositeScores?.[0]?.score
        const g = gameFor(`${ms.slug}-game`)
        return (
          <Link key={ms.slug} href={`/departments/${ms.slug}`}>
            <GlassPanel variant="glass" className="group relative rounded-xl p-5 h-full overflow-hidden transition-all duration-200 hover:border-empire-gold/40 hover:shadow-gold-glow hover:-translate-y-0.5 cursor-pointer">
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl opacity-70" style={{ background: ms.accent }} />
              <div className="flex items-start justify-between mb-3">
                <UnitMedallion slug={ms.slug} size={44} />
                {dept && (
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${ragColor(rag)}`}>
                    {score != null ? score : ragLabel(rag)}
                  </span>
                )}
              </div>
              <h3 className="font-empire text-empire-text text-sm tracking-wide group-hover:text-empire-gold transition-colors">{ms.name}</h3>
              <p className="text-empire-text-muted text-xs leading-relaxed mt-1.5 line-clamp-2 min-h-[32px]">{ms.blurb}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-empire-border">
                <span className="text-[11px] text-empire-text-dim">Lv {g.level} · {g.xp.toLocaleString()} XP</span>
                <span className="text-[11px] font-medium transition-colors" style={{ color: ms.accent }}>Enter →</span>
              </div>
            </GlassPanel>
          </Link>
        )
      })}
    </div>
  )
}

/* Territory Health — a RAG monitor (not the unit launcher above). Rolls every
 * unit's latest composite RAG into band tallies, then lists the units that need
 * attention worst-first so the Throne sees where to look, not a card wall. */
function TerritoryHealth({ departments }: { departments: Department[] }) {
  const bandOf = (d: Department) => (d.compositeScores?.[0]?.ragStatus || 'PENDING').toUpperCase()
  const scoreOf = (d: Department) => d.compositeScores?.[0]?.score ?? null
  const BANDS = [
    { key: 'GREEN', label: 'Healthy', color: '#C9A233' },
    { key: 'AMBER', label: 'Watch', color: '#C9A233' },
    { key: 'RED', label: 'At risk', color: '#F4EFE3' },
  ]
  const tally = (b: string) => departments.filter(d => bandOf(d) === b).length
  // Attention order: RED, then AMBER, then PENDING, each by ascending score.
  const rank: Record<string, number> = { RED: 0, AMBER: 1, PENDING: 2, GREEN: 3 }
  const attention = [...departments]
    .filter(d => bandOf(d) !== 'GREEN')
    .sort((a, b) => (rank[bandOf(a)] ?? 2) - (rank[bandOf(b)] ?? 2) || (scoreOf(a) ?? 999) - (scoreOf(b) ?? 999))

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {BANDS.map(b => (
          <div key={b.key} className="rounded-lg border border-empire-border bg-empire-elevated/30 px-3 py-3 text-center">
            <div className="font-empire text-2xl leading-none tabular-nums" style={{ color: b.color }}>{tally(b.key)}</div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-empire-text-dim mt-1.5">{b.label}</div>
          </div>
        ))}
      </div>

      <GlassPanel variant="glass" className="rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] uppercase tracking-[0.15em] text-empire-text-dim">Needs attention</span>
          <span className="text-[11px] text-empire-text-dim">{attention.length} of {departments.length}</span>
        </div>
        {attention.length === 0 ? (
          <div className="flex items-center gap-2 text-empire-text-muted text-xs py-3">
            <EmpireIcon name="check" size={14} /> Every unit is healthy.
          </div>
        ) : (
          <div className="space-y-1.5">
            {attention.map(dept => {
              const band = bandOf(dept)
              const score = scoreOf(dept)
              const color = band === 'RED' ? '#F4EFE3' : band === 'AMBER' ? '#C9A233' : '#7A7468'
              return (
                <Link key={dept.id} href={`/departments/${dept.slug}`}
                  className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-empire-elevated/40 transition-colors group">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="flex-1 min-w-0 truncate text-sm text-empire-text group-hover:text-empire-gold transition-colors">{dept.name}</span>
                  <div className="w-20 h-1.5 rounded-full bg-empire-border/60 overflow-hidden flex-shrink-0">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, score ?? 0))}%`, background: color }} />
                  </div>
                  <span className="w-9 text-right text-xs tabular-nums flex-shrink-0" style={{ color }}>{score != null ? score : ragLabel(band)}</span>
                </Link>
              )
            })}
          </div>
        )}
      </GlassPanel>
    </div>
  )
}

function DepartmentCard({ dept }: { dept: Department }) {
  const latest = dept.compositeScores?.[0]
  const rag = latest?.ragStatus || 'PENDING'
  const score = latest?.score
  const accent = empireColor(dept.color)

  return (
    <Link href={`/departments/${dept.slug}`}>
      <GlassPanel variant="glass" className="group relative rounded-lg p-5 hover:border-empire-gold/40 transition-all duration-200 hover:shadow-gold-glow cursor-pointer h-full">
        {/* color accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg opacity-60"
          style={{ background: accent }}
        />

        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="mb-2"><UnitMedallion slug={dept.slug} size={36} /></div>
            <h3 className="font-empire text-empire-text text-sm tracking-wide group-hover:text-empire-gold transition-colors">
              {dept.name}
            </h3>
          </div>
          <div className={`px-2 py-0.5 rounded text-xs font-medium ${ragColor(rag)}`}>
            {score != null ? `${score}` : ragLabel(rag)}
          </div>
        </div>

        <p className="text-empire-text-muted text-xs leading-relaxed mb-3">
          {dept.description}
        </p>

        <div className="flex items-center justify-between text-xs text-empire-text-dim pt-3 border-t border-empire-border">
          <span>{dept.kpiFramework}</span>
          <span>{dept._count.employees} member{dept._count.employees !== 1 ? 's' : ''}</span>
        </div>
      </GlassPanel>
    </Link>
  )
}

function RosterTab({ employees }: { employees: Employee[] }) {
  const [selected, setSelected] = useState<PersonLite | null>(null)
  const grouped = employees.reduce((acc, e) => {
    const key = e.department.name
    if (!acc[key]) acc[key] = []
    acc[key].push(e)
    return acc
  }, {} as Record<string, Employee[]>)

  return (
    <div className="space-y-8 animate-slide-up">
      <SectionHeader title="The Roster" subtitle="Every member of the empire — click anyone for their dossier" />
      {Object.entries(grouped).map(([deptName, members]) => (
        <div key={deptName}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-empire-gold text-xs uppercase tracking-widest font-medium">{deptName}</span>
            <div className="flex-1 h-px bg-empire-border" />
            <span className="text-empire-text-dim text-xs">{members.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map(emp => (
              <EmployeeCard key={emp.id} emp={emp} onOpen={() => setSelected(emp)} />
            ))}
          </div>
        </div>
      ))}
      <PersonModal person={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function EmployeeCard({ emp, onOpen }: { emp: Employee; onOpen: () => void }) {
  const accent = empireColor(emp.department.color)
  return (
    <button
      onClick={onOpen}
      className="group w-full text-left bg-empire-surface border border-empire-border rounded-lg p-4 flex items-start gap-3 transition-all duration-200 hover:border-empire-gold/40 hover:shadow-gold-glow cursor-pointer"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-empire font-bold flex-shrink-0"
        style={{ background: empireTint(emp.department.color, '30'), color: accent }}
      >
        {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="font-medium text-empire-text text-sm truncate group-hover:text-empire-gold transition-colors">{emp.name}</div>
          <span className="text-empire-text-dim text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
        </div>
        <div className="text-empire-text-muted text-xs mt-0.5 truncate">{emp.role}</div>
        <div className="mt-2 text-xs">
          {emp.contractType === 'fixed' && emp.salaryAmount && (
            <span className="text-empire-gold-muted">{formatCurrency(emp.salaryAmount)}/mo</span>
          )}
          {emp.contractType === 'commission' && (
            <span className="text-empire-amber-bright">{emp.commissionRate}% commission</span>
          )}
          {emp.contractType === 'ai_agent' && (
            <span className="text-empire-gold">AI Agent</span>
          )}
          {emp.contractType === 'advisory' && (
            <span className="text-empire-text-muted">Advisory</span>
          )}
        </div>
      </div>
    </button>
  )
}

const DEAL_STATUSES = ['prospect', 'negotiating', 'closed_won', 'closed_lost'] as const
const DEAL_PAGE_SIZE = 6
const titleCase = (s: string) => s.replace(/(^|[-_])(\w)/g, (_, __, c) => ' ' + c.toUpperCase()).trim()

function DealsTab({ deals, setDeals, employees }: { deals: Deal[]; setDeals: (d: Deal[]) => void; employees: Employee[] }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', client: '', amount: '', notes: '' })
  const [editing, setEditing] = useState<Deal | null>(null)
  const [viewing, setViewing] = useState<Deal | null>(null)
  const [linking, setLinking] = useState<Deal | null>(null)
  const [page, setPage] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Commission earners come from the roster: anyone with a commission rate on
  // their profile. The picked person's own rate drives the auto-calculation —
  // nothing is hard-coded.
  const earners = employees.filter(e => e.commissionRate != null && e.contractType !== 'ai_agent')
  const [earnerId, setEarnerId] = useState('')
  const earner = earners.find(e => e.id === earnerId) ?? earners[0]

  // Re-pull the canonical list so cross-links / status edits reflect server truth.
  const reload = async () => { try { setDeals(await fetcher('/api/deals')) } catch (e) { console.error(e) } }

  async function submitDeal() {
    if (!form.title || !form.client || !form.amount || submitting) return
    setSubmitting(true)
    try {
      const deal = await post('/api/deals', {
        title: form.title, client: form.client, amount: Number(form.amount),
        notes: form.notes, partnerId: earner?.id, commissionRate: earner?.commissionRate ?? 0,
      })
      setDeals([deal, ...deals])
      setForm({ title: '', client: '', amount: '', notes: '' })
      setShowForm(false)
    } catch (e) { console.error(e) } finally { setSubmitting(false) }
  }

  async function changeStatus(deal: Deal, status: string) {
    await patch(`/api/deals/${deal.id}/status`, { status })
    setDeals(deals.map(d => d.id === deal.id ? { ...d, status } : d))
  }

  async function removeDeal(deal: Deal) {
    await del(`/api/deals/${deal.id}`)
    setDeals(deals.filter(d => d.id !== deal.id))
  }

  const statusColors: Record<string, string> = {
    prospect: 'bg-empire-surface text-empire-text-muted border-empire-border',
    negotiating: 'bg-empire-amber-bg text-empire-amber-bright border-empire-amber/40',
    closed_won: 'bg-empire-green-bg text-empire-green-bright border-empire-green/40',
    closed_lost: 'bg-empire-red-bg text-empire-red-bright border-empire-red/40',
  }

  const pageCount = Math.max(1, Math.ceil(deals.length / DEAL_PAGE_SIZE))
  const shown = deals.slice((page - 1) * DEAL_PAGE_SIZE, page * DEAL_PAGE_SIZE)

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <SectionHeader title="The War Chest" subtitle="All deals — pipeline, won, lost" />
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-empire-gold-dim border border-empire-gold/30 text-empire-gold text-xs uppercase tracking-widest rounded hover:bg-empire-gold/20 transition-colors"
        >
          + New Deal
        </button>
      </div>

      {showForm && (
        <div className="bg-empire-surface border border-empire-gold/20 rounded-lg p-5 space-y-4">
          <h4 className="font-empire text-empire-gold text-sm tracking-wide">Add Deal</h4>
          <div className="grid grid-cols-2 gap-4">
            <input
              placeholder="Deal title"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="bg-empire-elevated border border-empire-border rounded px-3 py-2 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/40"
            />
            <input
              placeholder="Client name"
              value={form.client}
              onChange={e => setForm({ ...form, client: e.target.value })}
              className="bg-empire-elevated border border-empire-border rounded px-3 py-2 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/40"
            />
            <AffixInput money
              placeholder="Deal value (€)"
              type="number"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              className="bg-empire-elevated border border-empire-border rounded px-3 py-2 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/40"
            />
            <input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="bg-empire-elevated border border-empire-border rounded px-3 py-2 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/40"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="empire-label flex items-center gap-2">
              Commission earner
              <select
                value={earner?.id ?? ''}
                onChange={e => setEarnerId(e.target.value)}
                className="bg-empire-elevated border border-empire-border rounded px-2 py-1.5 text-xs normal-case tracking-normal text-empire-text focus:outline-none focus:border-empire-gold/40 cursor-pointer"
              >
                {earners.length === 0 && <option value="">No commission profiles in roster</option>}
                {earners.map(e => <option key={e.id} value={e.id}>{e.name} · {e.commissionRate}%</option>)}
              </select>
            </label>
            <span className="text-xs text-empire-text-muted">
              {earner ? `${earner.name.split(' ')[0]} commission: ${earner.commissionRate}% auto-calculated from their profile` : 'Add a commission rate to a roster profile to auto-calculate'}
            </span>
          </div>
          <button onClick={submitDeal} disabled={submitting} className="px-4 py-2 bg-empire-gold text-empire-void text-xs uppercase tracking-widest rounded font-semibold hover:bg-empire-gold/80 transition-colors disabled:opacity-60 inline-flex items-center gap-2">
            {submitting && <span className="h-3 w-3 animate-spin rounded-full border border-empire-void/40 border-t-empire-void" aria-hidden />}
            {submitting ? 'Logging…' : 'Log Deal'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {deals.length === 0 && (
          <div className="text-center py-16 text-empire-text-muted text-sm">No deals logged yet. The empire awaits conquest.</div>
        )}
        {shown.map(deal => (
          <div key={deal.id} className="bg-empire-surface border border-empire-border rounded-lg p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="font-medium text-empire-text text-sm">{deal.title}</span>
                {deal.linkedUnitSlug ? (
                  <Link href={`/departments/${deal.linkedUnitSlug}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border border-empire-gold/30 text-empire-gold hover:bg-empire-gold/10 transition-colors">
                    <EmpireIcon name="link" size={10} /> {titleCase(deal.linkedUnitSlug)}
                  </Link>
                ) : (
                  <button onClick={() => setLinking(deal)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border border-empire-border text-empire-text-dim hover:text-empire-text hover:border-empire-gold/30 transition-colors">
                    <EmpireIcon name="link" size={10} /> Link Unit
                  </button>
                )}
              </div>
              <div className="text-empire-text-muted text-xs">{deal.client}</div>
            </div>
            <select
              value={deal.status}
              onChange={e => changeStatus(deal, e.target.value)}
              className={`text-xs rounded border px-2 py-1 focus:outline-none cursor-pointer ${statusColors[deal.status] || statusColors.prospect}`}
            >
              {DEAL_STATUSES.map(s => <option key={s} value={s} className="bg-empire-elevated text-empire-text">{titleCase(s)}</option>)}
            </select>
            <div className="text-right shrink-0">
              <div className="text-empire-gold text-sm font-medium">{formatCurrency(deal.amount)}</div>
              {deal.commissionAmount && (
                <div className="text-empire-text-muted text-xs">
                  Commission{(() => { const p = employees.find(e => e.id === deal.partnerId); return p ? ` (${p.name.split(' ')[0]})` : '' })()}: {formatCurrency(deal.commissionAmount)}
                </div>
              )}
            </div>
            <RowActions
              onView={() => setViewing(deal)}
              onEdit={() => setEditing(deal)}
              onDelete={() => removeDeal(deal)}
              deleteLabel={`the "${deal.title}" deal`}
            />
          </div>
        ))}
      </div>

      {deals.length > DEAL_PAGE_SIZE && (
        <Pagination page={page} pageCount={pageCount} total={deals.length} onPage={setPage} />
      )}

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.title} icon={<EmpireIcon name="handshake" size={18} />}>
          <div className="space-y-2.5">
            <DealField label="Client" value={viewing.client} />
            <DealField label="Value" value={formatCurrency(viewing.amount)} />
            <DealField label="Status" value={titleCase(viewing.status)} />
            <DealField label="Commission" value={viewing.commissionAmount ? `${formatCurrency(viewing.commissionAmount)}${viewing.commissionRate != null ? ` (${viewing.commissionRate}%)` : ''}` : '—'} />
            <DealField label="Commission earner" value={(() => { const p = employees.find(e => e.id === viewing.partnerId); return p ? `${p.name} · ${p.commissionRate ?? viewing.commissionRate ?? '—'}% from profile` : 'Not assigned' })()} />
            <DealField label="Linked Unit" value={viewing.linkedUnitSlug ? titleCase(viewing.linkedUnitSlug) : 'Not linked'} />
            {viewing.notes && <DealField label="Notes" value={viewing.notes} />}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setLinking(viewing); setViewing(null) }} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cross-link</button>
              <button onClick={() => { setEditing(viewing); setViewing(null) }} className="empire-btn-primary">Edit</button>
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <DealEditModal deal={editing} onClose={() => setEditing(null)}
          onSaved={(updated) => { setDeals(deals.map(d => d.id === updated.id ? updated : d)); setEditing(null) }} />
      )}

      <DealLinkModal
        open={!!linking}
        deal={linking as DealLink | null}
        label={linking?.title}
        onClose={() => setLinking(null)}
        onLinked={() => { setLinking(null); reload() }}
      />
    </div>
  )
}

function DealField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-empire-border/60 pb-2">
      <span className="text-[11px] uppercase tracking-widest text-empire-text-dim">{label}</span>
      <span className="text-sm text-empire-text text-right">{value}</span>
    </div>
  )
}

function DealEditModal({ deal, onClose, onSaved }: { deal: Deal; onClose: () => void; onSaved: (d: Deal) => void }) {
  const [form, setForm] = useState({
    title: deal.title, client: deal.client, amount: String(deal.amount),
    status: deal.status, notes: deal.notes || '',
  })
  const [busy, setBusy] = useState(false)
  const inputCls = 'w-full bg-empire-elevated border border-empire-border rounded px-3 py-2 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/40'

  async function save() {
    setBusy(true)
    try {
      const updated = await patch(`/api/deals/${deal.id}`, {
        title: form.title, client: form.client, amount: Number(form.amount),
        status: form.status, notes: form.notes,
      })
      onSaved(updated)
    } catch (e) { console.error(e); setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={`Edit — ${deal.title}`} icon={<EmpireIcon name="pen" size={18} />}>
      <div className="space-y-3">
        <label className="empire-label">Title<input className={inputCls + ' mt-1'} value={form.title} placeholder="Deal title" onChange={e => setForm({ ...form, title: e.target.value })} /></label>
        <label className="empire-label">Client<input className={inputCls + ' mt-1'} value={form.client} placeholder="Client name" onChange={e => setForm({ ...form, client: e.target.value })} /></label>
        <label className="empire-label">Value (€)<AffixInput money type="number" className={inputCls + ' mt-1'} value={form.amount} placeholder="0.00" onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
        <label className="empire-label">Status
          <select className={inputCls + ' mt-1'} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            {DEAL_STATUSES.map(s => <option key={s} value={s}>{titleCase(s)}</option>)}
          </select>
        </label>
        <label className="empire-label">Notes<input className={inputCls + ' mt-1'} value={form.notes} placeholder="Optional notes" onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded px-3 py-2 text-xs uppercase tracking-widest text-empire-text-muted hover:text-empire-text">Cancel</button>
          <button onClick={save} disabled={busy} className="empire-btn-primary disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  )
}

function ChronicleTab({ events }: { events: ActivityEvent[] }) {
  const typeIcon: Record<string, IconName> = {
    system: 'cog',
    deal_created: 'handshake',
    deal_closed: 'trophy',
    deal_updated: 'document',
    kpi_record: 'chart-bar',
    approval_request: 'scales',
    department_update: 'shield',
    employee_joined: 'people',
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <SectionHeader title="The Chronicle" subtitle="Everything that happens, logged from Day 1" />
      <div className="space-y-2">
        {events.length === 0 && (
          <div className="text-center py-16 text-empire-text-muted text-sm">The chronicle begins today.</div>
        )}
        {events.map((event, i) => (
          <div key={event.id} className="flex gap-4 group">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-lg bg-empire-surface border border-empire-border flex items-center justify-center text-empire-gold-muted flex-shrink-0 group-hover:border-empire-gold/30 transition-colors">
                <EmpireIcon name={typeIcon[event.eventType] || 'pin'} size={14} />
              </div>
              {i < events.length - 1 && <div className="w-px flex-1 bg-empire-border mt-1" />}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-empire-text text-sm font-medium">{event.title}</span>
                {event.department && (
                  <span className="text-empire-text-dim text-xs">{event.department.name}</span>
                )}
              </div>
              {event.description && (
                <p className="text-empire-text-muted text-xs leading-relaxed">{event.description}</p>
              )}
              <div className="text-empire-text-dim text-xs mt-1">
                {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ApprovalsTab({ approvals, setApprovals }: { approvals: ApprovalRequest[]; setApprovals: (a: ApprovalRequest[]) => void }) {
  async function decide(id: string, decision: 'approved' | 'rejected', note?: string) {
    const { patch } = await import('@/lib/api')
    await patch(`/api/approvals/${id}/decide`, { status: decision, joudDecision: note })
    setApprovals(approvals.map(a => a.id === id ? { ...a, status: decision } : a))
  }

  const pending = approvals.filter(a => a.status === 'pending')
  const decided = approvals.filter(a => a.status !== 'pending')

  const priorityColor: Record<string, string> = {
    low: 'text-empire-text-muted',
    normal: 'text-empire-text',
    high: 'text-empire-amber-bright',
    critical: 'text-empire-red-bright',
  }

  return (
    <div className="space-y-8 animate-slide-up">
      <SectionHeader title="The Throne" subtitle="Awaiting your royal decisions" />

      {pending.length === 0 && (
        <div className="bg-empire-green-bg border border-empire-green/30 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-2 text-empire-green-bright"><EmpireIcon name="check" size={28} /></div>
          <p className="text-empire-green-bright text-sm">All decisions made. The empire runs smooth.</p>
        </div>
      )}

      {pending.map(approval => (
        <ApprovalCard key={approval.id} approval={approval} onDecide={decide} priorityColor={priorityColor} />
      ))}

      {decided.length > 0 && (
        <div>
          <div className="text-empire-text-dim text-xs uppercase tracking-widest mb-3">Decided</div>
          <div className="space-y-2">
            {decided.map(a => (
              <div key={a.id} className="bg-empire-surface border border-empire-border rounded-lg p-4 flex items-center gap-3 opacity-50">
                <span className={a.status === 'approved' ? 'text-empire-green-bright' : 'text-empire-red-bright'}>
                  <EmpireIcon name={a.status === 'approved' ? 'check' : 'close'} size={16} />
                </span>
                <div>
                  <div className="text-empire-text-muted text-sm">{a.title}</div>
                  <div className="text-empire-text-dim text-xs">{a.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ApprovalCard({ approval, onDecide, priorityColor }: {
  approval: ApprovalRequest
  onDecide: (id: string, d: 'approved' | 'rejected', note?: string) => void
  priorityColor: Record<string, string>
}) {
  const [note, setNote] = useState('')
  return (
    <div className="bg-empire-surface border border-empire-amber/20 rounded-lg p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-empire-text text-sm">{approval.title}</h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-empire-text-muted text-xs">{approval.category}</span>
            <span className={`text-xs font-medium ${priorityColor[approval.priority] || ''}`}>
              {approval.priority.toUpperCase()}
            </span>
            <span className="text-empire-text-dim text-xs">by {approval.requestedBy}</span>
          </div>
        </div>
      </div>
      <input
        placeholder="Add decision note (optional)..."
        value={note}
        onChange={e => setNote(e.target.value)}
        className="w-full bg-empire-elevated border border-empire-border rounded px-3 py-2 text-sm text-empire-text placeholder:text-empire-text-dim focus:outline-none focus:border-empire-gold/40"
      />
      <div className="flex gap-3">
        <button
          onClick={() => onDecide(approval.id, 'approved', note)}
          className="px-4 py-2 bg-empire-green-bg border border-empire-green/40 text-empire-green-bright text-xs uppercase tracking-widest rounded hover:bg-empire-green/20 transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => onDecide(approval.id, 'rejected', note)}
          className="px-4 py-2 bg-empire-red-bg border border-empire-red/40 text-empire-red-bright text-xs uppercase tracking-widest rounded hover:bg-empire-red/20 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  )
}

function ThroneMetric({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: IconName }) {
  return (
    <div className="bg-empire-surface border border-empire-border rounded-lg p-5 hover:border-empire-gold/20 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <span className="text-empire-text-muted text-xs uppercase tracking-widest">{label}</span>
        <EmpireIcon name={icon} size={18} className="text-empire-gold-muted" />
      </div>
      <div className="font-empire text-empire-gold text-2xl font-bold tracking-wide">{value}</div>
      <div className="text-empire-text-dim text-xs mt-1">{sub}</div>
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="font-empire text-empire-gold text-base tracking-widest uppercase">{title}</h2>
      {subtitle && <p className="text-empire-text-muted text-xs mt-0.5">{subtitle}</p>}
    </div>
  )
}

function EmpireLoader() {
  return (
    <div className="min-h-screen bg-empire-void flex items-center justify-center">
      <phantom-ui
        loading
        animation="shimmer"
        shimmer-color="rgba(244,212,119,0.55)"
        background-color="rgba(201,162,51,0.16)"
        fallback-radius={8}
        duration={1.6}
        reveal={0.18}
        loading-label="Loading company intelligence"
      >
        <div className="text-center space-y-4">
          <div className="flex justify-center text-empire-gold animate-pulse"><EmpireIcon name="crown" size={40} /></div>
          <div className="text-empire-text-muted text-xs uppercase tracking-widest">Summoning the Empire...</div>
        </div>
      </phantom-ui>
    </div>
  )
}
