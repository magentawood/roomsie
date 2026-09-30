# ADR 0002 — Clients talk to our API, never to the database

**Status:** Accepted · **Date:** 2026-09-05 · **Deciders:** Yash

## Context

Web (responsive) ships first. Native Android and iOS follow. They share business
logic in Kotlin Multiplatform, and they have native UI in Compose / SwiftUI.
Thus, at a subsequent time, three clients will use the same rules.

Managed backends let clients query Postgres directly. Then the Row Level
Security policies are the only authorisation layer. This is the fastest path to
a v1. That is the reason that we considered it.

## Decision

All application reads and writes go through an HTTP API that we write. Client
apps never hold a database connection. They never know table names or column
names.

But we rent exactly three pieces of genuine infrastructure from the managed
platform:

- the OAuth sign-in flow
- object storage plus CDN, for images
- the websocket transport, for chat.

Row Level Security stays enabled in the database as defence in depth. It is not
the primary authorisation mechanism.

## Rationale

- Business rules must be in one place only. If the rules are in SQL policies
  and in three clients, the copies drift. We cannot see this drift until a
  client operates incorrectly in production.
- We cannot express some parts of the spec as RLS at all:
  - the queue ranking score
  - the exclusion of profiles that the user saw before
  - the 3-rejects-then-suppress-90-days rule
  - chat rate limits
  - the removal of contact details from the first message.

  Thus, we need server-side code in all conditions. We should not act as if we
  do not need it. If we do, we build half a backend by accident.
- With an API, to add a client is to add an HTTP client. Without an API, to add
  a client, we must write the rules again.
- Table shapes become an internal detail again. Thus, a schema change is no
  longer a breaking change for shipped mobile apps. We cannot force-update these
  apps.

## Consequences

- The API contract itself becomes an expensive-to-change artefact. We must
  version it and document it deliberately.
- The time to first screen is longer than with direct-to-database. We know
  this, and we accept it.
- Auth token verification must occur in our API, not only at the database edge.
- At a subsequent time, the KMP shared module uses this same API. There is no
  parallel code path. Before then, the web app will use each
  endpoint in production.

## Alternatives rejected

- **Direct-to-database (BaaS), RLS only.** This gives the fastest v1. But it
  makes three clients dependent on the schema, and it puts business rules in
  many places. Then the expensive-to-change layer would be the layer that we
  rented.
- **Own everything including auth, uploads and websockets.** This gives maximum
  portability. But it costs approximately 30–40 more person-hours from a 60–80
  hour budget. We would use these hours on problems that have solutions, and that do not make us different.

## Revisit when

The rented pieces (OAuth, storage, socket) become a constraint. Or, costs at
scale justify a move of one of them in-house. We can replace each piece
independently, because no piece holds business logic.
