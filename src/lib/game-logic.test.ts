import { describe, it, expect } from 'vitest'
import { rankFor, xpForLevel, levelFromXp, progressFor, gameFor, unifiedProgress, CROSS_DEPT_MULTIPLIER } from './game-logic'

describe('rankFor — rank ladder', () => {
  it('maps levels to the correct rank tier', () => {
    expect(rankFor(1).name).toBe('Squire')
    expect(rankFor(2).name).toBe('Squire')
    expect(rankFor(3).name).toBe('Knight')
    expect(rankFor(4).name).toBe('Knight')
    expect(rankFor(5).name).toBe('Baron')
    expect(rankFor(6).name).toBe('Baron')
    expect(rankFor(7).name).toBe('Duke')
    expect(rankFor(8).name).toBe('Duke')
    expect(rankFor(9).name).toBe('Archduke')
    expect(rankFor(50).name).toBe('Archduke')
  })
  it('always returns an icon', () => {
    for (let l = 1; l <= 12; l++) expect(rankFor(l).icon).toBeTruthy()
  })
})

describe('xpForLevel — cumulative thresholds', () => {
  it('level 1 starts at 0 XP', () => {
    expect(xpForLevel(1)).toBe(0)
  })
  it('thresholds increase monotonically', () => {
    let prev = -1
    for (let l = 1; l <= 10; l++) {
      const x = xpForLevel(l)
      expect(x).toBeGreaterThan(prev)
      prev = x
    }
  })
  it('matches the triangular formula', () => {
    expect(xpForLevel(2)).toBe(1000)
    expect(xpForLevel(3)).toBe(3000)
    expect(xpForLevel(4)).toBe(6000)
  })
})

describe('progressFor — within-level progress', () => {
  it('is 0% exactly at a level threshold', () => {
    expect(progressFor(xpForLevel(4), 4).pct).toBe(0)
  })
  it('is ~50% halfway through a level span', () => {
    const half = xpForLevel(4) + (4 * 1000) / 2
    expect(progressFor(half, 4).pct).toBe(50)
  })
  it('clamps intoLevel within [0, span]', () => {
    const p = progressFor(xpForLevel(4) + 999999, 4)
    expect(p.intoLevel).toBeLessThanOrEqual(p.span)
    expect(p.intoLevel).toBeGreaterThanOrEqual(0)
  })
})

describe('gameFor — deterministic state', () => {
  it('is stable for the same seed', () => {
    expect(gameFor('finance-game')).toEqual(gameFor('finance-game'))
  })
  it('differs across seeds', () => {
    const a = gameFor('finance-game')
    const b = gameFor('legal-game')
    expect(a.xp === b.xp && a.level === b.level).toBe(false)
  })
  it('produces a valid level in range and matching XP band', () => {
    const g = gameFor('marketing-game')
    expect(g.level).toBeGreaterThanOrEqual(1)
    expect(g.level).toBeLessThanOrEqual(9)
    expect(g.xp).toBeGreaterThanOrEqual(xpForLevel(g.level))
    expect(g.xp).toBeLessThan(xpForLevel(g.level + 1))
  })
  it('returns 5 quests and at least one locked achievement', () => {
    const g = gameFor('hr-game')
    expect(g.quests).toHaveLength(5)
    expect(g.achievements.some((a) => a.locked)).toBe(true)
  })
})

describe('levelFromXp — inverse of xpForLevel', () => {
  it('round-trips with xpForLevel', () => {
    for (let l = 1; l <= 12; l++) expect(levelFromXp(xpForLevel(l))).toBe(l)
  })
  it('returns level 1 for zero or negative XP', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(-500)).toBe(1)
  })
  it('stays at a level until the next threshold', () => {
    expect(levelFromXp(xpForLevel(3) - 1)).toBe(2)
    expect(levelFromXp(xpForLevel(3))).toBe(3)
  })
})

describe('unifiedProgress — one level, 2x for cross-dept', () => {
  it('counts home-department work at 1x', () => {
    const p = unifiedProgress('creative', [{ deptSlug: 'creative', amount: 1000 }])
    expect(p.baseXp).toBe(1000)
    expect(p.xp).toBe(1000)
    expect(p.bonusXp).toBe(0)
    expect(p.level).toBe(2)
  })
  it('doubles XP for work outside the home department', () => {
    const p = unifiedProgress('creative', [{ deptSlug: 'engineering', amount: 1000 }])
    expect(p.baseXp).toBe(1000)
    expect(p.xp).toBe(2000)
    expect(p.bonusXp).toBe(1000)
    expect(CROSS_DEPT_MULTIPLIER).toBe(2)
  })
  it('mixes home and cross-dept into a single level', () => {
    const p = unifiedProgress('creative', [
      { deptSlug: 'creative', amount: 1000 },
      { deptSlug: 'engineering', amount: 1000 },
    ])
    expect(p.xp).toBe(3000) // 1000 + 2000
    expect(p.level).toBe(3)
  })
  it('is level 1 / 0 XP with no contributions (honest empty state)', () => {
    const p = unifiedProgress('legal', [])
    expect(p.xp).toBe(0)
    expect(p.level).toBe(1)
    expect(p.rank.name).toBe('Squire')
  })
})
