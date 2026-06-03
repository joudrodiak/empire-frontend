# Empire Frontend — Vision & Per-Dept Executor Spec

## Mandate
Kill every emoji. Elevate the whole UI. KEEP the empire vibe. Do NOT ship a generic SaaS dashboard.

## Design language (the empire vibe — never change the palette/fonts)
- Palette: void `#080810` / deep `#0D0D1A` / surface `#12121F` / elevated `#1A1A2E` / border `#2A2A44`; gold `#C9A233` (primary), gold-muted `#8A6F1E`; text `#F5F0E8`, text-muted `#7A7468`, text-dim `#4A4540`; RAG green/amber/red `*-bright`+`*-bg`.
- Type: `font-empire` (Cinzel/Georgia serif) for headings & big numbers; Inter body; `font-data` mono for metrics/IDs.
- Motifs: gold hairline dividers (`.gold-line`), `shadow-gold-glow`, uppercase `tracking-widest` micro-labels, RAG badges, thin 1px borders.

## "Claude design" direction (non-generic — apply these principles)
The user explicitly does NOT want a generic template look. Borrow Anthropic/Claude craft principles, expressed in the empire palette:
1. **Editorial typography** — confident serif display headers, strong size contrast between the big serif metric and its tiny uppercase label. Let numbers breathe.
2. **Calm, intentional spacing** — generous padding, clear vertical rhythm, fewer boxes-within-boxes. Group with whitespace and a single hairline, not nested cards.
3. **Restraint & warmth** — one accent (gold) used sparingly for emphasis; avoid rainbow chips. Muted text for secondary info. Soft, not flashy.
4. **Craft details** — hairline gold underlines on active tabs/section titles, subtle hover lift (`hover:border-empire-gold/40 hover:shadow-gold-glow`), `animate-slide-up` on section mount, aligned baselines, tabular numbers.
5. **Distinctive, not decorative** — the heraldic EmpireIcon line glyphs are the personality. Use them purposefully (section/tab/kpi leading icon), never as filler.

## The icon system (THE replacement for all emojis)
```tsx
import { EmpireIcon, type IconName } from '@/components/atoms/EmpireIcon'
import { deptIcon } from '@/lib/dept-icons'     // slug -> IconName (IGNORE DB department.icon emoji)
import { rankIcon } from '@/lib/rank-icons'      // rank name -> IconName
```
- Render: `<EmpireIcon name="chart-line" size={16} className="text-empire-gold-muted" />` (stroke uses `currentColor`, so color via text-* class).
- Dept glyph: `<EmpireIcon name={deptIcon(dept.slug)} />`. NEVER render `dept.icon` / `department.icon` from the DB (it's an emoji).
- Available names (50+): all 11 dept slugs + `overview, plus, search, close, check, alert, chevron-down, chevron-right, external, document, calendar, chart-bar, chart-line, trophy, star, shield, flag, clock, arrow-up, arrow-down, sparkle, crown, scales, gavel, people, user, lock, book, gauge, rocket, megaphone, handshake, lifebuoy, pen-nib, compass, coins, cog, medal, flame, briefcase, pin, card, circle`. Use `asIconName(str, fallback)` to coerce an unknown string safely.

## Upgraded shared primitives (use these; APIs are backward-compatible)
- `KpiCard` (molecules) — refined; pass an optional leading `icon?: IconName`. Value renders in serif/mono. Use for all metric tiles.
- `Panel` (molecules) — header has a gold hairline; pass `title` + optional `actions`.
- `TabBar` (templates) — `flex-wrap` (no scrollbar), active = gold underline. Keep using it.
- `Badge`, `SectionTitle`, `EmptyState` (atoms) — `EmptyState` takes `icon?: IconName`. `Pagination` (molecules) unchanged.

## PER-DEPT EXECUTOR CHECKLIST (apply to your assigned Panel file ONLY)
For each `<Dept>Panel.tsx`:
1. **Zero emojis.** Find them: `grep -nP '[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}]' <file>`. Replace EVERY one with an `EmpireIcon` (pick the closest semantic glyph) or remove if pure decoration.
2. **Lead section/tab headers and KPI tiles with a relevant EmpireIcon** where it adds clarity (e.g. the dept's own glyph on the panel title; `chart-line` for trends; `alert` for risk; `trophy` for wins). Purposeful, not decorative.
3. **Apply the Claude-design polish**: bigger serif metric numbers with tiny uppercase labels, calmer spacing, one-accent restraint, hairline groupings, `animate-slide-up` on the root, subtle hover on cards. Refine — don't just swap glyphs.
4. **ADD/improve only** — keep EVERY tab, sub-component, table, form, pagination, `useStickyTab`, and feature. No removals. No API/route changes. No new business data.
5. **tsc-safe** — your file must compile.

## Verify (run after edits)
```
docker exec -i empire_web npx tsc --noEmit   # must be EXIT 0
grep -rlP '[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}]' <your files>   # must be empty
```
Pages must return 200: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/departments/<slug>`.
