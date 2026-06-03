// Rank name → EmpireIcon glyph map.
//
// The API (api/src/lib/xp.ts rankFor) returns a decorative emoji per rank
// (Squire / Knight / Baron / Duke / Archduke). The frontend MUST IGNORE that
// emoji and render an EmpireIcon via this map instead.
//
//   import { rankIcon } from '@/lib/rank-icons'
//   <EmpireIcon name={rankIcon(rank.name)} />

import type { IconName } from '@/components/atoms/EmpireIcon'

const RANK_ICONS: Record<string, IconName> = {
  Squire: 'shield',
  Knight: 'flag',
  Baron: 'star',
  Duke: 'trophy',
  Archduke: 'crown',
}

/** Resolve a rank name to an EmpireIcon name. Safe fallback: 'shield'. */
export function rankIcon(rankName: string): IconName {
  return RANK_ICONS[(rankName || '').trim()] ?? 'shield'
}
