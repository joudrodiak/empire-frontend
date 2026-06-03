'use client'
// Barrel — public gamification API. Pure logic in lib/game-logic.ts;
// presentational widgets in the atomic-design tree.
export {
  rankFor, xpForLevel, progressFor, gameFor,
  type Rank, type Achievement, type Quest, type LevelProgress, type GameState,
} from '@/lib/game-logic'
export { XpBar } from '@/components/molecules/XpBar'
export { LevelBadge } from '@/components/atoms/LevelBadge'
export { StreakCounter } from '@/components/atoms/StreakCounter'
export { AchievementChip } from '@/components/atoms/AchievementChip'
export { QuestList } from '@/components/organisms/QuestList'
export { Leaderboard, type LeaderboardRow } from '@/components/organisms/Leaderboard'
export { GameStrip } from '@/components/organisms/GameStrip'
