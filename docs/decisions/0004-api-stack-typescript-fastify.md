# ADR 0004 — apps/api is TypeScript on Node, using Fastify and Zod

**Status:** Accepted · **Date:** 2026-09-10 · **Deciders:** Yash

## Context

The team has four people. Yash is Android/Kotlin. One or more members have real
server-side experience. The stated preferences of the group are JavaScript and
Java.

Approximately 60–80 person-hours are available for backend before launch.
Native Android and iOS follow subsequently. They share business logic through
Kotlin Multiplatform.

We considered these candidates: TypeScript on Node, Kotlin with Ktor, and Java
with Spring Boot.

## Decision

`apps/api` is TypeScript on Node. It uses **Fastify** as the HTTP framework. It
uses **Zod** for runtime validation at each external boundary.

We express the API contract as an **OpenAPI document generated from those
schemas**. That document is the single source of truth for all clients.

## Rationale

**Why TypeScript rather than Kotlin or Java.** The constraint that controls the
decision is person-hours, not throughput. At 20k users in one city, each
candidate has more capacity than necessary. Only a load test would show a
difference between them.

Two developers already prefer JavaScript. AI assistance for TypeScript is
materially stronger. A single-language monorepo does not need Gradle and pnpm
side by side.

The real advantage of Kotlin is that it shares DTOs directly with the KMP
module. We can get this advantage back subsequently, through OpenAPI codegen.
We cannot get back the month that the team spends on ramp-up. We rejected Java
because of its verbosity and its slow feedback loops, against a
two-hours-a-day schedule.

**Why Fastify rather than Hono or Express.** Fastify has a design for exactly
the Node process that runs continuously, which ADR 0003 committed to. It ships
first-party plugins for CORS, rate limits, JWT, multipart uploads and OpenAPI generation.
The spec requires all of these.

Fastify has a schema-first design. Thus, the KMP clients get the OpenAPI
document that they need as a byproduct of usual work. It is not a chore of its
own.

Hono has two headline advantages. The first is edge-runtime portability, which
is moot with ADR 0003. The second is TypeScript-only RPC types. Kotlin cannot
consume these types, and there is a risk that it pushes out a real OpenAPI
spec. Express is not modern, and in effect it is in maintenance.

**Why Zod is mandatory, not optional.** The compiler erases TypeScript types at
compile time. `as SomeType` is an assertion, not a check. Without runtime
parsing at the edge, the type safety is theatre. Rule: a schema parses each
byte that enters the API from outside, before all other code touches it. This
includes request bodies, query params, webhooks and third-party responses.

## Consequences

- Runtime validation at each boundary is a non-negotiable review item.
- CPU-heavy work must not block the event loop. The ranking computation belongs
  in SQL. SQL is the correct place for it for other reasons too.
- We must generate and commit the OpenAPI document from day one, before a
  mobile client exists. Thus, we never have to reconstruct it retroactively.
- Node dependency churn is a continuous maintenance cost. We accept this cost.

## Alternatives rejected

- **Kotlin + Ktor** — This is the best long-term fit for the mobile story. We
  rejected it because of polyglot-monorepo friction, team ramp-up and a thinner
  server ecosystem.
- **Java + Spring Boot** — This is the most mature option. We rejected it
  because of verbosity and feedback-loop speed, against the hour budget.
- **Go, Python** — No person on the team knows Go. No person on the team
  prefers Python. If v2 ranking needs a Python ML service, this API can call it
  subsequently.

## Revisit when

The team composition has a large change in the direction of JVM. Or, a workload
occurs that Node genuinely cannot serve. We do not expect these conditions before launch.
