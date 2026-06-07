# Empire OS — Web

Frontend for **Empire OS**, the command-intelligence layer for Cregen Inc. Next.js 14
(App Router) with a distinctive **liquid-glass / liquid-metal** aesthetic. Every Unit
renders through one DB-driven route; every entity is viewable → editable → deletable.

## Stack
- **Next.js 14** App Router (TypeScript), bind-mounted hot-reload in `empire_web`
- **Tailwind** with the `empire.*` design tokens (`tailwind.config.ts`)
- **Atomic Design**: `components/{atoms,molecules,organisms,templates}`

## Layout
```
src/
  app/                # App Router pages — Units render via app/departments/[id]
  components/
    atoms/            # EmpireIcon, GlassPanel, LiquidMetalButton, KpiCard, …
    molecules/        # RowActions, Modal, Pagination, FileDrop, PhotoDrop, …
    organisms/        # ContractsPanel, KanbanBoard, Roster, charts, DockNav, …
    templates/
  lib/                # api client (fetcher/post/patch/del), terms, profiles
```

## Run (Docker)
Served from the `empire_web` container on **port 3001** (bind-mounted, hot-reload).
```bash
docker compose up -d
open http://localhost:3001
docker exec -i empire_web npx tsc --noEmit     # type gate — must be EXIT 0
```
Never run `next build` on the host while the dev server is live.

## Design language (do not drift)
- Palette/fonts are fixed in `tailwind.config.ts` — gold `#C9A233`, Cinzel serif
  headers (`font-empire`), Inter body, mono `font-data` for metrics.
- Liquid-glass surfaces (`.glass`, `<GlassPanel>`), liquid-metal CTAs
  (`<LiquidMetalButton>`), 3D Unit medallions, edgeless bottom dock.
- **No emojis ever** in `web/src` — use `<EmpireIcon>` line glyphs.

## Conventions
- Vocabulary via `lib/terms.ts`: **Unit/Units** (not department), **Domain** (not
  microservice). Companies/profiles via `lib/profiles.ts`.
- Every list paginates; every row exposes view/edit/delete through `<RowActions>`.
- The active company is stored in `localStorage` (`empire-os-active-profile`) and
  sent to the API as `x-company-slug`.

## Architecture
Next.js 14 App Router, **Atomic Design** throughout: `atoms → molecules →
organisms → templates`. Pages are thin; data fetching lives in `lib/` (a typed
API client — `fetcher/post/patch/del`) and is composed into organisms. Every Unit
renders through the single DB-driven route `app/departments/[id]` — there are no
per-Unit static pages. Tenancy: the active company is held in `localStorage` and
sent to the API as the `x-company-slug` header; the session token (HS256) rides
as `Authorization: Bearer`. The design system (tokens, glass/metal primitives) is
fixed in `tailwind.config.ts` and the `atoms/` layer.

## Deployment
Hosted on **Vercel or Amplify Hosting** (edge), pointed at the API via build-time
env: `NEXT_PUBLIC_API_URL` (the `ApiUrl` stack output) plus the Cognito pool/
client IDs. Connect the `joudrodiak/empire-frontend` repo, set the env vars, deploy
`main`. Never run `next build` on the live dev host. Full steps in the **infra**
repo `DEPLOYMENT.md` §5.

## CI/CD
`.github/workflows/ci.yml` runs on push/PR: `npm ci` → `tsc --noEmit` gate →
emoji scan (zero emojis in `web/src`) → `next build`. On `main`, Vercel/Amplify
auto-deploys from the connected repo.

## Settings
`/settings` (reachable from the bottom `<DockNav>`) is the operator console for the
platform: **Integrations · Agent · Company · Environment** tabs. The Environment tab
reads `GET /api/settings/env` — a presence-only checklist (configured / missing) for
every integration key, so you can see what's wired without ever exposing a secret.
Login is at `/login`; the admin/IAM surface is `/admin`, the operator agent at
`/agent`.

## Environment
`.env` / `.env.local` are local-dev only and never committed. See `.env.example`.
