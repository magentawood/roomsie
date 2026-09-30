# 0015 — UUIDv7 primary keys, minted by the client where possible

**Status:** Accepted · 2026-09-15
**Depends on:** ADR 0005 (Supabase Postgres), ADR 0006 (Drizzle)

## Decision

**In one line:** Each table uses a UUIDv7 `id` primary key with no database default: the API mints it, or the client mints it for offline writes.

Each table uses `id uuid primary key`: a **UUIDv7** with **no database
default**. The API mints the id through Drizzle `$defaultFn`. For writes that
can occur offline, the client mints the id, and the API validates it.

```ts
id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
```

## Why not `bigint identity`

A sequential `bigint` is smaller and faster, and it needs no library. But three
items are more important than these advantages.

|   | `bigint` identity | `uuid` v4 | `uuid` v7 |
|---|---|---|---|
| Bytes | 8 | 16 | 16 |
| Who can generate it | Postgres only, at INSERT | anyone, anywhere | anyone, anywhere |
| Insert locality | perfect | none | near-perfect |
| Guessable | yes | no | no |
| What it leaks | user count + signup order | nothing | approximate signup time |

1. **Enumerability, the most important item for this product.** A person can
   know from one id that its neighbours exist. Then each endpoint that takes a
   user id becomes a list of all the women on the platform that a person can
   walk. That needs no bug, only a `for` loop. Authorization should stop this,
   and it will. But on a safety product, defence in depth means that we do not
   give out the map at all.
2. **Insert locality: "UUIDs are slow" is only half correct.** A Postgres index
   is a sorted B-tree. A sequential key always goes on the rightmost page, which
   stays hot in RAM. A random UUIDv4 goes to a different page for each insert.
   When the index becomes larger than RAM, each v4 insert is a random disk read
   and a dirty page.

   UUIDv7 puts a 48-bit millisecond timestamp in the high bits. Thus, new ids
   sort to the end. This gives the opacity of v4 with the
   locality of `bigint`. You cannot see the difference at 20k users. You can see
   it clearly on a 144M-row events table.
3. **Client-minted ids, the item that pays off in month 4.** With uuids, the
   phone mints the real, permanent id before the server sees the row. This gives
   instant render. Also, a retried POST is naturally idempotent through
   `ON CONFLICT (id) DO NOTHING`.

   With `bigint`, the DB must assign the id. Thus,
   the app renders a temporary message, waits, and then rewrites all references
   to it: reply threading, read receipts and cache keys. Also, a retried POST
   creates a duplicate. We ship KMP apps with offline chat in month 4.

> [!example]- Examples
> - Enumerability: from `/users/1024`, a person can know that `1023` and `1025` exist.

## Why no database default

Supabase hosted runs **Postgres 17**. Native `uuidv7()` arrived in **Postgres 18**.
But we would not use it as a column default, also after the upgrade.

With a `DEFAULT uuidv7()`, the id exists only *after* the INSERT commits. Thus, the
client can never know the id in advance. Offline-first is then dead on arrival. Id generation in app code works
identically on 17 and 18, and it keeps the upgrade off the critical path.

Generation priority: **client if it can → API if it did not → never the database.**

- For a client-minted chat message, the Zod schema of the API validates that the
  id is a v7. The insert uses `ON CONFLICT (id) DO NOTHING`, so it is retry-safe.
- At signup, the API mints the id and returns it to the client.

## Which tables the client may mint

Only for rows that it creates as a self-contained action that it could do
offline.

| Table | Minted by | Why |
|---|---|---|
| `messages` | client | Offline send, retry-safe, instant render |
| `swipes` | client | The user can swipe with no signal. Queue and flush. |
| `reports` | client | Must work on a connection that is about to fail. Safety-critical. |
| `blocks` | client | Same as `reports`. Safety-critical. |
| `users` | API | Cannot exist before Firebase verifies the token |
| `profiles` | API | Derived from `users` |
| `listings` | API | Also needs a server-side R2 presign first |

All tables use the same column definition. The only difference is if the Zod
request schema of the endpoint accepts an `id`.

## Guards

| Trap | Guard |
|---|---|
| Spoofed timestamp (client sends a year-2099 v7). This destroys index locality, and all sorts by id are incorrect. | Zod: the embedded timestamp must be in the range ±5 min of the server clock |
| Sort by id (a client with a skewed clock changes the order of a chat thread) | **Never sort by the uuid.** All tables get `created_at timestamptz not null default now()`, from the server clock. Ordering uses that column. It is the only chronology that the application trusts. The timestamp in a UUIDv7 is an optimisation for Postgres. It is not data. The application never reads it, never shows it and never orders by it. |
| Id squatting (an attacker inserts rows in advance at ids that you will want) | This trap does not apply, because ids are random and unpredictable |

Collisions are not a practical concern:

- There are ≥62 bits of randomness for each millisecond. A collision needs two
  devices to pick the same 62-bit number in the same millisecond.
- At a million writes per millisecond, approximately 10,000× our peak, the
  chance is approximately 1 in 10 million.
- A duplicate primary key makes the second `INSERT` fail loudly. It does not
  overwrite the row.

To overwrite another row is structurally impossible:

- To overwrite, you must use `UPDATE`. `UPDATE` never runs on a client-supplied
  id without `WHERE user_id = <id from the verified JWT>`.
- If a malicious client guesses an id, the worst result is that its own insert
  fails.

## Rejected

- **`bigint` PK + separate opaque `public_id`.** Best storage profile, and
  nothing enumerable leaves the API. But each row has two identifiers forever,
  and each join and each response must pick the correct one. Also, it cannot
  mint ids offline. The 8 bytes are not worth a permanent second id.
- **API always mints.** Same opacity and a simpler contract. But then offline
  chat needs temp-id reconciliation and an idempotency-key column in month 4.

## Cost

+8 bytes for each row, for each foreign key and for each index entry:

- ~160 KB on `users` at 20k users. This is noise.
- ~1 GB of added index on a 144M-row events table. This cost is
  important, and we examine it again at S7.

## Revisit when

A single table passes ~500M rows, and its index size becomes the limiting
constraint. That table is almost certainly `analytics_events`. It can change to
`bigint` in isolation, because nothing ever holds a foreign key to a log line.
