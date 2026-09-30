# ADR 0002 — Clients talk to our API, never to the database

**Status:** Accepted · **Date:** 2026-09-05 · **Deciders:** Yash

## Context

Web (responsive) ships first; native Android and iOS follow, with shared
business logic in Kotlin Multiplatform and native UI in Compose / SwiftUI.
That means the same rules will eventually be exercised by three clients.

Managed backends allow clients to query Postgres directly, with Row Level
Security policies as the only authorization layer. That is the fastest path to
a v1 and the reason it was considered.

## Decision

All application reads and writes go through an HTTP API we write. Client apps
never hold a database connection and never know table or column names.

We do rent three pieces of genuine infrastructure from the managed platform:
the OAuth sign-in flow, object storage plus CDN for images, and the websocket
transport for chat.

Row Level Security stays enabled underneath as defence in depth, not as the
primary authorization mechanism.

## Rationale

- Business rules must live in exactly one place. Split across SQL policies and
  three clients, they drift, and the drift is invisible until a client
  misbehaves in production.
- Parts of the spec cannot be expressed as RLS at all: the queue ranking score,
  exclusion of already-seen profiles, the 3-rejects-then-suppress-90-days rule,
  chat rate limits, and first-message contact-detail stripping. Server-side code
  is required regardless — so we should not pretend otherwise and build half a
  backend by accident.
- With an API in place, adding a client is adding an HTTP client. Without one,
  adding a client means reimplementing the rules.
- Table shapes become an internal detail again, so schema changes stop being
  breaking changes for shipped mobile apps we cannot force-update.

## Consequences

- The API contract itself becomes an expensive-to-change artefact and must be
  versioned and documented deliberately.
- Slower to first screen than direct-to-database. Accepted knowingly.
- Auth token verification must happen in our API, not only at the database edge.
- The KMP shared module later consumes this same API — no parallel code path,
  and the web app has already exercised every endpoint in production.

## Alternatives rejected

- **Direct-to-database (BaaS), RLS only.** Fastest v1, but couples three clients
  to the schema and scatters business rules. The expensive-to-change layer would
  be the one we rented.
- **Own everything including auth, uploads and websockets.** Maximum portability,
  but roughly 30–40 extra person-hours against a 60–80 hour budget, spent on
  problems that are solved and not differentiating.

## Revisit when

The rented pieces (OAuth, storage, socket) become a constraint, or costs at
scale justify bringing one of them in-house. Each is individually replaceable
because none of them holds business logic.
