# ADR 0007 — Hybrid rendering, Bearer tokens, and instant revocation

**Status:** Accepted · **Date:** 2026-09-10 · **Deciders:** Yash

## Context

`apps/web` must serve two very different kinds of page. Landing and property
listings are the organic-search surface (per the product requirements) and need to be
crawlable. The authenticated app — stack, liked, chat, settings — has no SEO
value at all; nobody searches for someone's chat inbox.

Separately, identity has to travel to `apps/api` in a way that Android and iOS
can reuse unchanged (ADR 0002).

## Decision

**1. Rendering is split by whether the page needs SEO.**

| Surface | Rendering | Identity |
|---|---|---|
| Landing, listing browse, listing detail | Server-rendered by Next, calling `apps/api` server-to-server | None — public data |
| Stack, liked, chat, settings | Client-rendered in the browser | Firebase ID token in `Authorization: Bearer` |

**2. `Authorization: Bearer <Firebase ID token>` is the single authentication
mechanism**, identical on web, Android and iOS. No session cookies.

**3. `users.tokens_valid_after timestamptz not null default now()` ships in the
first migration**, with the check in auth middleware from day one.

## Rationale

**Why Bearer rather than session cookies.** A cookie path would be web-only —
mobile clients cannot use cookies — leaving two authentication code paths to
build, test and keep in sync forever. That is exactly the divergence ADR 0002
exists to prevent. With Bearer, the API has one verification path for all three
clients.

**How verification works.** The Firebase ID token is a JWT signed by Google with
RS256. The API caches Google's public keys and verifies the signature locally —
no database lookup, no call to Firebase.

Firebase issues two tokens per session:

| Token | Lifetime | Who sees it |
|---|---|---|
| ID token (JWT) | ~1 hour, **not configurable** | Sent to our API on every request |
| Refresh token (opaque) | Long-lived | Stays on device. Our API never sees it. |

The platform SDK silently exchanges the refresh token for a fresh ID token
before expiry.

**Why we do not try to shorten the 1-hour TTL.** It is fixed by Firebase and
cannot be configured — only session cookies have an adjustable lifetime (5
minutes to 2 weeks), and we rejected cookies above.

More importantly, it is the wrong lever. The threat a short TTL addresses is a
stolen token, and tokens are stolen via XSS. An attacker who can run JavaScript
on the page harvests fresh tokens continuously for as long as the tab is open,
or takes the refresh token and mints their own. A 5-minute TTL barely
inconveniences that attacker while costing 12× the refresh traffic and a class
of "expired mid-request" retry edge cases.

**What we build instead: instant revocation.** Because we own the `users` table
(ADR 0005 Rule 1), we add one column and one check:

```ts
// after verifying the JWT signature
if (decoded.iat * 1000 < user.tokens_valid_after.getTime()) throw unauthorized()
```

Setting `tokens_valid_after = now()` kills every session that user holds, on
every device, immediately. This serves suspend, ban, "log out everywhere" and
compromise response with the same one-line write — and the product requirements call for
auto-suspend on crossing the report-rate threshold, which needs exactly this.

Cost: one column, ~3 lines of middleware, roughly an hour. Firebase's
`verifyIdToken(token, checkRevoked: true)` achieves something similar but makes
a network call to Google on every request; our column is a local check on a row
we have already loaded.

## Consequences

- The API rejects requests on two grounds: invalid signature, and `iat` older
  than `tokens_valid_after`.
- CORS must be configured on `apps/api` for the web origin.
- The ID token lives in JavaScript and is therefore XSS-reachable. Mitigations:
  strict Content-Security-Policy, the Firebase SDK's in-memory token storage
  (not `localStorage`), 1-hour expiry, and instant revocation above. This is the
  same exposure every mobile app accepts.
- Public pages must not require identity, so the API needs unauthenticated read
  endpoints for listings and landing content.

## Alternatives rejected

- **Everything client-side** — simplest, one auth path, but forfeits the organic
  search traffic the product depends on.
- **Everything server-side with session cookies** — best XSS protection and
  first paint, but web-only, so two auth paths forever.

## Revisit when

XSS risk becomes unacceptable (e.g. after a real incident), at which point a
cookie layer can be added *in addition to* Bearer without removing it.
