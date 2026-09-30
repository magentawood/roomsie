# ADR 0006 — Drizzle as the database layer

**Status:** Accepted · **Date:** 2026-09-10 · **Deciders:** Yash

## Context

`apps/api` must connect to Postgres. The candidates covered the full range of
database layers:

- Prisma, an ORM that starts from the schema.
- Drizzle, which starts from the code and has the shape of SQL.
- Kysely, which is only a typed query builder.
- Raw `pg` with SQL strings.

The constraints:

- ~60–80 backend hours.
- Four part-time developers change one schema.
- Our stated goal is to learn SQL, not an abstraction above SQL.
- A ranking query must run in Postgres.

## Decision

We use **Drizzle**, only in `apps/api`. The web app has no database dependency
at all (ADR 0002).

The Drizzle schema in TypeScript is the **single source of truth for the full
database**. It is not a client-side view or a subset. Drizzle generates the
migrations from the schema as plain `.sql` files, and we commit these files:

```
schema.ts → drizzle-kit generate → 0003_add_verified_flag.sql → applied to Postgres
```

## Rationale

**Portability.** The migrations are standard SQL that all Postgres databases
accept. If we leave Drizzle or Supabase, we keep the full schema history. This
is the same reason as in ADR 0001: keep the cost of the exit low.

**Drizzle teaches SQL. It does not replace SQL.** The query builder follows the
structure of SQL. It does not hide SQL behind object graphs.

**The hardest query stays typed.** The ranking score, the seen-exclusion and the
90-day suppression rule must run in Postgres (ADR 0004: do not block the event
loop). Drizzle supports raw SQL with a typed result. With Prisma, the same query
is an untyped `$queryRaw` escape hatch.

**Compile-time safety is disproportionately important here.** Four people change
one schema, two hours each day. If a person renames a column, the build fails
immediately and lists all the affected queries. Thus, the error does not occur
in production, in an endpoint that has no tests.

**The schema is machine-readable context.** The schema is TypeScript in the
repo. Thus, queries that an AI helps to write are materially more accurate. This
is relevant because of how this team builds.

## Adoption evidence (mid-2026)

| ORM | 30-day npm downloads | Weekly trend |
|---|---|---|
| Prisma | 55.3M | Q1'25 ~3.8M → Q1'26 ~4.3M |
| **Drizzle** | 48.1M | Q1'25 ~2.9M → **Q1'26 ~5.1M** |
| TypeORM | 19.3M | decreases |

In Q4 2025, Drizzle got more weekly downloads than Prisma. The difference
continues to increase. Users in production include Replit, Sentry, Databricks
and Figma. Astro DB uses Drizzle as its base, and Hono gives Drizzle as its
default recommendation. In March 2026, a company started to support Drizzle.
This removed the primary objection from before.

## Cost/benefit

| | Hours |
|---|---|
| Cost to learn | −2 to −3 |
| We do not write our own migration tools | +4 to +6, and continued savings |
| Row mapping, insert and update boilerplate in ~100 queries | +5 to +8 |
| The compiler finds schema drift | No price. This is the primary benefit. |
| **Net** | **~15–25 hours saved** |

## Consequences

- `apps/api` owns the schema. Other code must not import the schema.
- Each schema change ships as a committed `.sql` migration. CI applies the
  migration.
- We write complex analytical queries as raw SQL through Drizzle. We do not
  force them through the query builder.

## Alternatives rejected

- **Prisma**: It has a larger community and more AI training data. But it has
  its own schema language, it hides SQL, and its migration format is
  proprietary. Also, its raw queries have no types exactly where our hardest
  logic is.
- **Kysely**: It is purer and thinner. But it has no bundled migration tools,
  and we must maintain the schema types independently. It costs a few more setup
  hours for a small gain.
- **Raw `pg`**: It gives no compile-time safety in ~100 queries with four
  part-time developers. Also, we must write our own migration tools.

## Revisit when

Drizzle's raw-SQL escape hatch is no longer sufficient, or the project fully
outgrows Node.
