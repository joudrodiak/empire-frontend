# Empire OS — Design Guidelines

The single, specific rulebook for any UI in this app. If a screen "doesn't follow
the guidelines" (a recurring backlog note), it's measured against **this** file.
Goal: dense, precise, restrained, fast to scan — production-grade for Dutch/German
operators. No generic gradients, no decorative noise.

Tokens live in two places and you must use them — never hardcode a hex:
- CSS variables in `src/app/globals.css` (`--e-*`, theme-aware: dark + `html.light`).
- Tailwind names in `tailwind.config.ts` (`empire-*`, `rag-*`) — use these in JSX.

---

## 1. Colour

| Role | Token (JSX) | Dark value | Use for |
|------|-------------|-----------|---------|
| Page base | `bg-empire-void` | `#080810` | app background |
| Surface | `bg-empire-surface` | `#12121F` | cards, panels |
| Elevated | `bg-empire-elevated` | `#1A1A2E` | inputs, option rows, raised |
| Border | `border-empire-border` | `#2A2A44` | every hairline |
| Accent | `text/bg-empire-gold` | `#C9A233` | the ONE accent — actions, highlights, focus |
| Primary text | `text-empire-text` | `#F5F0E8` | headings, values |
| Muted text | `text-empire-text-muted` | `#7A7468` | labels, captions |
| Dim text | `text-empire-text-dim` | `#4A4540` | placeholders, disabled |
| Ivory | `text-empire-ivory` | `#F4EFE3` | contrast-on-gold, rare emphasis |

**Rules**
- **Gold is the only accent.** No blues/teals/purples for chrome. State is shown by
  *shape and weight*, not a rainbow.
- **RAG is monochrome-by-design** (`.rag-green/.amber/.red/.pending`): green = gold tint,
  amber = elevated, red = void+ivory, pending = surface+muted. Don't reintroduce literal
  red/green backgrounds for status pills — use the `.rag-*` classes.
- **Direction (up/down, loss/gain) uses arrows, not words or new colours**: green ▲ /
  red ▼ (`text-rag-green` / `text-rag-red`). See `KpiCard`'s delta.
- Always go through `empireColor()`/`empireTint()` (`src/lib/theme.ts`) when a colour
  comes from data — it clamps anything off-palette back to gold.

## 2. Charts

- **Pie/segment charts:** vary lightness/alpha of the **same gold-ivory family**, not
  different hues. Same vibe, distinguishable slices. (Backlog A3.)
- Sparklines/lines: `accent = #c9a233` by default; pass a palette tint, never a raw new hue.
- **Empty/zero-data charts still follow the system**: render an `EmptyState` (atom) inside
  the same glass panel — never a bare white/unstyled box (backlog A11, spend-mix).

## 3. Typography

- `font-empire` (serif, Georgia) → product/section titles only.
- `font-data` (tabular-nums) → all numbers/KPIs so columns align.
- Labels: `text-[11px] uppercase tracking-wider text-empire-text-muted` (see `.empire-label`).
- KPI value: `font-data text-2xl font-semibold tabular-nums text-empire-text`.
- **Alignment rule:** in a row of cards, the value must sit on the same baseline whether or
  not a card has subtext — reserve the sub line (`min-h-[14px]`) and anchor the value with
  `mt-auto`. (Backlog A5; `KpiCard` is the reference.)

## 4. Spacing, radius, elevation

- Radius: `rounded-lg` for cards/inputs/buttons, `rounded-md` for small chips, `rounded` for pills.
- Card padding `p-4` (`sm:p-5` for dialogs). Grid gaps `gap-2`–`gap-4`.
- Surfaces use `.glass` / `.glass-gold` (frosted, gold-edged) — not flat fills, not gradients.
- Shadows: `shadow-empire-card` (panels), `shadow-gold-glow` (hover accent). Nothing heavier.

## 5. Controls

- **Buttons:** primary = `.empire-btn-primary` (gold fill, ivory-shadowed, `-translate-y-0.5`
  on hover). Secondary = glass + `border-empire-border`. Destructive = same shape, never a new
  red fill — confirm in a Modal instead. **Deploy/incident buttons must use these classes**, not
  ad-hoc colours (backlog A9).
- **Inputs:** `.empire-input`. Focus = `border-empire-gold/60` + `ring-empire-gold/10`.
- **Selects/dropdowns:** use a native `<select>` — it's globally styled in `globals.css`
  (`select:not([size])`): gold chevron, dark menu, **`padding-right:2.1rem` so the arrow never
  overlaps text**, `min-height:2.25rem` so it's never cramped. Don't override its right padding.
  (Backlog A10/A12/A13.) Style the time-range dropdown the same way — no unstyled native selects.
- **Labels render as space-separated tags, never comma-joined** (backlog A6): one chip per label,
  `gap-1`, never `labels.join(', ')`.

## 6. Motion (every popup, globally — backlog A8, A14)

- Tailwind utilities: `animate-fade-in` (0.3s ease-out) and `animate-pop-in`
  (0.28s cubic-bezier overshoot) are defined — use them.
- **Every popup/overlay animates in AND out:** Modals (`Modal` molecule) keep mounted through a
  ~240ms exit (`translate-y`+`scale`+`opacity`). Tooltips/menus use `animate-fade-in`.
- Create actions (new deal, log, ticket) and button clicks get a subtle motion cue
  (`active:translate-y-0`, `hover:-translate-y-0.5`, or `animate-pop-in` on the new row).
- Hover transitions: `transition-all duration-200`. Keep it quick and restrained.

## 7. Overlays & positioning

- Anything that must escape a card's `overflow`/stacking context (tooltips, menus, modals)
  renders through a **portal to `<body>`** and is positioned from the trigger's bounding rect,
  viewport-clamped. `InfoTip` and `Modal` are the reference implementations. This is why metric
  bubbles no longer clip *inside* KPI boxes (backlog A5).

## 8. Cursor (backlog A4)

- Custom Empire cursor that switches between clickable / non-clickable affordances and fits the
  obsidian-gold style. Clickable elements (`button`, `a`, `[role=button]`, `select`,
  `cursor-pointer`) get the "active" cursor; everything else the default.

## 9. Accessibility (non-negotiable before any PROD push)

- Every form field has a label + `id`/`name`. Buttons are keyboard-safe.
- Text never overlaps on responsive widths — test the dense tables (e.g. `NL_VPB · 2026`).
- Icon-only controls carry `aria-label`; decorative arrows are `aria-hidden` with `sr-only` text.
- Network/tree surfaces support zoom in/out, drag/pan, and a center control.

## 10. Theme

- Two themes only: dark (default) + `html.light`. Both are driven by the same `--e-*` variables —
  if you add a colour, add it as a variable for **both** themes, never a single hardcoded hex.

---

*Reference components: `KpiCard`, `Modal`, `InfoTip`, `EmptyState`, `GlassPanel`, `.empire-*`
classes in `globals.css`. When in doubt, copy these — don't invent a new pattern.*
