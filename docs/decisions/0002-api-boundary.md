# ADR 0002 — Clients talk to our API, never to the database

**Status:** Accepted · **Date:** 2026-09-05 · **Deciders:** Yash

## Context

- Web (responsive) ships first. Native Android and iOS follow, with business
  logic shared in Kotlin Multiplatform and native UI in Compose / SwiftUI.
  Thus, three clients will use the same rules.
- v0 has no mobile app. The web app is responsive, and one client is
  sufficient to learn from. Later, the mobile app goes in a new `apps/mobile`
  on the same `/v1` API.
- Managed backends let clients query Postgres directly, with Row Level Security
  policies as the only authorisation layer. This is the fastest path to a v1.

## Decision

All application reads and writes go through an HTTP API that we write. Client
apps never hold a database connection, and never know table names or column
names.

We rent exactly three pieces of genuine infrastructure from the managed
platform:

- the OAuth sign-in flow
- object storage plus CDN, for images
- the websocket transport, for chat.

Row Level Security stays enabled in the database as defence in depth. It is not
the primary authorisation mechanism.

## Rationale

- Business rules must be in one place only. Rules in SQL policies and in three
  clients drift, and we cannot see the drift until a client operates
  incorrectly in production.
- We cannot express some parts of the spec as RLS at all:
  - the queue ranking score
  - the exclusion of profiles that the user saw before
  - the 3-rejects-then-suppress-90-days rule
  - chat rate limits
  - the removal of contact details from the first message.

  Thus, we need server-side code in all conditions. If we act as if we do not,
  we build half a backend by accident.
- With an API, to add a client is to add an HTTP client. Without an API, we
  must write the rules again.
- Table shapes become an internal detail again. Thus, a schema change is not a
  breaking change for shipped mobile apps, which we cannot force-update.

## Consequences

- The API contract itself becomes an expensive-to-change artefact. We must
  version it and document it deliberately. All routes have the `/v1`
  prefix, so that earlier app versions continue to work.
- The time to first screen is longer than with direct-to-database. We accept
  this.
- Auth token verification must occur in our API, not only at the database edge.
- At a subsequent time, the KMP shared module uses this same API, with no
  parallel code path. Before then, the web app will use each endpoint in
  production.

## Alternatives rejected

- **Direct-to-database (BaaS), RLS only.** It makes three clients dependent on
  the schema, and it puts business rules in many places. Then the
  expensive-to-change layer would be the layer that we rented.
- **Own everything including auth, uploads and websockets.** This gives maximum
  portability. But it costs approximately 30–40 more person-hours from a 60–80
  hour budget, on problems that have solutions and do not make us different.

## Revisit when

The rented pieces (OAuth, storage, socket) become a constraint. Or, costs at
scale justify a move of one of them in-house. We can replace each piece
independently, because no piece holds business logic.

## Sources

- [extensibility.md](../extensibility.md)
