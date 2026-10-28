# ADR 0007 — Hybrid rendering, Bearer tokens, and instant revocation

**Status:** Accepted · **Date:** 2026-09-10 · **Deciders:** Yash

## Context

- `apps/web` must serve two very different types of page:
  - The landing page and the property listings are the organic-search surface
    (per the product requirements). Thus, they must be crawlable.
  - The authenticated app (stack, liked, chat, settings) has no SEO value at
    all.
- Identity must go to `apps/api` in a way that Android and iOS can use again
  with no change (ADR 0002).

> [!example]- Examples
> Nobody searches for the chat inbox of a different person.

## Decision

**In one line:** Pages that need SEO render on the server, a Bearer Firebase ID token is the single authentication mechanism, and `users.tokens_valid_after` ships in the first migration.

**1. The rendering of a page depends on if the page needs SEO.**

| Surface | Rendering | Identity |
|---|---|---|
| Landing, listing browse, listing detail | Next renders the page on the server and calls `apps/api` server-to-server | None. The data is public. |
| Stack, liked, chat, settings | The browser renders the page on the client | Firebase ID token in `Authorization: Bearer` |

**2. `Authorization: Bearer <Firebase ID token>` is the single authentication
mechanism.** It is the same on web, Android and iOS. We use no session cookies.

**3. `users.tokens_valid_after timestamptz not null default now()` ships in the
first migration.** The check is in the auth middleware from day one. It
compares the `auth_time` of the token, the time of the sign-in. Firebase
refreshes the ID token each hour with a new `iat`, but the same `auth_time`.
Thus, a revocation holds until the person signs in again. The first sign-in
makes the row with `tokens_valid_after` at the `auth_time` of its token.

**4. The auth middleware also rejects a user whose `status` is not `active`.**
A suspended user can sign in again and get a new token. The new token passes
the `tokens_valid_after` check, but the status check stops it. One route is the
exception: a suspended user can call `DELETE /v1/me`, because the DPDP Act lets
each person remove their data.

**5. A deleted account stays as a tombstone row.** The row keeps a hash of the
Google account id of the token, not the id. The Google account id stays when
T-53 deletes the Firebase user, and the Firebase UID does not. A token with no
Google account id uses the UID. Its `tokens_valid_after` moves to the deletion, in
whole seconds, as `auth_time` is. Thus, a token from before the deletion gets
401. A sign-in after the deletion makes a new, empty account. Two conditions
stop it (403): the account had the `suspended` status at deletion, or a
report against the account is open. Thus, a deletion does not undo a
suspension or a block.

## Rationale

**Why Bearer and not session cookies.** Mobile clients cannot use cookies, so a
cookie path would be web-only. We would have two authentication code paths to
build, test and keep in sync forever: exactly the divergence that ADR 0002
exists to prevent. With Bearer, the API has one verification path for all three
clients.

**How verification works.** Google signs the Firebase ID token with RS256. The
API caches the public keys of Google and verifies the signature locally, with
no database lookup and no call to Firebase.

Firebase issues two tokens for each session:

| Token | Lifetime | Who sees it |
|---|---|---|
| ID token (JWT) | ~1 hour, **not configurable** | The client sends it to our API with each request. |
| Refresh token (opaque) | Long-lived | It stays on the device. Our API never sees it. |

Before the ID token expires, the platform SDK silently exchanges the refresh
token for a new ID token.

**Why we do not try to shorten the 1-hour TTL.**

- Only session cookies have an adjustable lifetime (5 minutes to 2 weeks), and
  we rejected cookies above.
- More importantly, a shorter TTL is the incorrect lever. It addresses a stolen
  token, and attackers steal tokens through XSS. An attacker who can run
  JavaScript on the page continuously harvests new tokens while the tab is
  open, or takes the refresh token and mints their own tokens.
- A 5-minute TTL barely inconveniences that attacker. But it costs 12× the
  refresh traffic and adds a class of "expired mid-request" retry edge cases.

**What we build as an alternative: instant revocation.** We own the `users`
table (ADR 0005 Rule 1), so we add one column and one check:

```ts
// after verifying the JWT signature
if (decoded.auth_time * 1000 < user.tokens_valid_after.getTime()) throw unauthorized()
```

If we set `tokens_valid_after = now()`, all the sessions of that user stop
immediately, on all devices. This one-line write serves suspend, ban, "log out
everywhere" and compromise response. It also serves a suspension that the moderator
decides ([PD18](pd-18-moderation.md)).

The cost is one column, ~3 lines of middleware, and approximately one hour.
Firebase's `verifyIdToken(token, checkRevoked: true)` does a similar thing, but
with a network call to Google on each request. Our column is a local check on a
row that the API already loaded.

## Consequences

- The API rejects a request with an invalid signature, or with an `auth_time`
  older than `tokens_valid_after` (401). It rejects a user who is not active (403),
  except a suspended user who deletes the account.
- We must configure CORS on `apps/api` for the web origin.
- The ID token is in JavaScript, so it is XSS-reachable. The mitigations are a
  strict Content-Security-Policy, the 1-hour expiry, and the instant revocation
  above. Our code keeps the ID token only in memory, never in `localStorage`.
  The Firebase SDK keeps its refresh token in IndexedDB, so a user stays signed
  in after a reload. All mobile apps accept this same exposure.
- The policy has a new nonce for each request (T-52), not the hashes of the
  files, because the experimental hashes of Next do not cover its inline
  scripts. Thus, each page renders on each request, because a static page
  cannot have the nonce. The policy also blocks inline styles and `eval`. A
  share card of `next/og` is a PNG, not HTML, so it can use inline styles (T-37).
- Public pages must not require identity, so the API needs unauthenticated read
  endpoints for listings and landing content.

## Alternatives rejected

- **Everything client-side**: This is the simplest option, with one auth path.
  But it loses the organic search traffic that the product depends on.
- **Everything server-side with session cookies**: This gives the best XSS
  protection and the best first paint. But it is web-only, so we would have two
  auth paths forever.

## Revisit when

The XSS risk becomes unacceptable (for example, after a real incident). Then we
can add a cookie layer *in addition to* Bearer, and not remove Bearer.
