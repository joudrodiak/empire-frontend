// Pure RPG logic + types for the Empire gamification layer. No React.
import { seedFrom, series } from '@/lib/empire-data'

// `icon` here is an EmpireIcon glyph NAME (e.g. 'crown', 'shield'), never an
// emoji. The frontend renders it via <EmpireIcon name={rankIcon(rank.name)} />
// (or AchievementChip for achievements). Kept as `string` so values coming from
// the API (which may still carry legacy data) stay assignable.
export interface Rank { name: string; icon: string }
export interface Achievement { label: string; icon: string; locked?: boolean }
export interface Quest { title: string; done: boolean; xp: number }

/** Rank ladder by level: 1-2 Squire, 3-4 Knight, 5-6 Baron, 7-8 Duke, 9+ Archduke. */
export function rankFor(level: number): Rank {
  if (level >= 9) return { name: 'Archduke', icon: 'crown' }
  if (level >= 7) return { name: 'Duke', icon: 'trophy' }
  if (level >= 5) return { name: 'Baron', icon: 'star' }
  if (level >= 3) return { name: 'Knight', icon: 'flag' }
  return { name: 'Squire', icon: 'shield' }
}

/** Cumulative XP threshold required to *reach* a given level. */
export function xpForLevel(level: number): number {
  const l = Math.max(1, level)
  return ((l - 1) * l / 2) * 1000
}

/** Inverse of xpForLevel: the level a given total XP currently sits at (min 1). */
export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1
  const l = Math.floor((1 + Math.sqrt(1 + (4 * xp) / 500)) / 2)
  return Math.max(1, l)
}

/**
 * Unified per-person progression.
 *
 * A person belongs to ONE department and has ONE level. They never carry a
 * separate level in unrelated departments. Contributions made OUTSIDE their
 * home department still roll into that single level — but count at 2× XP,
 * rewarding cross-department help. Home-department work counts at 1×.
 */
export interface XpContribution { deptSlug: string; amount: number; label?: string }

export interface UnifiedProgress {
  homeDeptSlug: string
  xp: number          // effective XP after the cross-dept multiplier
  baseXp: number      // raw XP before the multiplier
  bonusXp: number     // extra XP earned purely from cross-dept work
  level: number
  rank: Rank
}

export const CROSS_DEPT_MULTIPLIER = 2

export function unifiedProgress(homeDeptSlug: string, contributions: XpContribution[]): UnifiedProgress {
  let baseXp = 0
  let xp = 0
  for (const c of contributions) {
    const amt = Math.max(0, c.amount)
    baseXp += amt
    xp += c.deptSlug === homeDeptSlug ? amt : amt * CROSS_DEPT_MULTIPLIER
  }
  const level = levelFromXp(xp)
  return { homeDeptSlug, xp, baseXp, bonusXp: xp - baseXp, level, rank: rankFor(level) }
}

export interface LevelProgress {
  level: number
  rank: Rank
  intoLevel: number
  span: number
  nextThreshold: number
  pct: number
}

export function progressFor(xp: number, level: number): LevelProgress {
  const base = xpForLevel(level)
  const span = level * 1000
  const intoLevel = Math.max(0, Math.min(span, xp - base))
  return {
    level,
    rank: rankFor(level),
    intoLevel,
    span,
    nextThreshold: base + span,
    pct: span > 0 ? Math.round((intoLevel / span) * 100) : 0,
  }
}

export interface GameState {
  xp: number
  level: number
  streakDays: number
  quests: Quest[]
  achievements: Achievement[]
}

const QUEST_POOL = [
  'Hit the weekly target', 'Clear the backlog', 'Close out the quarter goal', 'Ship the milestone',
  'Sync with the team', 'Review the dashboards', 'Resolve open blockers', 'Beat last month',
]
const ACHIEVEMENT_POOL: Achievement[] = [
  { label: 'First Blood', icon: 'flame' }, { label: 'On a Roll', icon: 'sparkle' }, { label: 'Overachiever', icon: 'rocket' },
  { label: 'Untouchable', icon: 'shield' }, { label: 'Legend', icon: 'trophy' }, { label: 'Perfectionist', icon: 'star' },
]

/** Deterministic game state for a seed so pages render great pre-API. */
export function gameFor(seed: string): GameState {
  const s = series(seed, 4, 5, 0.1, 0.6)
  const r = seedFrom(seed)
  const level = 1 + (r % 9)
  const within = (Math.abs(s[0]) % 9 + 1) / 10
  const xp = Math.round(xpForLevel(level) + level * 1000 * within)
  const streakDays = 3 + (r % 28)
  const doneCount = 1 + (r % 4)
  const quests: Quest[] = QUEST_POOL.slice(0, 5).map((title, i) => ({
    title, done: i < doneCount, xp: 50 + ((seedFrom(seed + i) % 8) * 25),
  }))
  const lockedFrom = 2 + (r % 3)
  const achievements: Achievement[] = ACHIEVEMENT_POOL.map((a, i) => ({ ...a, locked: i >= lockedFrom }))
  return { xp, level, streakDays, quests, achievements }
}
