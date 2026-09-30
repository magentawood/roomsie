# Database standards

These rules apply to Drizzle, the schema, migrations, ids and stored data. The rules in [_index.md](_index.md) also apply.

## Schema and migrations

- The Drizzle schema in `apps/api` is the single source of truth for the full database. It holds all tables, columns, indexes and keys. Why: the compiler then finds schema drift in each query. ([ADR-0006](../decisions/0006-drizzle.md))
- Only `apps/api` imports the schema. `apps/web` has no database dependency. Why: clients never know table or column names. ([ADR-0006](../decisions/0006-drizzle.md), [ADR-0002](../decisions/0002-api-boundary.md))
- Make each migration with `drizzle-kit generate`, and commit the `.sql` file. Why: plain SQL keeps the full schema history if we leave Drizzle or Supabase. ([ADR-0006](../decisions/0006-drizzle.md))
- Each schema change ships as a committed migration that CI applies. Never change the live database outside a committed migration. Why: the migrations must agree with the database. ([ADR-0006](../decisions/0006-drizzle.md))
- Use plain Postgres SQL, with no proprietary extensions in the path that users need. Why: a move to a different Postgres host stays a dump and restore. ([ADR-0001](../decisions/0001-rent-infrastructure.md))
- Design the tables in the order of the schema phases, S1 to S7. Never design a table before the tables that it depends on. Why: each phase needs a fixed phase above it. ([S1–S7](../decisions/README.md#where-we-are))
- `users.tokens_valid_after timestamptz not null default now()` is in the first migration. Why: the auth check needs it from day one. ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md))
- Row Level Security stays on as defence in depth. It is not the primary authorisation. Why: the API holds the rules, and RLS is a second barrier. ([ADR-0002](../decisions/0002-api-boundary.md))

## Ids and time

- Each table has `id uuid primary key`: a UUIDv7 with no database default. The API mints it through Drizzle `$defaultFn`. Why: a UUIDv7 is not enumerable, and it keeps index locality. ([ADR-0015](../decisions/0015-primary-key-strategy.md))
- A client mints ids only for `messages`, `swipes`, `reports` and `blocks`. The API mints all other ids. Why: only these rows come from a self-contained action that can occur offline. ([ADR-0015](../decisions/0015-primary-key-strategy.md))
- For a client-minted id, Zod checks that the id is a UUIDv7. It also checks that the timestamp in it is in the range ±5 minutes of the server clock. Why: a spoofed timestamp destroys index locality. ([ADR-0015](../decisions/0015-primary-key-strategy.md))
- Insert a client-minted row with `ON CONFLICT (id) DO NOTHING`. Why: a retried request is then safe. ([ADR-0015](../decisions/0015-primary-key-strategy.md))
- Each table has `created_at timestamptz not null default now()`. Why: the server clock is the only chronology that the application trusts. ([ADR-0015](../decisions/0015-primary-key-strategy.md))
- Order rows by `created_at`, never by id. The application never reads, shows or orders by the timestamp in a UUIDv7. Why: a client with a skewed clock would change the order of a chat thread. ([ADR-0015](../decisions/0015-primary-key-strategy.md))

## Queries

- Run complex queries in Postgres, as raw SQL with a typed result through Drizzle. Examples are the rank score, the seen-exclusion and the 90-day suppression. Why: they must not block the event loop, and they stay typed. ([ADR-0006](../decisions/0006-drizzle.md), [ADR-0004](../decisions/0004-api-stack-typescript-fastify.md))

## Analytics database

- Analytics events go to an isolated, append-only Postgres instance, never to the primary database. Why: write bursts must not make the primary database slow. ([ADR-0012](../decisions/0012-analytics-event-store.md), [PD13](../decisions/pd-13-databases-and-backups.md))
- Partition the events table monthly, with a BRIN index on the timestamp. Why: the table grows by millions of rows each month. ([ADR-0012](../decisions/0012-analytics-event-store.md))
- A scheduled job makes the partition for the next month. Why: without it, inserts fail at a month boundary. ([ADR-0012](../decisions/0012-analytics-event-store.md))
- Dashboards query rollup tables that a background job builds. Why: dashboards then do not scan the raw events. ([ADR-0012](../decisions/0012-analytics-event-store.md))
- Design the retention window and the deletion policy for raw events with the events schema. Why: the DPDP Act applies, and we cannot attach the policy subsequently. ([ADR-0012](../decisions/0012-analytics-event-store.md))

## Stored data

- Store each typed message. Why: the observer learns from all messages, and a user keeps the chat after sign-up. ([PD7a](../decisions/pd-07a-agent-architecture.md), [PD6b](../decisions/pd-06b-login-gate-and-search.md))
- For verification, store only the result. The result is: verified or not, the method, the timestamp, the returned name, and at most the last 4 digits. Why: we store the result, never the document. ([PD8](../decisions/pd-08-verification.md))
- Never store the document image or the full Aadhaar number. Delete the document after the check. Why: the Aadhaar Act prohibits Aadhaar copies at an unlicensed private entity, and we do not accept the breach risk. ([PD8](../decisions/pd-08-verification.md))
