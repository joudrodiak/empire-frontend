'use client'
import React from 'react'
import { profileFor } from '@/lib/people'
import { gameFor, rankFor } from '@/lib/game-logic'
import { cn } from '@/components/atoms/cn'
import { SectionTitle } from '@/components/atoms/SectionTitle'
import { LevelBadge } from '@/components/atoms/LevelBadge'
import { AchievementChip } from '@/components/atoms/AchievementChip'
import { XpBar } from '@/components/molecules/XpBar'
import { Fact } from '@/components/molecules/Fact'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'
import { rankIcon } from '@/lib/rank-icons'
import { empireColor } from '@/lib/theme'

export interface PersonLite {
  id: string
  name: string
  role: string
  contractType: string
  salaryAmount: number | null
  commissionRate: number | null
  department: { name: string; slug: string; color: string; icon: string }
  joinedAt?: string
  notes?: string | null
  // Real progression from the API (unified pointing system). When present these
  // override the synthetic showcase values so the modal shows actual earned XP.
  xp?: number | null
  level?: number | null
  achievements?: { key: string; label: string; icon: string }[]
}

function compLine(p: PersonLite): { text: string; tone: string } {
  if (p.contractType === 'commission') return { text: `${p.commissionRate}% commission`, tone: 'text-empire-amber-bright' }
  if (p.contractType === 'ai_agent') return { text: 'AI Agent · always-on', tone: 'text-empire-gold' }
  if (p.contractType === 'advisory') return { text: 'Advisory board', tone: 'text-empire-text-muted' }
  if (p.salaryAmount) return { text: `€${p.salaryAmount.toLocaleString()} / mo`, tone: 'text-empire-gold' }
  return { text: '—', tone: 'text-empire-text-muted' }
}

export function PersonModal({ person, onClose }: { person: PersonLite | null; onClose: () => void }) {
  React.useEffect(() => {
    if (!person) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [person, onClose])

  if (!person) return null
  const accent = empireColor(person.department.color)
  const profile = profileFor(person.name, person.role)
  // Prefer real progression from the API; fall back to synthetic showcase data.
  const hasReal = person.xp != null && person.level != null
  const synthetic = gameFor(person.name)
  const game = hasReal
    ? { xp: person.xp as number, level: person.level as number }
    : { xp: synthetic.xp, level: synthetic.level }
  const rank = rankFor(game.level)
  const comp = compLine(person)
  const initials = person.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const unlocked = hasReal
    ? (person.achievements ?? []).map((a) => ({ label: a.label, icon: a.icon, locked: false }))
    : synthetic.achievements.filter((a) => !a.locked)
  const joined = person.joinedAt ? new Date(person.joinedAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-empire-void/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-empire-border bg-empire-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: `0 0 0 1px ${accent}22, 0 24px 80px -20px ${accent}44` }}>
        <div className="relative px-6 pt-6 pb-5 border-b border-empire-border/70"
          style={{ background: `linear-gradient(160deg, ${accent}1f, transparent 70%)` }}>
          <button onClick={onClose} aria-label="Close"
            className="absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-lg border border-empire-border text-empire-text-muted hover:text-empire-text hover:border-empire-gold/40 transition-colors"><EmpireIcon name="close" size={15} /></button>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl grid place-items-center text-xl font-empire font-bold shrink-0 border"
              style={{ background: `${accent}26`, color: accent, borderColor: `${accent}55` }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-empire-text truncate">{person.name}</h2>
                <span className="inline-flex items-center gap-1 text-[11px] text-empire-text-muted" title={profile.country}>
                  <EmpireIcon name="pin" size={12} />{profile.country}
                </span>
              </div>
              <p className="text-sm text-empire-text-muted mt-0.5">{person.role}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border"
                  style={{ color: accent, borderColor: `${accent}55`, background: `${accent}12` }}>
                  <EmpireIcon name={deptIcon(person.department.slug)} size={12} />{person.department.name}
                </span>
                <span className={cn('text-[11px] font-medium', comp.tone)}>{comp.text}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-empire-text leading-relaxed">{profile.bio}</p>

          <div className="grid grid-cols-2 gap-3">
            <Fact label="From" value={`${profile.city}, ${profile.country}`} />
            <Fact label="Timezone" value={profile.timezone} />
            <Fact label="Languages" value={profile.languages.join(' · ')} />
            <Fact label="Joined" value={joined || '—'} />
          </div>

          <div>
            <SectionTitle>Skills</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-empire-border bg-empire-elevated text-empire-text-muted">{s}</span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-empire-border bg-empire-elevated/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle className="mb-0">Progression</SectionTitle>
              <span className="inline-flex items-center gap-1 text-[11px] text-empire-text-muted"><EmpireIcon name={rankIcon(rank.name)} size={11} /> {rank.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <LevelBadge level={game.level} accent={accent} />
              <div className="flex-1"><XpBar xp={game.xp} level={game.level} accent={accent} /></div>
            </div>
            {unlocked.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {unlocked.map((a, i) => <AchievementChip key={i} {...a} />)}
              </div>
            )}
            <p className="text-[10px] text-empire-text-dim leading-snug pt-1 border-t border-empire-border/40">
              Tasks for <span className="text-empire-text-muted">{person.department.name}</span> earn 1× XP ·
              tasks for any other department earn <span className="text-empire-amber-bright">2× XP</span> (cross-department bonus).
            </p>
          </div>

          <div className="flex items-start gap-2.5 text-sm">
            <EmpireIcon name="sparkle" size={15} className="text-empire-gold mt-0.5 shrink-0" />
            <p className="text-empire-text-muted italic">{profile.funFact}</p>
          </div>

          {person.notes && (
            <div className="text-xs text-empire-text-dim border-t border-empire-border/60 pt-3">{person.notes}</div>
          )}
        </div>
      </div>
    </div>
  )
}
