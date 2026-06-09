# Empire Web Operating Rules

Before substantial work in this repo, read and apply:

1. `/Users/joudal-imam/.claude/CLAUDE.md`
2. `/Users/joudal-imam/.claude/skills/DESIGN_INDEX.md`
3. `/Users/joudal-imam/.claude/skills/design-hub/SKILL.md`
4. Relevant routed skills, especially `frontend-design`, `atomic-frontend-designer`, and `pro-architecture` for UI, component, and architecture work.

## Product Bar

- Build for low-friction Dutch/German operator use: dense, precise, restrained, fast to scan.
- Keep the visual system production-grade: Empire obsidian, gold, ivory, disciplined contrast, no generic gradients, no decorative noise.
- Preserve atomic structure: atoms stay primitive, molecules compose controls, organisms own complex sections, pages compose product flows.
- Every complex feature needs searchable education coverage in `/education` via `src/lib/education.ts`.
- Network and tree surfaces must support zoom in, zoom out, drag/pan, and center controls.

## Validation

- Run `npm test` for logic/component regression.
- Run `npm run build:static` before production deployment because the deploy workflow publishes `out/`.
- Do not push production-facing UI without checking accessibility basics: labels, `id`/`name` on form fields, keyboard-safe buttons, and non-overlapping responsive text.

## Deployment

- Push frontend changes to `main`.
- Production deploy is GitHub Actions workflow `Deploy Serverless Web` with `stage=PROD`.
