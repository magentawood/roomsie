# Architecture Decision Records

There is one file for each decision. Each file records what we chose, why we
chose it, what we rejected, and when to examine the decision again. If people argue
a decision again in a meeting, the answer is in these files.

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


> **Note on requirements sources.** `PRD.md` is **deprecated** (2026-09-14).
> You must not cite it. ADRs 0007 and 0009 used its requirements as arguments
> (analytics event volume, chat rate limits, auto-suspend on report threshold,
> listings as the SEO surface). The *technical* reasoning is correct without the
> PRD. But we should examine those requirement claims again against the document
> that replaces the PRD.
> femmeflats is **light-first**, the same as Untitled UI.

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

Clients hold a Firebase ID token and send requests to `apps/api`. Clients never
open a database connection. They never subscribe to a Postgres table. They never
know the name of a column.


## Where we are

We agreed on fourteen architecture decisions. **Schema design is in progress.** We
do it before all scaffolding, because the data model is the most expensive item
to change. Schema decisions start at ADR 0015. The Schema page of
`../tech-base.md` also shows them.

- ✅ **S1 — ID strategy** → ADR 0015
- ⏳ **S2 — `users` table** ← next

The schema work has these items, which are not complete:

- `users`: our own id as PK, `auth_provider_id` (Firebase UID) as a plain
  column, `tokens_valid_after` for instant revocation (ADR 0007), and the
  verification state
- profiles and the rapid-fire attribute model
- the queue state table, for each (viewer, target): unseen → seen →
  accepted/rejected, reject counts and suppression windows
- listings. Lister accounts and user accounts are different accounts.
- chat: threads, messages, message requests, blocks, reports
- the analytics event schema. It has versions, with `event_version`. It also
  has the retention/deletion policy that ADR 0012 requires.

**Then:** scaffold the monorepo. When we scaffold `apps/web` with Untitled UI,
we can also start the token generator's naming transform (ADR 0011). This
transform needs the real `theme.css` on disk.

**Open items carried forward** are at the end of `../tech-base.md`.

## Standing rules

1. Our own `users.id` is the primary key in all locations. The Firebase UID is a
   plain `auth_provider_id` column. (ADR 0005)
2. A Zod schema parses all bytes that come into the API from outside. It parses
   them before all other code touches them. (ADR 0004)
3. We generate and commit the OpenAPI document from day one. It is the contract
   that all clients generate from. (ADR 0004)
4. Image bytes never go through the API. Clients upload images directly to R2
   with presigned URLs. (ADR 0005)
5. Verification selfies are in their own bucket, which is not public. (ADR 0005)
6. Realtime is `broadcast` only. No client subscribes to a table. (ADR 0005)
7. Next.js has no business logic. Route handlers are only for OAuth callbacks,
   image proxying and webhooks. (ADR 0003)
8. Each primary key is a UUIDv7 with no database default. Never sort by the id.
   `created_at` (server clock) is the only chronology. (ADR 0015)