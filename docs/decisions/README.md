# Architecture Decision Records

One file for each decision. Each file records:

- what we chose, and why
- what we rejected
- when to examine the decision again

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
| [0016](0016-credentials-and-secrets.md) | Credentials and secrets: public vs critical, secrets only in apps/api | Accepted |

> **Note on requirements sources.** `PRD.md` is **deprecated** (2026-09-14). You must not cite it.
>
> - ADRs 0007 and 0009 used its requirements as arguments: analytics event volume, chat rate limits, auto-suspend on report threshold, listings as the SEO surface.
> - The *technical* reasoning is correct without the PRD.
> - We should examine those requirement claims again against the document that replaces the PRD.
> - femmeflats is **light-first**.

> [!note]- Why
> - If people argue a decision again in a meeting, the answer is in these files.
> - femmeflats is light-first, the same as Untitled UI.

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

- Clients hold a Firebase ID token.
- Clients never subscribe to a Postgres table.
- Clients never know the name of a column.

> [!note]- Why
> Clients send requests to `apps/api`. Clients never open a database connection.

## Where we are

- We agreed on sixteen architecture decisions.
- **Schema design is in progress.** We do it before all scaffolding.
- Schema decisions start at ADR 0015. The schema phases are in this section, below.
- ✅ **S1 — ID strategy** → ADR 0015. Settled: UUIDv7 keys that clients can mint. They are not enumerable, they are index-friendly, and offline writes are retry-safe.
- ⏳ **S2 — `users` table** ← next

The fourteen decisions settle what we build on. The schema settles what the data looks like. The schema goes into each table, each API response, each generated Kotlin data class, and in the future the local cache on 20,000 phones.

The design order is a dependency chain, not a preference. Each step needs a fixed step above it first:

1. Identity: `users`. All other tables have a foreign key to `users`.
2. Profile: profiles, attributes.
3. The queue: who has seen whom, and what they did.
4. Listings: flats and lister accounts.
5. Chat: threads, messages, requests, blocks, reports.
6. Events: analytics, with versions and a retention policy.

Schema items that are not complete (S2 is next, S3–S7 are pending):

| Item | Scope |
|---|---|
| `users` | Our own id as PK, `auth_provider_id` (Firebase UID) as a plain column, `tokens_valid_after` for instant revocation (ADR 0007), verification state, deletion |
| Profiles | Profiles and the rapid-fire attribute model: answers as columns, rows or JSONB |
| Queue state | For each (viewer, target): unseen → seen → accepted/rejected, reject counts, suppression windows |
| Listings | Lister accounts and user accounts are different accounts. |
| Chat | Threads, messages, message requests, blocks, reports |
| Analytics events | Versions, with `event_version`. The DPDP-compliant retention/deletion policy that ADR 0012 requires. |

**Then:** scaffold the monorepo. When we scaffold `apps/web` with Untitled UI, we can also start the token generator's naming transform (ADR 0011). This transform needs the real `theme.css` on disk.

**Open items carried forward** are in [Open items](#open-items), below.

> [!note]- Why
> Schema design comes first because the data model is the most expensive item to change.

## Open items

Items carried forward. We settled and recorded all architectural decisions.

- **Token generator naming transform:** blocked on `npx untitledui@latest tailwind`. Read the real `theme.css`. ([ADR 0011](0011-design-system-token-pipeline.md))
- **Rebrand:** the Brand ramp is still Untitled UI blue, and the fonts are Inter. The brand must stay different from `error`. ([ADR 0011](0011-design-system-token-pipeline.md))
- **Event retention and deletion policy (DPDP):** design it with the schema, not after. ([ADR 0012](0012-analytics-event-store.md))
- **Playwright E2E on critical paths:** after the UI is stable. ([ADR 0013](0013-ci-gate-and-testing.md))
- **Product requirements:** we deprecated `PRD.md`. Requirement claims in ADRs [0007](0007-web-rendering-and-auth-transport.md), [0009](0009-hosting-and-region.md) and [0012](0012-analytics-event-store.md) need validation again.

## Standing rules

1. Our own `users.id` is the primary key in all locations. The Firebase UID is a plain `auth_provider_id` column. (ADR 0005)
2. A Zod schema parses all bytes that come into the API from outside. It parses them before all other code touches them. (ADR 0004)
3. We generate and commit the OpenAPI document from day one. It is the contract that all clients generate from. (ADR 0004)
4. Image bytes never go through the API. Clients upload images directly to R2 with presigned URLs. (ADR 0005)
5. Verification selfies are in their own bucket, which is not public. (ADR 0005)
6. Realtime is `broadcast` only. (ADR 0005)
7. Next.js has no business logic. Route handlers are only for OAuth callbacks, image proxying and webhooks. (ADR 0003)
8. Never sort by the id. `created_at` (server clock) is the only chronology. (ADR 0015)
