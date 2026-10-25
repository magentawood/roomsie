# Sign-in and tokens

**In one line:** the web signs in with Google through Firebase. The API checks the ID token locally and loads the `users` row.

## What it is

- **Firebase Authentication** does the Google sign-in for us. After a sign-in, the browser has two tokens.
- The **ID token** is a JWT: a short signed text that tells who the user is. Google signs it, and it is valid for one hour.
- The **refresh token** stays in the browser. The Firebase SDK uses it to get a new ID token before the old one expires.
- To **verify** a token is to check the signature with the public keys of Google, and then check the expiry, the issuer and the audience. The **audience** is our Firebase project ID.

## How it fits our project

```
browser ── Google popup ──▶ Firebase ──▶ ID token (in memory)
   │
   └── GET /v1/me   Authorization: Bearer <ID token>
          │
          API: verify with the cached Google keys
             ─▶ find the users row by the Firebase uid, or make it
             ─▶ auth_time before tokens_valid_after?  401
             ─▶ status not active?               403
             ─▶ 200 { id, status }
```

- **The web:** `apps/web/app/firebase.ts` starts Firebase in the browser on first use. The page calls `getIdToken()` for each call to the API. Our code never stores the token.
- **The API:** `apps/api/src/auth.ts` holds `requireUser`. A signed-in route adds it as its `preHandler`. Then the route reads `req.user`.
- **Settings:** the API needs `FIREBASE_PROJECT_ID` and `DATABASE_URL`. The web needs four `NEXT_PUBLIC_FIREBASE_*` values. These are public ([ADR-0016](../decisions/0016-credentials-and-secrets.md)).
- **Local test:** put the settings in `apps/api/.env` and `apps/web/.env.local`. Then run `pnpm dev`. Firebase must allow `localhost` in its authorized domains.

## The choice we made

- A Bearer token is the only auth mechanism, for the web and for mobile ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md)).
- The `jose` library verifies the token locally. It fetches the keys of Google one time and caches them. The tests sign their own tokens with a test key ([#131](https://github.com/magentawood/roomsie/pull/131)).
- Firebase keeps its session in the browser, so a user stays signed in after a reload ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md)).
- One write to `tokens_valid_after` stops all sessions of a user. The status check stops a suspended user, also with a new token ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md)).

## Gotchas

- Compare `auth_time`, not `iat`. Firebase refreshes the ID token each hour with a new `iat`, so an `iat` check lets a revoked session back in.
- The first sign-in makes the `users` row with `tokens_valid_after` at the `auth_time` of its token. With the default `now()`, the first token gets 401.
- `auth_time` is in seconds, and `tokens_valid_after` is in milliseconds. A sign-in in the same second as a revocation gets 401. The next sign-in works.
- If the API cannot get the keys of Google, it gives 500, not 401. A 401 tells the user to sign in again, and that does not help.
- `next build` runs without the Firebase settings, because Firebase starts only in the browser.
- A new domain must be in the authorized domains of Firebase. If not, the popup gives `auth/unauthorized-domain`.

## Tickets

- T-05: [#131](https://github.com/magentawood/roomsie/pull/131), 2026-10-25. Google sign-in on the web, the token check in the API, and `GET /v1/me`.
