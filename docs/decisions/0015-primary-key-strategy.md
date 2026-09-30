# 0015 — UUIDv7 primary keys, minted by the client where possible

**Status:** Accepted · 2026-09-15
**Depends on:** ADR 0005 (Supabase Postgres), ADR 0006 (Drizzle)

## Decision

Every table uses `id uuid primary key` holding a **UUIDv7**, with **no database
default**. The API mints it via Drizzle `$defaultFn`; for offline-capable writes
the client mints it instead and the API validates it.

```ts
id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
```

## Why not `bigint identity`

`bigint` is smaller (8 B vs 16 B) and has perfect index locality. Three things
outweigh that:

1. **Enumerability.** `/users/1024` implies `1023` and `1025` exist. On a
   women-only safety product that turns any id-taking endpoint into a walkable
   list of every user. Authorization should stop it and will — but defence in
   depth means not publishing the map.
2. **Insert locality is recoverable.** A random UUIDv4 lands on a different
   B-tree page per insert; once the index outgrows RAM that is a random read
   plus a dirty page each time. UUIDv7 puts a 48-bit millisecond timestamp in
   the high bits, so new ids sort to the end — v4's opacity, `bigint`'s locality.
3. **Client-minted ids.** With uuids the phone mints the real, permanent id
   before the server sees the row: instant render, and a retried POST is
   naturally idempotent via `ON CONFLICT (id) DO NOTHING`. With `bigint` the DB
   must assign it, so mobile needs temp-id reconciliation and a separate
   idempotency-key column. We ship KMP apps with offline chat in month 4.

## Why no database default

Supabase hosted runs **Postgres 17**; native `uuidv7()` arrived in **Postgres 18**.
But we would not use it as a column default even after the upgrade — a
`DEFAULT uuidv7()` means the id exists only *after* the INSERT commits, so the
client can never know it in advance. Generating in app code works identically on
17 and 18 and keeps the upgrade off the critical path.

Generation priority: **client if it can → API if it didn't → never the database.**

## Which tables the client may mint

Only rows the client creates as a self-contained action it could perform offline.

| Client-minted | API-minted |
|---|---|
| `messages`, `swipes`, `reports`, `blocks` | `users`, `profiles`, `listings` |

Same column definition everywhere. The only difference is whether the endpoint's
Zod request schema accepts an `id` field.

## Guards

| Trap | Guard |
|---|---|
| Spoofed timestamp (client sends a year-2099 v7) | Zod: embedded timestamp within ±5 min of server clock |
| Sorting by id | **Never sort by the uuid.** `created_at` (server clock) is the only chronology the application trusts. The timestamp inside a UUIDv7 is an optimisation for Postgres, not data. |
| Id squatting | Irrelevant — ids are random and unpredictable |

Collisions are not a practical concern: ≥62 bits of randomness per millisecond,
and a duplicate primary key makes the second `INSERT` fail loudly rather than
overwrite. Overwriting requires `UPDATE`, which never runs on a client-supplied
id without `WHERE user_id = <id from the verified JWT>`.

## Rejected

**`bigint` PK + separate opaque `public_id`.** Best storage profile and nothing
enumerable leaves the API, but it means two identifiers per row forever, every
join and response must pick the right one, and it still cannot mint ids offline.

**API always mints.** Same opacity, simpler contract — but offline chat then
needs temp-id reconciliation and an idempotency-key column in month 4.

## Cost

+8 bytes per row, per foreign key, per index entry. ~160 KB on `users` at 20k
users. ~1 GB of extra index on a 144M-row events table.

## Revisit when

A single table passes ~500M rows and its index size becomes the binding
constraint. That table — almost certainly `analytics_events` — can switch to
`bigint` in isolation, because nothing ever holds a foreign key to a log line.
