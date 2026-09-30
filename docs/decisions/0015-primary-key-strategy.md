# 0015 — UUIDv7 primary keys, minted by the client where possible

**Status:** Accepted · 2026-09-15
**Depends on:** ADR 0005 (Supabase Postgres), ADR 0006 (Drizzle)

## Decision

Each table uses `id uuid primary key`. This column holds a **UUIDv7** and has
**no database default**. The API mints the id through Drizzle `$defaultFn`. For
writes that can occur offline, the client mints the id, not the API. Then the
API validates the id.

```ts
id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
```

## Why not `bigint identity`

`bigint` is smaller (8 B vs 16 B), and its index locality is perfect. But three
items are more important than these advantages:

1. **Enumerability.** From `/users/1024`, a person can know that `1023` and
   `1025` exist. On a women-only safety product, this changes each endpoint that
   takes an id into a list of all users that a person can walk through.
   Authorization should stop this, and it will. But defence in depth means that
   we do not publish the map.
2. **Insert locality is recoverable.** A random UUIDv4 goes to a different
   B-tree page for each insert. When the index becomes larger than RAM, each v4
   insert is a random read and a dirty page. UUIDv7 puts a 48-bit millisecond
   timestamp in the high bits. Thus, new ids sort to the end. This gives the
   opacity of v4 with the locality of `bigint`.
3. **Client-minted ids.** With uuids, the phone mints the real, permanent id
   before the server sees the row. This gives instant render. Also, a retried
   POST is naturally idempotent through `ON CONFLICT (id) DO NOTHING`. With
   `bigint`, the DB must assign the id. Thus, mobile needs temp-id
   reconciliation and an added idempotency-key column. We ship KMP apps with
   offline chat in month 4.

## Why no database default

Supabase hosted runs **Postgres 17**. Native `uuidv7()` arrived in **Postgres 18**.
But we would not use it as a column default, also after the upgrade.

With a `DEFAULT uuidv7()`, the id exists only *after* the INSERT commits. Thus, the
client can never know the id in advance. Id generation in app code works
identically on 17 and 18.
It also keeps the upgrade off the critical path.

Generation priority: **client if it can → API if it did not → never the database.**

## Which tables the client may mint

The client may mint ids only for rows that it creates as a self-contained action
that it could do offline.

| Client-minted | API-minted |
|---|---|
| `messages`, `swipes`, `reports`, `blocks` | `users`, `profiles`, `listings` |

All tables use the same column definition. The only difference is if the Zod
request schema of the endpoint accepts an `id` field.

## Guards

| Trap | Guard |
|---|---|
| Spoofed timestamp (client sends a year-2099 v7) | Zod: the embedded timestamp must be in the range ±5 min of the server clock |
| Sort by id | **Never sort by the uuid.** `created_at` (server clock) is the only chronology that the application trusts. The timestamp in a UUIDv7 is an optimisation for Postgres. It is not data. |
| Id squatting | This trap does not apply, because ids are random and unpredictable |

Collisions are not a practical concern. There are ≥62 bits of randomness for each
millisecond. Also, a duplicate primary key makes the second `INSERT` fail loudly.
It does not overwrite the row. To overwrite, you must use `UPDATE`. `UPDATE`
never runs on a client-supplied id without `WHERE user_id = <id from the verified JWT>`.

## Rejected

**`bigint` PK + separate opaque `public_id`.** This option has the best storage
profile, and nothing enumerable leaves the API. But each row has two identifiers
forever. Each join and each response must pick the correct identifier. Also, this
option cannot mint ids offline.

**API always mints.** This option has the same opacity and a simpler contract.
But then offline chat needs temp-id reconciliation and an idempotency-key column
in month 4.

## Cost

The cost is +8 bytes for each row, for each foreign key and for each index entry.
This is ~160 KB on `users` at 20k users. It is ~1 GB of added index on a
144M-row events table.

## Revisit when

A single table passes ~500M rows, and its index size becomes the constraint
that sets the limit. That table is almost certainly `analytics_events`. It can change to
`bigint` in isolation, because nothing ever holds a foreign key to a log line.
