# API standards

These rules apply to `apps/api`. The rules in [_index.md](_index.md) also apply.

## Contract and input

- Serve each route with the `/v1` prefix. A change that breaks clients gets a new version, never an edit in place. Why: we cannot force shipped mobile apps to update. ([ADR-0002](../decisions/0002-api-boundary.md))
- A Zod schema parses each byte from outside before other code touches it. This includes bodies, query params, webhooks and third-party responses. Why: TypeScript types do not exist at runtime. ([ADR-0004](../decisions/0004-api-stack-typescript-fastify.md))
- Never use an `as` cast on external data. Why: `as` is a promise to the compiler, not a check. ([ADR-0004](../decisions/0004-api-stack-typescript-fastify.md))
- Give each new field of a response a default in `packages/contract`. Why: Vercel goes live a few minutes before the API, so the new web reads the reply of the old API, and a required new field breaks the page (the chips of #197, the free messages of #200). ([ADR-0002](../decisions/0002-api-boundary.md))
- Generate the OpenAPI document from the Zod schemas and commit it. Why: it is the single source of truth for all clients. ([ADR-0004](../decisions/0004-api-stack-typescript-fastify.md))
- Put the shared contract in `packages/contract`. Why: the two apps and the future mobile app share one contract. ([ADR-0003](../decisions/0003-api-as-separate-service.md), [ADR-0010](../decisions/0010-monorepo-tooling.md))
- CPU-heavy work must not block the event loop. Put the rank computation in SQL. Why: a blocked event loop stops all requests. ([ADR-0004](../decisions/0004-api-stack-typescript-fastify.md))

## Auth

- The only auth mechanism is `Authorization: Bearer <Firebase ID token>`, plus the `X-Visitor-Key` of a visitor chat. Use no session cookies. Why: web, Android and iOS share one verification path. ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md))
- Verify the token signature locally, with the cached public keys of Google. Do not call Firebase for each request. Why: the check then needs no network call and no database lookup. ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md))
- Reject an `auth_time` before `tokens_valid_after` (401) and a user who is not `active` (403), except `DELETE /v1/me`. Why: one write stops all sessions, also new ones. ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md))
- An `UPDATE` on a client-supplied id has `WHERE user_id = <id from the verified JWT>`, except the PD18 hide, the admin routes, the ADR-0019 token takeover and a visitor goal (the session of the key hash is in the `WHERE`). Why: a guessed id cannot change the row of a different user. ([ADR-0015](../decisions/0015-primary-key-strategy.md))
- When phone OTP ships, put it behind our own endpoints, `POST /auth/phone/start` and `/auth/phone/verify`. Why: we can change the SMS provider. ([ADR-0005](../decisions/0005-managed-platform-split.md))

## Storage and realtime

- Image bytes never go through the API. The API gives a short-lived presigned R2 upload URL. Then the client uploads and reports the key. Why: the API does not carry image traffic. ([ADR-0005](../decisions/0005-managed-platform-split.md))
- Verification selfies and ID documents go in an isolated, private bucket. Delete the selfie after the check. Give access only through short-lived signed URLs, after a check. Why: one bad bucket policy must not expose biometric data. ([ADR-0005](../decisions/0005-managed-platform-split.md), [PD8](../decisions/pd-08-verification.md), [PD19](../decisions/pd-19-retention.md))
- Make the blurred copy of a photo on the server, at upload. Never give a viewer the address of the initial image without permission. Why: anyone can read the initial image in the network tab. ([PD8](../decisions/pd-08-verification.md))
- Realtime is `broadcast` only. The API writes the message, applies the rules, then publishes to a channel. Never use `postgres_changes`. Why: a client that subscribes to a table learns the schema. ([ADR-0005](../decisions/0005-managed-platform-split.md))

## Errors, analytics and limits

- Give each call to an outside service a timeout. Why: a service that hangs holds a row lock, a request or the close of the server. (Rule candidates of [#175](https://github.com/magentawood/roomsie/pull/175) and [#200](https://github.com/magentawood/roomsie/pull/200))
- Report errors only through `reportError(err, context)`. Never call the Sentry SDK directly. Why: the planned move to Crashlytics then changes one file for each app. ([ADR-0014](../decisions/0014-error-tracking.md))
- Buffer the analytics writes and flush them in batches. Why: the analytics database then gets a small number of large inserts. ([ADR-0012](../decisions/0012-analytics-event-store.md))
- Each event is a versioned Zod schema in `packages/contract`, with `event_version` on each row. Why: a field name is expensive to change after millions of rows carry it. ([ADR-0012](../decisions/0012-analytics-event-store.md))
- Keep the turn cap value in config, not in code. Chip taps do not count as turns. Why: the cap is a conversion lever that we will change. ([PD9](../decisions/pd-09-pre-login-limits.md))
- At the daily spend amount, keep the chat working. Send an alert at 70% and at 100% of the amount. Why: a stop would also stop the people that we want, and the alert lets a person look at the cause. ([PD9](../decisions/pd-09-pre-login-limits.md))
- Count each limit from the database, never in the memory of the API. Why: a deploy resets a counter in memory, and two machines give two times each limit. ([PD9](../decisions/pd-09-pre-login-limits.md))
