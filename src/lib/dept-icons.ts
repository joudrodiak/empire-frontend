// Department → EmpireIcon glyph map.
//
// The DB stores an emoji in `department.icon`. The frontend MUST IGNORE that
// field and resolve a hand-drawn EmpireIcon via this map instead — that's how
// we keep the app emoji-free while staying DB-driven for everything else.
//
//   import { deptIcon } from '@/lib/dept-icons'
//   <EmpireIcon name={deptIcon(dept.slug)} />

import type { IconName } from '@/components/atoms/EmpireIcon'

const DEPT_ICONS: Record<string, IconName> = {
  finance: 'finance',
  engineering: 'engineering',
  // engineering is sometimes slugged "tech" in the static microservice roster
  tech: 'engineering',
  legal: 'legal',
  marketing: 'marketing',
  'client-success': 'client-success',
  partnerships: 'partnerships',
  hr: 'hr',
  operations: 'operations',
  creative: 'creative',
  executive: 'executive',
  advisory: 'advisory',
}

/** Resolve a department slug to an EmpireIcon name. Safe fallback: 'shield'. */
export function deptIcon(slug: string): IconName {
  return DEPT_ICONS[(slug || '').toLowerCase()] ?? 'shield'
}
