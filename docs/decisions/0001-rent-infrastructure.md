# ADR 0001 — Rent infrastructure, own the application layer

**Status:** Accepted · **Date:** 2026-09-05 · **Deciders:** Yash

## Context

Team of 4 at ~2 hrs/day, targeting launch in ~1 month (~200 person-hours total,
of which roughly 60–80 are available for backend and infrastructure). Target
scale for year one is one city, ceiling ~20k registered users.

Yash wants operational control and wants to learn how systems scale, but also
wants v1 in front of users quickly.

## Decision

For v1 we rent infrastructure: a provider runs Postgres, object storage and the
CDN. We hand-write the schema, every migration, every query and every API
endpoint ourselves — no vendor-generated application code.

## Rationale

Rework cost is not uniform, and the two layers sit in different buckets:

- **Cheap to change later:** hosting provider, server size, CDN, region. Moving
  Postgres between hosts is a dump-and-restore at any scale we will plausibly
  reach.
- **Expensive to change later:** data model, API contract, identity/auth model,
  analytics event schema. These get baked into every client and every stored row.

So we buy control where it compounds (the application) and rent where it does
not (the machines). At 20k users in one city there is no scaling problem to
solve yet — a single modest Postgres instance covers it comfortably.

## Consequences

- Effectively zero of the backend hour budget goes to provisioning and babysitting servers.
- We must keep schema and migrations in version control and provider-agnostic —
  plain SQL, no proprietary extensions on the critical path — so the exit stays cheap.
- Self-hosting remains available later as a deliberate exercise against a
  working system, which is a better teacher than a greenfield setup.

## Alternatives rejected

- **Run our own VPS + Postgres from day 1.** Realistically 40–60 person-hours
  before the first feature ships, plus an ongoing tax, out of a ~200 hour budget.
  Buys control over a layer that is cheap to reclaim later anyway.

## Revisit when

Infrastructure cost becomes material, or a requirement appears that managed
hosting cannot serve (data residency, an unsupported extension, custom tuning).
