# ADR 0012 — Analytics events live in our own Postgres

**Status:** Accepted · **Date:** 2026-09-14 · **Deciders:** Yash

## Context

Discovery emits a per-card event lifecycle — impression, true view, dwell, deep
view, decision — buffered client-side and flushed on decision, on an interval,
and on `visibilitychange`. Estimated volume at 5k weekly actives:

| | |
|---|---|
| Sessions/month | ~65,000 |
| Events per session | ~150–200 |
| **Events/month** | **~10–13M** |
| **Average write rate** | **~5/sec** |

These events serve two different consumers: humans wanting funnels, retention
and activation dashboards, and a future ranking model wanting every raw
`card_decision` as training signal.

*(The event list originated in `PRD.md`, now deprecated. The specific events
need revalidating; the volume model and the two-consumer split do not depend on
that document.)*

## Decision

**All analytics events go to a separate, append-only Postgres instance that we
own.** No third-party analytics vendor.

| Aspect | Choice |
|---|---|
| Store | A second Supabase Postgres project, separate from the transactional database |
| Table design | Append-only, **partitioned monthly**, BRIN index on timestamp |
| Writes | Buffered in `apps/api` and flushed in batches — not per event |
| Schema | Versioned Zod in `packages/contract`, with `event_version` on every row |
| Aggregation | Rollup tables built by a background job, queried by dashboards |

## Rationale

**Separate instance, not a separate table.** The point of keeping analytics off
the primary database is resource isolation — write bursts must not compete for
IOPS or connections with a user waiting on the swipe stack. A different schema
in the same instance would not achieve that.

**The volume does not justify specialist tooling.** ~5 writes/sec average is
unremarkable for Postgres, and because `apps/api` is a long-running process
(ADR 0009) it buffers and batches, so Postgres sees a few large inserts rather
than a firehose. ClickHouse and Tinybird are the right answer at roughly ten
times this scale.

**Data sovereignty.** This platform holds verified profiles, locations, budgets
and behavioural traces of women searching for housing. The behavioural stream is
sensitive in its own right — who looked at whom, for how long. Keeping it inside
our own infrastructure, rather than shipping it to a vendor, is the defensible
position for this product specifically.

**The schema is the expensive part; the store is not.** Once fifty million rows
carry a field name, renaming it means a migration and a gap in history. Moving
those rows to ClickHouse later is an export and an import. So the schema is
defined once, versioned, in `packages/contract` — and that is what actually has
to be right today.

**Cost:** ~$25/month versus ~$390/month for PostHog at this volume.

## Consequences

- **We build our own dashboards.** Funnels, D7/D30 retention, activation rate
  and accept rate are all queries and UI we write. This is real work, deliberately
  accepted, and it can be deferred — the events accumulate from day one whether
  or not anything reads them yet.
- Partition creation must be automated (a scheduled job creating next month's
  partition), or inserts fail at a month boundary.
- Rollup tables need a background job. `apps/api` already has one.
- **Retention and deletion policy is now our problem.** Events reference
  `users.id`, so they are personal data under India's DPDP Act. Account deletion
  must purge or pseudonymise the user's event history, and raw events need a
  defined retention window. This must be designed with the schema, not bolted on
  — it is the one part of owning the data that is genuinely harder than renting it.

## Alternatives rejected

- **PostHog for everything** — dashboards, funnels and session replay with almost
  no analytics code. Rejected on ~$390/month at this volume, and on shipping a
  sensitive behavioural stream plus our future training corpus into a vendor's
  system.
- **Own Postgres + PostHog on a curated subset** — dashboards effectively free
  while the firehose stays ours. Rejected to keep to one system and one place
  where events live.
- **ClickHouse / Tinybird** — correct at ~10× this volume; new technology and
  another vendor for a workload Postgres handles comfortably.

## Revisit when

Aggregation queries become slow enough to hurt — likely past ~500M rows, i.e.
several years at current projections — at which point the export-import to a
columnar store is straightforward precisely because the schema was versioned
and owned.
