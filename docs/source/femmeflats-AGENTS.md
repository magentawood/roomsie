# femmeflats — agent rules

Applies to every coding agent in this repo. Claude Code reads it through `CLAUDE.md`; Kombai reads it directly.

## Project

- Monorepo (pnpm workspaces + Turborepo): `apps/web` (Next 16 App Router · React 19 · Tailwind v4), `apps/api` (Fastify · Zod · Drizzle), `packages/contract` (OpenAPI + generated types), `packages/config`.
- Architecture decisions live in `docs/decisions/`. Don't re-argue them; flag a conflict instead.
- Earlier prototypes (the `femmeflats-design` repo, anything in `docs/`) are **not** a reference for UI code.

## Frontend work

For any UI work in `apps/web` — components, pages, styles, implementing a Figma design — follow
`tooling/frontend-kit/skills/femmeflats-frontend/SKILL.md`. The short version:

1. Figma is the source of truth. The design system is a customised Untitled UI.
2. Colours, spacing, radius, typography, shadows and blurs come only from design tokens. No hex/rgb literals, no Tailwind arbitrary values, no inline `style` for visual styling.
3. Reuse the components listed in `design/component-map.json` before creating new ones. Never install a stock Untitled UI component over a customised one.
4. If the design needs a token or component that doesn't exist, don't invent one: mark the line `// DS-GAP: <what>` and list it in your summary.
5. Before finishing, run `node tooling/frontend-kit/skills/femmeflats-frontend/scripts/check-tokens.mjs apps/web` and fix every error.

## Boundaries (from the ADRs)

- No business logic in Next.js. Route handlers are only for OAuth callbacks, image proxying and webhooks.
- `apps/web` never talks to the database; all data goes through `apps/api` with a Bearer token.
- Anything named `NEXT_PUBLIC_*` is public. Secrets never enter `apps/web`.
