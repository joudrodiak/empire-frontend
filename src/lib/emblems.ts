import type { IconName } from '@/components/atoms/EmpireIcon'

// Company emblems (final_backlog §1). The 25-glyph catalog shown in the
// onboarding wizard's emblem picker. Mirrors api/src/lib/emblems.ts so the
// deterministic fallback the backend stores matches what the UI previews.
export const EMBLEMS: IconName[] = [
  'crown', 'rocket', 'flame', 'compass', 'star',
  'trophy', 'medal', 'sparkle', 'coins', 'briefcase',
  'megaphone', 'handshake', 'shield', 'gavel', 'scales',
  'book', 'flag', 'lifebuoy', 'gauge', 'sitemap',
  'pin', 'moon', 'sun', 'eye', 'lock',
]

// Same FNV-1a deterministic mapping as the backend — used to preview the emblem
// a tenant would get if the creator leaves the picker untouched.
export function deterministicEmblem(seed: string): IconName {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return EMBLEMS[(h >>> 0) % EMBLEMS.length]
}
