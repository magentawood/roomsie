# ADR 0004 — apps/api is TypeScript on Node, using Fastify and Zod

**Status:** Accepted · **Date:** 2026-09-10 · **Deciders:** Yash

## Context

Team of four: Yash is Android/Kotlin, at least one member has real server-side
experience, and the group's stated preferences are JavaScript and Java.
Roughly 60–80 person-hours available for backend before launch. Native Android
and iOS follow later, sharing business logic through Kotlin Multiplatform.

Candidates considered: TypeScript on Node, Kotlin with Ktor, Java with Spring Boot.

## Decision

`apps/api` is TypeScript on Node, using **Fastify** as the HTTP framework and
**Zod** for runtime validation at every external boundary.

The API contract is expressed as an **OpenAPI document generated from those
schemas**, and that document is the single source of truth for all clients.

## Rationale

**Why TypeScript rather than Kotlin or Java.** The binding constraint is
person-hours, not throughput — at 20k users in one city, every candidate is
over-provisioned and only a load test would distinguish them. Two developers
already prefer JavaScript, AI assistance for TypeScript is materially stronger,
and a single-language monorepo avoids running Gradle and pnpm side by side.

Kotlin's real advantage — sharing DTOs directly with the KMP module — is
recoverable later through OpenAPI codegen. The month spent ramping the team is
not recoverable. Java was rejected on verbosity and slow feedback loops against
a two-hours-a-day schedule.

**Why Fastify rather than Hono or Express.** Fastify is built for exactly the
long-running Node process ADR 0003 committed to, and ships first-party plugins
for CORS, rate limiting, JWT, multipart uploads and OpenAPI generation — all of
which the spec requires. Its schema-first design means the OpenAPI document the
KMP clients need is a byproduct of routine work rather than a separate chore.

Hono's headline advantages are edge-runtime portability (moot under ADR 0003)
and TypeScript-only RPC typing, which Kotlin cannot consume and which risks
crowding out a real OpenAPI spec. Express is dated and effectively in
maintenance.

**Why Zod is mandatory, not optional.** TypeScript types are erased at compile
time; `as SomeType` is an assertion, not a check. Without runtime parsing at the
edge, the type safety is theatre. Rule: every byte entering the API from outside
— request bodies, query params, webhooks, third-party responses — is parsed by a
schema before any other code touches it.

## Consequences

- Runtime validation at every boundary is a non-negotiable review item.
- CPU-heavy work must not block the event loop; the ranking computation belongs
  in SQL, which is where it should live anyway.
- The OpenAPI document must be generated and committed from day one, before any
  mobile client exists, so it never has to be reconstructed retroactively.
- Node dependency churn is an accepted ongoing maintenance cost.

## Alternatives rejected

- **Kotlin + Ktor** — best long-term fit for the mobile story, rejected on
  polyglot-monorepo friction, team ramp-up, thinner server ecosystem.
- **Java + Spring Boot** — most mature, rejected on verbosity and feedback-loop
  speed against the hour budget.
- **Go, Python** — nobody on the team knows Go; Python is nobody's preference.
  A Python ML service can be called from this API later if v2 ranking needs one.

## Revisit when

The team composition changes substantially toward JVM, or a workload appears
that Node genuinely cannot serve. Neither is expected before launch.
