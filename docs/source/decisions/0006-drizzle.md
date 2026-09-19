# ADR 0006 — Drizzle as the database layer

**Status:** Accepted · **Date:** 2026-09-10 · **Deciders:** Yash

## Context

`apps/api` needs to talk to Postgres. Candidates spanned the full spectrum:
Prisma (schema-first ORM), Drizzle (code-first, SQL-shaped), Kysely (pure typed
query builder), raw `pg` with SQL strings.

Constraints: ~60–80 backend hours, four part-time developers editing one schema,
a stated goal of learning SQL rather than an abstraction over it, and a ranking
query that must run inside Postgres.

## Decision

**Drizzle**, in `apps/api` only. The web app has no database dependency
whatsoever (ADR 0002).

The Drizzle schema in TypeScript is the **single source of truth for the entire
database** — not a client-side view or subset. Migrations are generated from it
as plain `.sql` files and committed:

```
schema.ts → drizzle-kit generate → 0003_add_verified_flag.sql → applied to Postgres
```

## Rationale

**Portability.** Migrations are standard SQL that any Postgres will accept.
If we leave Drizzle or leave Supabase, the schema history travels intact. This
is the same reasoning as ADR 0001 — keep the exit cheap.

**It teaches SQL rather than replacing it.** The query builder mirrors SQL
structure instead of hiding it behind object graphs.

**The hardest query stays typed.** The ranking score, seen-exclusion and
90-day suppression rule must run in Postgres (ADR 0004: don't block the event
loop). Drizzle supports raw SQL with a typed result. Under Prisma the same query
is an untyped `$queryRaw` escape hatch.

**Compile-time safety matters disproportionately here.** Four people editing one
schema at two hours a day. Renaming a column breaks the build immediately and
lists every affected query, rather than failing in production in an untested
endpoint.

**The schema is machine-readable context.** With the schema as TypeScript in the
repo, AI-assisted query writing is materially more accurate — relevant given how
this team is building.

## Adoption evidence (mid-2026)

| ORM | 30-day npm downloads | Weekly trend |
|---|---|---|
| Prisma | 55.3M | Q1'25 ~3.8M → Q1'26 ~4.3M |
| **Drizzle** | 48.1M | Q1'25 ~2.9M → **Q1'26 ~5.1M** |
| TypeORM | 19.3M | declining |

Drizzle overtook Prisma on weekly downloads in Q4 2025 and the gap is widening.
Production users include Replit, Sentry, Databricks and Figma; Astro DB is built
on it; Hono ships it as the default recommendation. It gained company backing in
March 2026, removing the main prior objection.

## Cost/benefit

| | Hours |
|---|---|
| Learning cost | −2 to −3 |
| Migration tooling not hand-rolled | +4 to +6, plus ongoing |
| Row mapping / insert / update boilerplate across ~100 queries | +5 to +8 |
| Schema drift caught at compile time | unpriced, the main benefit |
| **Net** | **~15–25 hours saved** |

## Consequences

- `apps/api` owns the schema; nothing else may import it.
- Every schema change ships as a committed `.sql` migration, applied in CI.
- Complex analytical queries are written as raw SQL through Drizzle, not forced
  through the query builder.

## Alternatives rejected

- **Prisma** — larger community and more AI training data, but a separate schema
  language, SQL hidden, proprietary migration format, and untyped raw queries
  exactly where our hardest logic lives.
- **Kysely** — purer and thinner, but no bundled migration tooling and schema
  types maintained separately. A few more setup hours for a marginal gain.
- **Raw `pg`** — no compile-time safety across ~100 queries with four part-time
  developers, plus hand-rolled migration tooling.

## Revisit when

Drizzle's raw-SQL escape hatch stops being sufficient, or the project outgrows
Node entirely.
