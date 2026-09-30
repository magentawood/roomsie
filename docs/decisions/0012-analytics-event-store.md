# ADR 0012 — Analytics events live in our own Postgres

**Status:** Accepted · **Date:** 2026-09-14 · **Deciders:** Yash

## Context

Discovery emits a lifecycle of events for each card: impression, true view,
dwell, deep view and decision. The client buffers these events. It flushes them
on decision, on an interval and on `visibilitychange`. This is the estimated
volume at 5k weekly actives:

| | |
|---|---|
| Sessions/month | ~65,000 |
| Events for each session | ~150–200 |
| **Events/month** | **~10–13M** |
| **Average write rate** | **~5/sec** |

These events have two different consumers:

- Humans who want dashboards for funnels, retention and activation.
- A future ranking model that wants each raw `card_decision` as training signal.

*(The event list came from `PRD.md`, which is now deprecated. We must validate
the specific events again. The volume model and the two-consumer split do not
depend on that document.)*

## Decision

**All analytics events go to a separate, append-only Postgres instance that we
own.** We use no third-party analytics vendor.

| Aspect | Choice |
|---|---|
| Store | A second Supabase Postgres project, isolated from the transactional database |
| Table design | Append-only, **partitioned monthly**, with a BRIN index on timestamp |
| Writes | `apps/api` buffers the writes and flushes them in batches, not one at a time |
| Schema | Versioned Zod in `packages/contract`, with `event_version` on each row |
| Aggregation | A background job builds rollup tables. Dashboards query these tables. |

## Rationale

**Separate instance, not a separate table.** We keep analytics off the primary
database for resource isolation. Write bursts must not compete for IOPS or
connections with a user who waits on the swipe stack. A different schema in the
same instance would not give this isolation.

**The volume does not justify specialist tooling.** An average of ~5 writes/sec
is usual for Postgres. `apps/api` is a long-running process (ADR 0009). Thus,
it buffers and batches the writes, and Postgres sees a small number of large inserts, not a
firehose. ClickHouse and Tinybird are the correct answer at approximately ten
times this scale.

**Data sovereignty.** This platform holds verified profiles, locations, budgets
and behavioural traces of women who search for housing. The behavioural stream
is sensitive in its own right: who looked at whom, and for how long. We keep this
stream in our own infrastructure, and we do not send it to a vendor. For this
product specifically, that is the defensible position.

**The schema is the expensive part. The store is not.** After fifty million rows
carry a field name, a change to that name means a migration and a gap in history.
A subsequent move of those rows to ClickHouse is an export and an import. Thus, we
define the schema one time, versioned, in `packages/contract`. The schema is the
part that must be correct today.

**Cost:** ~$25/month, against ~$390/month for PostHog at this volume.

## Consequences

- **We build our own dashboards.** Funnels, D7/D30 retention, activation rate
  and accept rate are all queries and UI that we write. This is real work, and
  we accept it deliberately. We can defer it, because the events accumulate from
  day one, also if nothing reads them at this time.
- Partition creation must be automatic: a scheduled job creates the partition
  for the next month. If not, inserts fail at a month boundary.
- Rollup tables need a background job. `apps/api` already has one.
- **Retention and deletion policy is now our problem.** Events reference
  `users.id`. Thus, they are personal data in the scope of India's DPDP Act. Account
  deletion must purge or pseudonymise the event history of the user. Raw events
  need a defined retention window. We must design this policy with the schema,
  and not attach it subsequently. It is the one part where to own the data is genuinely
  harder than to rent it.

## Alternatives rejected

- **PostHog for everything** — dashboards, funnels and session replay with almost
  no analytics code. We rejected it because of the cost of ~$390/month at this
  volume. We also rejected it because it sends a sensitive behavioural stream and
  our future training corpus into the system of a vendor.
- **Own Postgres + PostHog on a curated subset** — dashboards effectively free,
  and the firehose stays ours. We rejected it to keep one system and one place
  for the events.
- **ClickHouse / Tinybird** — correct at ~10× this volume. But it is new
  technology and one more vendor, for a workload that Postgres handles
  comfortably.

## Revisit when

Aggregation queries become so slow that they cause problems. This is likely
after ~500M rows, which is several years away at current projections. At that
point, the export-import to a columnar store is straightforward. It is
straightforward precisely because we versioned and owned the schema.
