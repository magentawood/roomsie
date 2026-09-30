# ADR 0007 — Hybrid rendering, Bearer tokens, and instant revocation

**Status:** Accepted · **Date:** 2026-09-10 · **Deciders:** Yash

## Context

`apps/web` must serve two very different types of page. The landing page and
the property listings are the organic-search surface (per the product
requirements). Thus, they must be crawlable. The authenticated app (stack,
liked, chat, settings) has no SEO value at all. Nobody searches for the chat
inbox of a different person.

Also, identity must go to `apps/api` in a way that Android and iOS can use
again with no change (ADR 0002).

## Decision

**1. The rendering of a page depends on if the page needs SEO.**

| Surface | Rendering | Identity |
|---|---|---|
| Landing, listing browse, listing detail | Next renders the page on the server and calls `apps/api` server-to-server | None. The data is public. |
| Stack, liked, chat, settings | The browser renders the page on the client | Firebase ID token in `Authorization: Bearer` |

**2. `Authorization: Bearer <Firebase ID token>` is the single authentication
mechanism.** It is the same on web, Android and iOS. We use no session cookies.

**3. `users.tokens_valid_after timestamptz not null default now()` ships in the
first migration.** The check is in the auth middleware from day one.

## Rationale

**Why Bearer and not session cookies.** A cookie path would be web-only, because
mobile clients cannot use cookies. Thus, we would have two authentication code
paths to build, test and keep in sync forever. ADR 0002 exists to prevent
exactly this divergence. With Bearer, the API has one verification path for all
three clients.

**How verification works.** The Firebase ID token is a JWT that Google signs
with RS256. The API caches the public keys of Google and verifies the signature
locally. It does no database lookup and does not call Firebase.

Firebase issues two tokens for each session:

| Token | Lifetime | Who sees it |
|---|---|---|
| ID token (JWT) | ~1 hour, **not configurable** | The client sends it to our API with each request. |
| Refresh token (opaque) | Long-lived | It stays on the device. Our API never sees it. |

Before the ID token expires, the platform SDK silently exchanges the refresh
token for a new ID token.

**Why we do not try to shorten the 1-hour TTL.** Firebase sets this TTL, and we
cannot configure it. Only session cookies have an adjustable lifetime (5
minutes to 2 weeks), and we rejected cookies above.

More importantly, a shorter TTL is the incorrect lever. The threat that a short TTL
addresses is a stolen token, and attackers steal tokens through XSS. An
attacker who can run JavaScript on the page continuously harvests new tokens
while the tab is open. Or the attacker takes the refresh token and mints their
own tokens. A 5-minute TTL barely inconveniences that attacker. But it costs
12× the refresh traffic and adds a class of "expired mid-request" retry edge
cases.

**What we build as an alternative: instant revocation.** We own the `users`
table (ADR 0005 Rule 1). Thus, we add one column and one check:

```ts
// after verifying the JWT signature
if (decoded.iat * 1000 < user.tokens_valid_after.getTime()) throw unauthorized()
```

If we set `tokens_valid_after = now()`, all the sessions of that user stop
immediately, on all devices. This one-line write serves suspend, ban, "log out
everywhere" and compromise response. Also, the product requirements require
auto-suspend when a user goes above the report-rate threshold. Auto-suspend
needs exactly this.

The cost is one column, ~3 lines of middleware, and approximately one hour.
Firebase's `verifyIdToken(token, checkRevoked: true)` does a similar thing. But
it makes a network call to Google on each request. Our column is a local check
on a row that the API already loaded.

## Consequences

- The API rejects a request for two reasons: an invalid signature, or an `iat`
  older than `tokens_valid_after`.
- We must configure CORS on `apps/api` for the web origin.
- The ID token is in JavaScript. Thus, it is XSS-reachable. The mitigations are
  a strict Content-Security-Policy, the in-memory token storage of the Firebase
  SDK (not `localStorage`), the 1-hour expiry, and the instant revocation above.
  All mobile apps accept this same exposure.
- Public pages must not require identity. Thus, the API needs unauthenticated
  read endpoints for listings and landing content.

## Alternatives rejected

- **Everything client-side**: This is the simplest option, with one auth path.
  But it loses the organic search traffic that the product depends on.
- **Everything server-side with session cookies**: This gives the best XSS
  protection and the best first paint. But it is web-only. Thus, we would have
  two auth paths forever.

## Revisit when

The XSS risk becomes unacceptable (for example, after a real incident). Then we
can add a cookie layer *in addition to* Bearer, and not remove Bearer.
