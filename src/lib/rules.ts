// THE EMPIRE RULE BOOK — single source of truth for every rule in the app.
// Anything that used to be copy-pasted ("How XP works") lives here ONCE.
// Mirrors the backend constants in api/src/lib/xp.ts. Keep them in sync.

export const XP_BY_PRIORITY = { low: 50, normal: 100, high: 200, critical: 350 } as const
export const CROSS_DEPT_MULTIPLIER = 2

// `icon` values are EmpireIcon glyph NAMES (no emoji), mirroring rank-icons.ts.
export const RANKS = [
  { name: 'Squire', icon: 'shield', levels: '1–2' },
  { name: 'Knight', icon: 'flag', levels: '3–4' },
  { name: 'Baron', icon: 'star', levels: '5–6' },
  { name: 'Duke', icon: 'trophy', levels: '7–8' },
  { name: 'Archduke', icon: 'crown', levels: '9+' },
] as const

export const FRAMEWORKS: { key: string; name: string; what: string }[] = [
  { key: 'DORA', name: 'Engineering · DORA', what: 'Deploy frequency, lead time, change-fail rate, MTTR.' },
  { key: 'AARRR', name: 'Marketing · AARRR', what: 'Acquisition, Activation, Retention, Referral, Revenue (pirate metrics).' },
  { key: 'BurnHealth', name: 'Finance / Operations · Burn Health', what: 'Runway, burn multiple, gross margin, budget adherence.' },
  { key: 'Creative', name: 'Creative · Throughput', what: 'On-time delivery, revision rounds, asset output, brand consistency.' },
  { key: 'Partnerships', name: 'Partnerships · Pipeline', what: 'Pipeline value, deal velocity, partner activation, commission.' },
  { key: 'ClientSuccess', name: 'Client Success · Health', what: 'NRR, churn, CSAT/NPS, time-to-value, active accounts.' },
  { key: 'Executive', name: 'Executive · Strategy', what: 'OKR attainment, decision throughput, north-star movement.' },
  { key: 'People', name: 'HR · People', what: 'Attrition, eNPS, time-to-hire, offer-accept, headcount.' },
  { key: 'Legal', name: 'Legal · Governance', what: 'Contract cycle time, risk exposure, compliance coverage.' },
]

export interface RuleSection {
  id: string
  title: string
  // EmpireIcon glyph name (no emoji) — rendered via <EmpireIcon name={icon} />.
  icon: import('@/components/atoms/EmpireIcon').IconName
  // `body` is rendered as paragraphs; `table` renders as a small key/value grid; `list` as bullets.
  body?: string[]
  table?: { label: string; value: string }[]
  list?: string[]
}

export const RULE_SECTIONS: RuleSection[] = [
  {
    id: 'xp',
    title: 'Earning XP',
    icon: 'sparkle',
    body: [
      'Every completed follow-up awards XP to the person assigned to it. There is no other way to earn XP — points always map to real work that got done.',
      'The amount depends on the task’s priority:',
    ],
    table: [
      { label: 'Low', value: `${XP_BY_PRIORITY.low} XP` },
      { label: 'Normal', value: `${XP_BY_PRIORITY.normal} XP` },
      { label: 'High', value: `${XP_BY_PRIORITY.high} XP` },
      { label: 'Critical', value: `${XP_BY_PRIORITY.critical} XP` },
    ],
  },
  {
    id: 'one-level',
    title: 'One Person, One Level',
    icon: 'user',
    body: [
      'Each person belongs to ONE home department and carries ONE level. There are no separate per-department sub-levels to juggle.',
      'All XP a person earns — wherever the work landed — rolls into that single level and rank. Your rank is the sum of everything you’ve done for the Empire.',
    ],
  },
  {
    id: 'cross-dept',
    title: 'Cross-Department Bonus (2×)',
    icon: 'partnerships',
    body: [
      'Work for your HOME department pays 1× XP. Work you do for ANY OTHER department pays 2× XP — the cross-department bonus.',
      'This rewards people who step outside their lane to help another team. The first time you do cross-dept work you unlock the Cross-Pollinator achievement.',
    ],
    table: [
      { label: 'Home-dept work', value: '1× XP' },
      { label: 'Cross-dept work', value: '2× XP' },
    ],
  },
  {
    id: 'ranks',
    title: 'Rank Ladder',
    icon: 'crown',
    body: ['Levels map to noble ranks. Climbing a tier unlocks a rank achievement (once per level).'],
    table: RANKS.map(r => ({ label: r.name, value: `Level ${r.levels}` })),
  },
  {
    id: 'levels',
    title: 'Level Thresholds',
    icon: 'chart-line',
    body: [
      'Each level is wider than the last. To reach level L you need a cumulative ((L−1)·L ÷ 2) × 1000 XP; the span of level L itself is L × 1000 XP.',
      'So level 2 starts at 1,000 XP, level 3 at 3,000, level 4 at 6,000, level 5 at 10,000 — the climb gets steeper, the way a real career does.',
    ],
  },
  {
    id: 'team-score',
    title: 'Collective Team Score',
    icon: 'people',
    body: [
      'Alongside each person’s independent XP, every department has a collective team score: the combined progression of all its members.',
      'A department’s XP is the running total of all XP earned on its turf (including cross-dept help it received), and its team level is derived from that total — so a department levels up as a unit, not just its individuals.',
      'Both scores coexist: you compete as an individual AND pull together as a team.',
    ],
  },
  {
    id: 'zscore',
    title: 'Z-Score & Health (RAG)',
    icon: 'chart-bar',
    body: [
      'Each department gets a composite health score from 0–100, weighting its KPIs against their targets, shown as a RAG light:',
      'The Z-score puts a department in context: it measures how many standard deviations a department’s composite sits above or below the Empire-wide average. +1 means clearly ahead of the pack; −1 means clearly behind. It answers “strong or weak relative to everyone else?”, not just “good or bad in absolute terms.”',
    ],
    table: [
      { label: 'Green', value: 'Score ≥ 70 — healthy' },
      { label: 'Amber', value: '40–69 — watch' },
      { label: 'Red', value: '< 40 — needs action' },
      { label: 'Z = 0', value: 'Exactly at Empire average' },
      { label: 'Z > 0', value: 'Above average (ahead)' },
      { label: 'Z < 0', value: 'Below average (behind)' },
    ],
  },
  {
    id: 'ai-managed',
    title: 'AI-Managed Departments',
    icon: 'cog',
    body: [
      'Some departments are run by an AI manager (Operations is managed by Lukas Beckers). These track interaction metrics — volume, response time, resolution rate, escalations to a human — on top of the normal KPIs.',
      'The same XP, ranks and team-score rules apply: the AI manager and its human collaborators earn and level exactly like everyone else.',
    ],
  },
  {
    id: 'frameworks',
    title: 'Department Frameworks',
    icon: 'compass',
    body: ['Each department measures success with the framework that fits its craft:'],
    table: FRAMEWORKS.map(f => ({ label: f.name, value: f.what })),
  },
]
