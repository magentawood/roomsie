# ADR 0003 — The API is its own deployable, inside one monorepo

**Status:** Accepted · **Date:** 2026-09-08 · **Deciders:** Yash

## Context

ADR 0002 set this rule: clients talk to an API that we own, never to the
database. The obvious cheap way to build that API is in the Next.js app, as
route handlers: one project, one deploy, no CORS, no network hop, and types
shared at no cost.

## Decision

One repository contains (at least) `apps/web` and `apps/api`: two artefacts
that build and deploy independently, and share the same tools and the API
contract.

The API is a separate *deployable*, not a separate *repository*.

Next.js keeps route handlers only for items that are for the web client
only: the OAuth callback, image proxying and webhooks. These route handlers
contain no business logic.

## Rationale

- **With it, we can enforce ADR 0002. Without it, ADR 0002 is only an
  aspiration.** If the API is in the web app, each Server Component is one
  import away from the database. Near a deadline, a person queries the database
  directly because it works, and then that rule exists only in the web client.
  Nobody can go around a network boundary by accident.
- **The runtime model agrees with the workload.** The spec needs background
  jobs (auto-suspend on report threshold, ghost-profile decay at 30/60 days,
  analytics aggregation), scheduled work and a persistent Postgres connection
  pool. Serverless route handlers need a workaround for each. A service that
  runs continuously has them with no workaround.
- **Deploy coupling.** If the API is in the web app, a CSS change redeploys the
  API. Shipped mobile apps depend on this API, and we cannot force-update them.
- **The axes of scale become different** when mobile ships. After that, most
  traffic carries no web rendering at all.
- **Four people at ~2 hrs/day work in parallel better** on two deployables, with
  a contract between them, than on one codebase.

## Consequences

- The setup needs a few extra hours: CORS, auth token propagation, and two local
  processes (one monorepo task runner command).
- Server-side rendering has one more network hop. In-region, this adds
  approximately 1–5ms.
- The monorepo needs a task runner and a shared contract package from day one.

## Alternatives rejected

- **API inside Next.js route handlers.** This has the minimum setup and the
  fastest first screen. But it gradually makes the client/API boundary weaker,
  and it is a bad match for the background-job requirements.
- **Separate repositories.** This gives the hardest boundary. But we lose the
  convenience of a single clone, and each contract change needs two PRs. This
  is a move for a subsequent stage.

## Revisit when

The web app is the only client, and we cancel mobile. Or, the operations
overhead of two deployables is more than the value of the boundary, by a
measurable amount.
