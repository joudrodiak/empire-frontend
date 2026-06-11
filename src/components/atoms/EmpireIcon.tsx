'use client'
import React from 'react'

/**
 * EmpireIcon — the Empire's hand-drawn inline SVG line-glyph set.
 *
 * NO icon library is installed (and none may be added). Every glyph here is a
 * stroke-based path on a 24×24 grid, drawn with `currentColor` so it inherits
 * text color, and a default 1.5 stroke for the thin, heraldic Empire feel.
 *
 * Usage:
 *   import { EmpireIcon } from '@/components/atoms/EmpireIcon'
 *   <EmpireIcon name="finance" size={18} className="text-empire-gold" />
 *
 * Sizing is via the `size` prop (default 16). Color comes from the surrounding
 * text color (or a `className` like `text-empire-gold`).
 */

export type IconName =
  // ---- department glyphs (one per slug) ----
  | 'finance'
  | 'engineering'
  | 'legal'
  | 'marketing'
  | 'client-success'
  | 'partnerships'
  | 'hr'
  | 'operations'
  | 'creative'
  | 'executive'
  | 'advisory'
  // ---- UI affordances ----
  | 'overview'
  | 'plus'
  | 'search'
  | 'close'
  | 'check'
  | 'alert'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'external'
  | 'document'
  | 'calendar'
  | 'chart-bar'
  | 'chart-line'
  | 'trophy'
  | 'star'
  | 'shield'
  | 'flag'
  | 'clock'
  | 'arrow-up'
  | 'arrow-down'
  | 'sparkle'
  // ---- extras used across the app (ranks, activity, people) ----
  | 'crown'
  | 'scales'
  | 'gavel'
  | 'people'
  | 'user'
  | 'lock'
  | 'book'
  | 'gauge'
  | 'rocket'
  | 'megaphone'
  | 'handshake'
  | 'lifebuoy'
  | 'pen-nib'
  | 'compass'
  | 'coins'
  | 'cog'
  | 'medal'
  | 'flame'
  | 'briefcase'
  | 'pin'
  | 'card'
  | 'eye'
  | 'pen'
  | 'trash'
  | 'dots'
  | 'link'
  | 'circle'
  | 'sun'
  | 'moon'
  | 'sitemap'

/**
 * Path data per glyph. Each entry is the inner markup of the <svg> (paths,
 * circles, lines) using stroke semantics. Kept geometric and simple but
 * recognizable. All coordinates live in a 0 0 24 24 viewBox.
 */
const PATHS: Record<IconName, React.ReactNode> = {
  // ----------------------- CRUD affordances -----------------------
  // view — eye
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  // edit — pen
  pen: (
    <>
      <path d="M14.5 5.5l4 4M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z" />
    </>
  ),
  // delete — trash
  trash: (
    <>
      <path d="M4 7h16M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
      <path d="M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 20l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  // overflow menu — three dots
  dots: (
    <>
      <circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" />
    </>
  ),
  // cross-link — chain
  link: (
    <>
      <path d="M9.5 14.5l5-5" />
      <path d="M8 12.5l-1.5 1.5a3 3 0 0 0 4.2 4.2l2.3-2.3" />
      <path d="M16 11.5l1.5-1.5a3 3 0 0 0-4.2-4.2L11 8.1" />
    </>
  ),
  // sun — light mode
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9L5.3 5.3" />
    </>
  ),
  // moon — dark mode (nudged down-left so the crescent reads centred in the box)
  moon: (
    <>
      <path transform="translate(-1.6 1.6)" d="M20 13.2A8 8 0 0 1 10.8 4a6.5 6.5 0 1 0 9.2 9.2z" />
    </>
  ),
  // sitemap — org / reporting structure (one top node feeding two below)
  sitemap: (
    <>
      <rect x="9.5" y="3" width="5" height="4" rx="0.6" />
      <rect x="3" y="17" width="5" height="4" rx="0.6" />
      <rect x="16" y="17" width="5" height="4" rx="0.6" />
      <path d="M12 7v4M5.5 17v-2.5h13V17M12 11v3.5" />
    </>
  ),
  // ----------------------- department glyphs -----------------------
  // finance — stacked coins / ledger
  finance: (
    <>
      <ellipse cx="12" cy="6" rx="6.5" ry="2.5" />
      <path d="M5.5 6v5c0 1.38 2.91 2.5 6.5 2.5s6.5-1.12 6.5-2.5V6" />
      <path d="M5.5 11v5c0 1.38 2.91 2.5 6.5 2.5s6.5-1.12 6.5-2.5v-5" />
    </>
  ),
  // engineering — cog inside angle brackets
  engineering: (
    <>
      <path d="M7 8l-3 4 3 4M17 8l3 4-3 4" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 8.6v-1.6M12 17v-1.6M15.4 12h1.6M7 12h1.6" />
    </>
  ),
  // legal — balance scales
  legal: (
    <>
      <path d="M12 4v15M7 19h10" />
      <path d="M4 8h16M8 5l-4 8M16 5l4 8" />
      <path d="M2.5 13a3 3 0 0 0 5 0M16.5 13a3 3 0 0 0 5 0" />
      <path d="M8 5h8" />
    </>
  ),
  // marketing — megaphone / funnel of reach
  marketing: (
    <>
      <path d="M4 10v4l9 4V6l-9 4Z" />
      <path d="M13 8l5-2v12l-5-2" />
      <path d="M7 14.5V18a1.5 1.5 0 0 0 3 0v-2" />
    </>
  ),
  // client-success — heart + handshake (care)
  'client-success': (
    <>
      <path d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.5 12 20 12 20Z" />
    </>
  ),
  // partnerships — two linked rings
  partnerships: (
    <>
      <circle cx="8.5" cy="12" r="4.5" />
      <circle cx="15.5" cy="12" r="4.5" />
    </>
  ),
  // hr — group of people
  hr: (
    <>
      <circle cx="9" cy="8" r="2.8" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a2.8 2.8 0 0 1 0 5.4M17 14.4a5.5 5.5 0 0 1 3.5 4.6" />
    </>
  ),
  // operations — gauge / dial
  operations: (
    <>
      <path d="M4 17a8 8 0 1 1 16 0" />
      <path d="M12 17l4-4" />
      <circle cx="12" cy="17" r="1.2" />
    </>
  ),
  // creative — pen nib with spark
  creative: (
    <>
      <path d="M5 19l3-9 8-3-3 8-8 4Z" />
      <path d="M8 10l5 5" />
      <circle cx="11" cy="13" r="1.2" />
    </>
  ),
  // executive — crown
  executive: (
    <>
      <path d="M4 18h16M4 18l-1-9 5 4 4-7 4 7 5-4-1 9" />
    </>
  ),
  // advisory — compass
  advisory: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2Z" />
    </>
  ),

  // ----------------------- UI affordances -----------------------
  overview: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  alert: (
    <>
      <path d="M12 4l9 16H3L12 4Z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'chevron-left': <path d="M15 6l-6 6 6 6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  external: (
    <>
      <path d="M14 5h5v5" />
      <path d="M19 5l-8 8" />
      <path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  document: (
    <>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 15.5h6M9 8.5h2" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="1.5" />
      <path d="M4 9h16M8 3v4M16 3v4" />
    </>
  ),
  'chart-bar': (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <rect x="7" y="12" width="3" height="6" />
      <rect x="12" y="8" width="3" height="10" />
      <rect x="17" y="14" width="3" height="4" />
    </>
  ),
  'chart-line': (
    <>
      <path d="M4 4v16h16" />
      <path d="M4 15l5-5 4 3 7-8" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
      <path d="M12 13v4M9 20h6M10 17h4" />
    </>
  ),
  star: <path d="M12 4l2.4 5 5.6.7-4 3.9 1 5.4-5-2.7-5 2.7 1-5.4-4-3.9 5.6-.7L12 4Z" />,
  shield: (
    <>
      <path d="M12 3l7 3v5c0 5-3.2 8.3-7 10-3.8-1.7-7-5-7-10V6l7-3Z" />
    </>
  ),
  flag: (
    <>
      <path d="M6 21V4" />
      <path d="M6 4h11l-2.5 3.5L17 11H6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  'arrow-up': <path d="M12 19V5M6 11l6-6 6 6" />,
  'arrow-down': <path d="M12 5v14M6 13l6 6 6-6" />,
  sparkle: (
    <>
      <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z" />
      <path d="M18 15l.7 1.8L20.5 17.5l-1.8.7L18 20l-.7-1.8L15.5 17.5l1.8-.7L18 15Z" />
    </>
  ),

  // ----------------------- extras -----------------------
  crown: <path d="M4 18h16M4 18l-1-9 5 4 4-7 4 7 5-4-1 9" />,
  scales: (
    <>
      <path d="M12 4v15M7 19h10" />
      <path d="M4 8h16M8 5l-4 8M16 5l4 8" />
      <path d="M2.5 13a3 3 0 0 0 5 0M16.5 13a3 3 0 0 0 5 0" />
    </>
  ),
  gavel: (
    <>
      <path d="M14 4l6 6M11 7l6 6" />
      <path d="M15.5 5.5l-7 7-3-3 7-7 3 3Z" />
      <path d="M9 14l-4 4M5 20h7" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="2.8" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a2.8 2.8 0 0 1 0 5.4M17 14.4a5.5 5.5 0 0 1 3.5 4.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="1.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v2.5" />
    </>
  ),
  book: (
    <>
      <path d="M5 4h9a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2V4Z" />
      <path d="M16 6h3v14h-3" />
      <path d="M5 20a2 2 0 0 1 2-2h9" />
    </>
  ),
  gauge: (
    <>
      <path d="M4 17a8 8 0 1 1 16 0" />
      <path d="M12 17l4-4" />
      <circle cx="12" cy="17" r="1.2" />
    </>
  ),
  rocket: (
    <>
      <path d="M12 3c3 1.5 5 5 5 9l-2.5 3h-5L7 12c0-4 2-7.5 5-9Z" />
      <circle cx="12" cy="10" r="1.6" />
      <path d="M9.5 15l-2 4 3-1.5M14.5 15l2 4-3-1.5" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10v4l9 4V6l-9 4Z" />
      <path d="M13 8l5-2v12l-5-2" />
      <path d="M7 14.5V18a1.5 1.5 0 0 0 3 0v-2" />
    </>
  ),
  handshake: (
    <>
      <path d="M3 8l4-1 5 4 5-4 4 1v6l-4 1-3-3M12 11l-2.5 2.5a1.5 1.5 0 0 1-2.1-2.1L9 9.5" />
      <path d="M3 8v6M21 8v6" />
    </>
  ),
  lifebuoy: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M5.5 5.5l4 4M14.5 14.5l4 4M18.5 5.5l-4 4M9.5 14.5l-4 4" />
    </>
  ),
  'pen-nib': (
    <>
      <path d="M5 19l3-9 8-3-3 8-8 4Z" />
      <path d="M8 10l5 5" />
      <circle cx="11" cy="13" r="1.2" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="12" cy="6" rx="6.5" ry="2.5" />
      <path d="M5.5 6v5c0 1.38 2.91 2.5 6.5 2.5s6.5-1.12 6.5-2.5V6" />
      <path d="M5.5 11v5c0 1.38 2.91 2.5 6.5 2.5s6.5-1.12 6.5-2.5v-5" />
    </>
  ),
  cog: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="14" r="5" />
      <path d="M9 9.5L7 3h4M15 9.5L17 3h-4" />
      <path d="M12 12.2l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2L9.1 14.3l2-.3.9-1.8Z" />
    </>
  ),
  flame: (
    <>
      <path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 0-1.5-.5-2.5C16 9 17 12 17 14a5 5 0 0 1-10 0c0-4 4-6 5-11Z" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="1.5" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12h18" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6-5.3 6-10a6 6 0 0 0-12 0c0 4.7 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M6.5 14.5h3" />
    </>
  ),
  circle: <circle cx="12" cy="12" r="7" />,
}

/**
 * Coerce an arbitrary icon string (which might be a valid IconName, or a legacy
 * emoji that slipped in from the DB) into a safe IconName. Unknown values fall
 * back to `fallback` so an emoji never renders.
 */
export function asIconName(value: string | null | undefined, fallback: IconName = 'circle'): IconName {
  return value != null && value in PATHS ? (value as IconName) : fallback
}

export function EmpireIcon({
  name,
  size = 16,
  className,
  strokeWidth = 1.5,
  style,
}: {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
  style?: React.CSSProperties
}) {
  const glyph = PATHS[name] ?? PATHS.circle
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  )
}

export default EmpireIcon
