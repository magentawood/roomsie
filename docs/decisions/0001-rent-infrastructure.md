# ADR 0001 — Rent infrastructure, own the application layer

**Status:** Accepted · **Date:** 2026-09-05 · **Deciders:** Yash

## Context

- Team: 4 people at ~2 hrs/day. Target: launch in ~1 month.
- Budget: ~200 person-hours in total. Approximately 60–80 are available for
  backend and infrastructure.
- Year-one target scale: one city, with a ceiling of ~20k registered users.
- Yash wants control of the operations, and he wants to learn how systems
  scale. But he also wants v1 in front of users quickly.

## Decision

For v1, we rent infrastructure. A provider operates Postgres, object storage and
the CDN. We write the schema, each migration, each query and each API endpoint
ourselves, by hand. We use no application code that a vendor generates.

## Rationale

The cost of rework is not the same for all items. The two layers are in
different cost groups:

- **Cheap to change subsequently:** hosting provider, server size, CDN, region.
  At all the scales that we will plausibly reach, a move of Postgres to a
  different host is a dump-and-restore.
- **Expensive to change subsequently:** data model, API contract, identity/auth
  model, analytics event schema. These items become fixed in each client and
  each stored row.

Thus, we buy control where control compounds (the application). We rent where
it does not compound (the machines). At 20k users in one city, we have no scale
problem to solve at this time. One small Postgres instance is easily sufficient.

## Consequences

- In effect, zero hours of the backend hour budget go to server provisioning
  and server care.
- Schema and migrations stay in version control and provider-agnostic: plain
  SQL, with no proprietary extensions on the critical path. Thus, the exit
  stays cheap.
- Self-hosting stays available as a subsequent option: a deliberate exercise on
  a system that operates, which teaches more than a greenfield setup.
- We commit the database on the night of Sunday 27 September. After that, the
  database is the item in the design review with the highest cost to change.
  Real data goes into it in the next week.

## Alternatives rejected

- **Run our own VPS + Postgres from day 1.** Realistically, this costs 40–60
  person-hours before the first feature ships, and it adds a continuous tax.
  These hours come from a ~200 hour budget. It buys control of a layer that is cheap to get back subsequently in all cases.

## Revisit when

Infrastructure cost becomes material. Or, a requirement occurs that managed
hosting cannot serve (data residency, an unsupported extension, custom tuning).

## Sources

- [design-review.md](../design-review.md), §2
