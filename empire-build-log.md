# empire-web — Build Log

Reverse-chronological log of meaningful changes. Each entry: date · what · verification.
Gate convention: `docker exec -i empire_web npx tsc --noEmit` EXIT 0 · emoji scan clean ·
key pages return 200.

---

## 2026-06-04 — Ticket dependencies in the board (TicketViewer)
- `components/organisms/TicketsPanel.tsx` — `TicketViewer` now loads full ticket
  detail (`GET /api/tickets/:id`) and renders a **Dependencies** section: existing
  links (blocks in red / is-blocked-by / relates) each with peer key·title·status
  and a remove (trash) action, plus an add row (link-type select + ticket picker
  scoped to the Unit + Link button). Wired to `POST /:id/links` and
  `DELETE /links/:linkId`; `departmentSlug` threaded through for candidate list.
- Verification: `tsc --noEmit` EXIT 0 · emoji scan clean · /departments/engineering 200.

## 2026-06-04 — Settings page + DockNav button
- `app/settings/page.tsx` — new `/settings` surface, 4 tabs via `TabBar`:
  **Integrations** (live Slack/Telegram status from `/api/agent/status`; Meta +
  Banking "Not set" cards listing required keys), **Agent** (Rodiak identity +
  channel live/off from `/api/agent/status`), **Company** (edit active company via
  `patch('/api/companies/:id')`, gated `company:manage`, reads active slug from
  localStorage), **Environment** (`GET /api/settings/env` grouped presence
  checklist, owner-gated with an "Owner only" `EmptyState` fallback).
- `components/templates/DockNav.tsx` — added Settings (`cog`) to the dock `MAIN`
  array alongside Overview + Operator.
- Verification: `docker exec -i empire_web npx tsc --noEmit` EXIT 0 · emoji scan
  clean · `/settings` returns 200.

## 2026-06-04 — Phase 8: Design polish (glass/metal · charts · 3D · create-tenant)
- `app/globals.css` — new `.metal-frame`: frosted-glass body wrapped in a thin
  molten-gold hairline. The gold gradient sits on a padded `::before` masked to a
  ring (`-webkit-mask-composite: xor` / `mask-composite: exclude`) and runs the
  same `lm-sheen` sweep as `.liquid-metal` (opacity 0.7→1 on hover); `html.light`
  variant added. Gives chrome a metal edge without a full metal fill.
- `components/molecules/ProfileSwitcher.tsx` — now DB-driven (`GET /api/companies`,
  client metadata merged by slug). Trigger uses `.metal-frame`; menu is
  `glass-gold`. Adds `CreateCompanyModal` (gated by `company:manage`) →
  `POST /api/companies` provisions a fresh tenant, then switches to it. Active
  slug persisted to localStorage (`empire-os-active-profile`) + cross-mount sync
  event; stays compatible with `lib/api.ts` `x-company-slug` (no edit there).
- `components/molecules/ThemeToggle.tsx` — fixed off-center/bulge by matching the
  dock pill height (`h-8 w-8 shrink-0 place-items-center leading-none`).
- `components/organisms/charts/*` redesigned (no library, public props unchanged
  or strictly additive): **BarChart** — dimensional gold bars (glossy top cap +
  inner shadow + cast glow) over faint gridlines with a staggered mount "rise";
  **AreaChart** — smoothed Catmull-Rom→bezier line, luminous Gaussian-blur glow,
  draw-in dash animation, layered gradient fill, hover crosshair + glass tip,
  optional `compare` series + legend; **DonutChart** — inner-shadow track,
  per-segment gradient + rounded caps, timed sweep-in, hover lift/dim, center
  total readout (optional `thickness`/`centerLabel`/`valueFormat`/`gap`).
- Verification: `docker exec -i empire_web npx tsc --noEmit` EXIT 0 · emoji scan
  clean · `/` `/agent` `/departments/finance` `/departments/engineering` all 200.

## 2026-06-04 — Phase 7: Operator Console (frontend)
- `app/agent/page.tsx` — `/agent` console for the AI operator (Lukas Beckers /
  "Rodiak"). Header shows live Slack/Telegram channel badges (`GET /api/agent/status`).
  Three tabs (TabBar): **Console** — broadcast form (channel multi-select +
  priority → `POST /api/agent/message`) + Raise-approval modal
  (`POST /api/agent/request-approval`), gated by `agent:act` with a `Locked`
  panel fallback; **Approvals** — live queue from `/api/approvals`, pending
  cards approve/reject gated by `approvals:decide`, recently-decided strip;
  **Message log** — paginated agent log (`GET /api/agent/messages`).
- Reuses GlassPanel, LiquidMetalButton, Modal, Pagination, TabBar, EmpireIcon —
  no new primitives. "No channels connected" hint when env unset.
- `components/templates/DockNav.tsx` — added "Operator" dock link → `/agent`.
- Add-only: existing Overview `ApprovalsTab` in `app/page.tsx` left untouched.
- Verified: `tsc --noEmit` EXIT 0 · emoji scan clean · `/agent` + `/admin` 200.

## 2026-06-04 — Phase 6: Auth portal + IAM admin (frontend)
- `lib/auth.tsx` — `AuthProvider` / `useAuth()` context: token storage
  (`empire-os-token`), `login()` (POST /api/auth/login), `logout()`, `/me` bootstrap,
  `userCan()` / `isAdmin()` helpers; listens for `empire-auth-expired`.
- `lib/api.ts` — `companyHeaders()` now forwards `Authorization: Bearer <token>`;
  `ensureOk()` clears the token and dispatches `empire-auth-expired` on 401.
- `components/templates/AuthGate.tsx` — wraps the app: empire splash while the
  session resolves, redirect to `/login` when unauthenticated (public: `/login`).
- `app/login/page.tsx` — liquid-glass login portal on a gold vignette; LiquidMetal
  submit; redirects to `/` when already authed.
- `app/admin/page.tsx` — IAM console (Users / Roles / Ranks TabBar). Full CRUD via
  `<RowActions>` + `<Modal>`, paginated lists, role permission matrix (9-perm checkbox
  grid + full-access `*`), admin-only guard via `isAdmin()`. Converts the API's 1-based
  user pagination to the 0-based `<Pagination>` component.
- `components/templates/DockNav.tsx` — hides on `/login`; adds a user chip with
  role/rank badges, admin→`/admin` link (admin only), and sign-out.
- `app/layout.tsx` — body wrapped in `<AuthProvider>` + `<AuthGate>`.
- **Verified:** web tsc EXIT 0 · emoji clean · / 200 · /login 200 · /admin 200 ·
  /departments/finance 200 · E2E login→token→gated IAM (401 without Bearer, 200 with).

## 2026-06-04 — Phases 3–5 (frontend, committed alongside)
- `components/organisms/TicketsPanel.tsx` — Jira-style tickets/sprints panel (board /
  list / dashboard views) on every Unit (Phase 3).
- `components/organisms/MarketingPanel.tsx` — Social Accounts tab: account dropdowns,
  snapshot series + prescriptive growth fixes (Phase 4).
- `components/organisms/FinancePanel.tsx` — bank-connect, ledger, manual spend + PDF,
  tax engine surface (Phase 5).
