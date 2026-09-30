# ADR 0003 — The API is its own deployable, inside one monorepo

**Status:** Accepted · **Date:** 2026-09-08 · **Deciders:** Yash

## Context

ADR 0002 established that clients talk to an API we own, never to the database.
The obvious cheap way to build that API is inside the Next.js app as route
handlers: one project, one deploy, no CORS, no network hop, free type sharing.

## Decision

One repository containing (at least) `apps/web` and `apps/api`. Two artefacts
that build and deploy independently, sharing tooling and the API contract.

Separate *deployable*, not separate *repository*.

Next.js keeps route handlers only for things that belong to the web client
specifically: the OAuth callback, image proxying, webhooks. No business logic.

## Rationale

- **It makes ADR 0002 enforceable rather than aspirational.** If the API lives
  inside the web app, the database is one import away from every Server
  Component. Under deadline pressure someone queries it directly because it
  works, and that rule now exists only in the web client. A network boundary
  cannot be reached past by accident.
- **The runtime model fits the workload.** The spec needs background jobs
  (auto-suspend on report threshold, ghost-profile decay at 30/60 days,
  analytics aggregation), scheduled work, and a persistent Postgres connection
  pool. Serverless route handlers make each of these a workaround; a
  long-running service simply has them.
- **Deploy coupling.** Otherwise a CSS change redeploys the API that shipped
  mobile apps — which cannot be force-updated — depend on.
- **Scaling axes diverge** once mobile ships and most traffic carries no web
  rendering at all.
- **Four people at ~2 hrs/day parallelise better** across two deployables with a
  contract between them than across one codebase.

## Consequences

- A few extra hours of setup: CORS, auth token propagation, two local processes
  (one monorepo task runner command).
- One extra network hop for server-side rendering — roughly 1–5ms in-region.
- The monorepo needs a task runner and a shared contract package from day one.

## Alternatives rejected

- **API inside Next.js route handlers.** Least setup, fastest first screen, but
  erodes the client/API boundary and fits the background-job requirements poorly.
- **Separate repositories.** Hardest boundary, but loses single-clone
  convenience and splits every contract change across two PRs. A later-stage move.

## Revisit when

The web app is the only client and mobile is cancelled, or operational overhead
of two deployables measurably outweighs the boundary's value.
