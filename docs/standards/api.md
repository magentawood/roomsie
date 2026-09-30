# API standards

These rules apply to `apps/api`: Fastify, Zod, auth, storage, errors, limits and the assistant. The rules in [_index.md](_index.md) also apply.

## Contract and input

- Serve each route with the `/v1` prefix. A change that breaks clients gets a new version, never an edit in place. Why: we cannot force shipped mobile apps to update. ([ADR-0002](../decisions/0002-api-boundary.md))
- A Zod schema parses each byte from outside before other code touches it. This includes bodies, query params, webhooks and third-party responses. Why: TypeScript types do not exist at runtime. ([ADR-0004](../decisions/0004-api-stack-typescript-fastify.md))
- Never use an `as` cast on external data. Why: `as` is a promise to the compiler, not a check. ([ADR-0004](../decisions/0004-api-stack-typescript-fastify.md))
- Generate the OpenAPI document from the Zod schemas and commit it. Why: it is the single source of truth for all clients. ([ADR-0004](../decisions/0004-api-stack-typescript-fastify.md))
- Put the shared contract in `packages/contract`. Why: the two apps and the future mobile app share one contract. ([ADR-0003](../decisions/0003-api-as-separate-service.md), [ADR-0010](../decisions/0010-monorepo-tooling.md))
- Put CPU-heavy work in SQL. Why: work that blocks the event loop stops all requests. ([ADR-0004](../decisions/0004-api-stack-typescript-fastify.md))

## Auth

- The only auth mechanism is `Authorization: Bearer <Firebase ID token>`. Use no session cookies. Why: web, Android and iOS then share one verification path. ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md))
- Verify the token signature locally, with the cached public keys of Google. Do not call Firebase for each request. Why: the check then needs no network call and no database lookup. ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md))
- After the signature check, reject the token if its `iat` is before `users.tokens_valid_after`. Why: one write then stops all sessions of a user. ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md))
- An `UPDATE` on a client-supplied id always has `WHERE user_id = <id from the verified JWT>`. Why: a client that guesses an id cannot change the row of a different user. ([ADR-0015](../decisions/0015-primary-key-strategy.md))
- Put phone OTP behind our own endpoints, `POST /auth/phone/start` and `/auth/phone/verify`. Why: we can then change the SMS provider. ([ADR-0005](../decisions/0005-managed-platform-split.md))

## Storage and realtime

- Image bytes never go through the API. The API gives a short-lived presigned R2 upload URL. Then the client uploads and reports the key. Why: the API stays small and R2 has no egress fees. ([ADR-0005](../decisions/0005-managed-platform-split.md))
- Verification selfies and ID documents go in an isolated bucket that is not public, with short retention. Give access only through short-lived signed URLs, after an authorisation check. Why: one bad bucket policy must not expose biometric data. ([ADR-0005](../decisions/0005-managed-platform-split.md), [PD8](../decisions/pd-08-verification.md))
- Make the blurred copy of a photo on the server, at upload. Never give a viewer the address of the initial image without permission. Why: anyone can read the initial image in the network tab. ([PD8](../decisions/pd-08-verification.md))
- Realtime is `broadcast` only. The API writes the message, applies the rules, then publishes to a channel. Never use `postgres_changes`. Why: a client that subscribes to a table learns the schema. ([ADR-0005](../decisions/0005-managed-platform-split.md))

## Errors, analytics and limits

- Report errors only through `reportError(err, context)`. Never call the Sentry SDK directly. Why: the planned move to Crashlytics then changes one file for each app. ([ADR-0014](../decisions/0014-error-tracking.md))
- Buffer the analytics writes and flush them in batches. Why: the analytics database then gets a small number of large inserts. ([ADR-0012](../decisions/0012-analytics-event-store.md))
- Each event is a versioned Zod schema in `packages/contract`, with `event_version` on each row. Why: a field name is expensive to change after millions of rows carry it. ([ADR-0012](../decisions/0012-analytics-event-store.md))
- Keep the turn cap value in config, not in code. Chip taps do not count as turns. Why: the cap is a conversion lever that we will change. ([PD9](../decisions/pd-09-pre-login-limits.md))
- At the daily spend ceiling, change the chat to chips only. Never show an error page. Send an alert at 70% of the budget. Why: the product continues to work, and a person looks before users see an effect. ([PD9](../decisions/pd-09-pre-login-limits.md))
- Do not add a second API machine while the rate limit counters are in the process. Why: two machines give two times each limit. ([PD9](../decisions/pd-09-pre-login-limits.md))

## The assistant

- Call a model only through the one model module. The module holds the timeout, the retry, the fallback and the token counts. Why: a vendor change is then a config change. ([PD7](../decisions/pd-07-models.md))
- Parse each model output with Zod. If it fails, retry one time on the same model, then on the fallback. Why: the model is never the source of truth. ([PD7](../decisions/pd-07-models.md))
- Each extractor enum has an `unclear` value. Why: without it, the extractor fills slots with guesses. ([PD7](../decisions/pd-07-models.md))
- Handler inputs and outputs are Zod schemas with a version, in `packages/contract`. Why: each handler has one job and its own eval. ([PD7a](../decisions/pd-07a-agent-architecture.md))
- The reply writer reads Form A, Form B and the last two turns. It never reads the full transcript. Why: the cost of a full transcript increases with each turn. ([PD7a](../decisions/pd-07a-agent-architecture.md), [PD5](../decisions/pd-05-team-and-budget.md))
- Reject each Form B observation that has no verbatim quote from the user. Why: a profile fact must point to the words of the user. ([PD7a](../decisions/pd-07a-agent-architecture.md))
- An inferred value never fills a slot silently. A contradiction needs a confirmation from the user, and it never overwrites the earlier value. Log each conflict. Why: the form, not the model, is the source of truth. ([PD3b](../decisions/pd-03b-interview-vs-chips.md))
- Results come from SQL, never from model text. The model never ranks results. Why: then no text in a listing can move the listing up. ([PD7a](../decisions/pd-07a-agent-architecture.md), [PD10](../decisions/pd-10-scope-bands.md))
- Chip taps, off-topic turns and adversarial turns get a scripted reply with no model call. Log each adversarial turn. Why: these turns need no model, and they cost nothing. ([PD7a](../decisions/pd-07a-agent-architecture.md), [PD10](../decisions/pd-10-scope-bands.md))
- Get the chips for a closed question from the slot definition, not from a model call. Why: a second model call makes latency and cost two times larger. ([PD6c](../decisions/pd-06c-interface-holes.md))
- Third-party text, such as listing and profile text, is always data, never instructions. Why: other people write that text, and some will try to control the model. ([PD10](../decisions/pd-10-scope-bands.md))
- Law, tax, area safety and claims about a listing or a person come from our articles only. If no article applies, hand off. Never improvise. Why: an incorrect answer here does the most damage. ([PD10](../decisions/pd-10-scope-bands.md))
- Consulting questions never write to Form A or Form B. Why: a general question is not a fact about the user. ([PD7a](../decisions/pd-07a-agent-architecture.md))
- Never infer or suggest a community or religion preference. Record it only when the user states it. Why: a stated value serves a preference, and an inferred value makes one. ([PD3c](../decisions/pd-03c-exclusionary-preferences.md))
- Apply a stated exclusion on the server, as removed query rows. Log each exclusion with its turn. Why: the excluded person never sees the filter, and the log is our defence. ([PD3c](../decisions/pd-03c-exclusionary-preferences.md))
- Do not add a third sequential model call before the panel moves, unless a measurement supports it. Why: users notice each second in a chat. ([PD7a](../decisions/pd-07a-agent-architecture.md))
- Use no vector store. The advisor finds articles with Postgres full-text search. Why: the corpus is dozens of documents. ([PD7a](../decisions/pd-07a-agent-architecture.md))
- For each model call, log tokens in, tokens out and the model, with the session. Why: the cost for each completed interview is a launch metric. ([PD5](../decisions/pd-05-team-and-budget.md), [PD7a](../decisions/pd-07a-agent-architecture.md))
