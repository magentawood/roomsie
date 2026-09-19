# Architecture Decision Records

One file per decision. Each records what we chose, why, what we rejected, and
when to revisit. If a decision gets re-argued in a meeting, the answer is here.

**Format:** `NNNN-short-slug.md` · Status: Proposed / Accepted / Superseded

| # | Decision | Status |
|---|---|---|
| [0001](0001-rent-infrastructure.md) | Rent infrastructure, own the application layer | Accepted |
| [0002](0002-api-boundary.md) | Clients talk to our API, never to the database | Accepted |
| [0003](0003-api-as-separate-service.md) | The API is its own deployable, inside one monorepo | Accepted |
| [0004](0004-api-stack-typescript-fastify.md) | apps/api is TypeScript on Node, Fastify + Zod | Accepted |
| [0005](0005-managed-platform-split.md) | Supabase (Postgres + Realtime) + Firebase (auth) + Cloudflare R2 (storage) | Accepted |
| [0006](0006-drizzle.md) | Drizzle as the database layer | Accepted |
| [0007](0007-web-rendering-and-auth-transport.md) | Hybrid rendering, Bearer tokens, instant revocation | Accepted |
| [0008](0008-web-stack.md) | apps/web: Next 16 + Tailwind v4 + TanStack Query | Accepted |
| [0009](0009-hosting-and-region.md) | Fly.io Mumbai for the API, Vercel for web, Supabase Mumbai | Accepted |
| [0010](0010-monorepo-tooling.md) | pnpm workspaces + Turborepo | Accepted |
| [0011](0011-design-system-token-pipeline.md) | Design system: Untitled UI + generated theme.css from Figma | Accepted |
| [0012](0012-analytics-event-store.md) | Analytics events in our own Postgres, no vendor | Accepted |
| [0013](0013-ci-gate-and-testing.md) | CI gate: typecheck, lint, build, unit + API integration tests | Accepted |
| [0014](0014-error-tracking.md) | Sentry SDK, GlitchTip destination now, Crashlytics for mobile | Accepted |
| [0015](0015-primary-key-strategy.md) | UUIDv7 primary keys, no DB default, client mints for offline writes | Accepted |


> **Note on requirements sources.** `PRD.md` is **deprecated** (2026-09-14) and
> must not be cited. ADRs 0007 and 0009 were argued from requirements it stated
> (analytics event volume, chat rate limits, auto-suspend on report threshold,
> listings as the SEO surface). The *technical* reasoning stands on its own, but
> those requirement claims should be revalidated against whatever replaces the PRD.
> femmeflats is **light-first**, matching Untitled UI.

## The stack so far

```
                     ┌──────────────┐   ┌──────────────┐
                     │  apps/web    │   │  KMP clients │
                     │  Next.js     │   │  (later)     │
                     └──────┬───────┘   └──────┬───────┘
                            │  HTTPS / OpenAPI │
                            └────────┬─────────┘
                                     ▼
                            ┌─────────────────┐
                            │    apps/api     │
                            │ Node · Fastify  │
                            │ Zod validation  │
                            └────────┬────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
      ┌───────────────┐     ┌────────────────┐    ┌────────────────┐
      │   Supabase    │     │  Cloudflare R2 │    │    Firebase    │
      │ Postgres      │     │  storage + CDN │    │  verify JWTs   │
      │ Realtime      │     │                │    │                │
      │ (broadcast)   │     │                │    │                │
      └───────────────┘     └────────────────┘    └────────────────┘
```

Clients hold a Firebase ID token and hit `apps/api`. They never open a database
connection, never subscribe to a Postgres table, and never learn a column name.


## Where we are

Fourteen architecture decisions are settled. **Schema design is in progress** —
before any scaffolding, because the data model is the most expensive thing to
change. Schema decisions are ADR 0015 onward, and are mirrored on the Schema
page of `../tech-base.html`.

- ✅ **S1 — ID strategy** → ADR 0015
- ⏳ **S2 — `users` table** ← next

Scope still to cover:

- `users` — our own id as PK, `auth_provider_id` (Firebase UID) as a plain
  column, `tokens_valid_after` for instant revocation (ADR 0007), verification state
- profiles and the rapid-fire attribute model
- the queue state table — per (viewer, target): unseen → seen → accepted/rejected,
  reject counts and suppression windows
- listings, with lister accounts kept separate from user accounts
- chat: threads, messages, message requests, blocks, reports
- the analytics event schema — versioned, with `event_version`, plus the
  retention/deletion policy required by ADR 0012

**Then:** scaffold the monorepo. Scaffolding `apps/web` with Untitled UI also
unblocks the token generator's naming transform (ADR 0011), which needs the real
`theme.css` on disk.

**Open items carried forward** are listed at the end of `../tech-base.html`.

## Standing rules

1. Our own `users.id` is the primary key everywhere; the Firebase UID is a plain
   `auth_provider_id` column. (ADR 0005)
2. Every byte entering the API from outside is parsed by a Zod schema before any
   other code touches it. (ADR 0004)
3. The OpenAPI document is generated and committed from day one — it is the
   contract all clients generate from. (ADR 0004)
4. Image bytes never pass through the API; clients upload directly to R2 via
   presigned URLs. (ADR 0005)
5. Verification selfies live in a separate, non-public bucket. (ADR 0005)
6. Realtime is `broadcast` only — no client subscribes to a table. (ADR 0005)
7. No business logic in Next.js. Route handlers are for OAuth callbacks, image
   proxying and webhooks only. (ADR 0003)
8. Every primary key is a UUIDv7 with no database default. Never sort by the id —
   `created_at` (server clock) is the only chronology. (ADR 0015)