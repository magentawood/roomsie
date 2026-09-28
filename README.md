# roomsie

Find a flat or a flatmate in Mumbai. Start with `CONTEXT.md` for where the
project stands, and `docs/how-to-work.md` for how the team works.

## Layout

```
apps/web            Next 16, React 19, Tailwind v4        (ADR 0008)
apps/api            Fastify, Zod, Drizzle                 (ADR 0003, 0004, 0006)
packages/contract   Zod schemas and the generated openapi.json
packages/config     shared tsconfig and eslint
docs/               planning, decisions, the launch plan
```

pnpm workspaces and Turborepo, per ADR 0010.

## Run it

Needs Node 22 or later and pnpm.

```sh
pnpm install
pnpm dev          # web on :3000, API on :4000
```

Open http://localhost:3000. The page says whether it can reach the API.

Optional local settings: copy `apps/api/.env.example` to `apps/api/.env` and
`apps/web/.env.example` to `apps/web/.env.local`. The defaults work without them.

## Other commands

| Command | What it does |
|---|---|
| `pnpm build` | Build both apps |
| `pnpm typecheck` | Strict typecheck, every package |
| `pnpm lint` | Lint, every package |
| `pnpm --filter @roomsie/api openapi` | Regenerate `packages/contract/openapi.json`. Commit the result. |
| `pnpm --filter @roomsie/api db:generate` | Generate SQL migrations from `apps/api/src/db/schema.ts` |

## Where things go

- A new API route: `apps/api/src/routes/`, with its request and response
  schemas in `packages/contract`. Then regenerate `openapi.json`.
- The database schema: `apps/api/src/db/schema.ts`. Migrations go to
  `apps/api/drizzle/`.
- The web app never imports anything database-related (ADR 0002). It talks to
  the API over HTTP.
