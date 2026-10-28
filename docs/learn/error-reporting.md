# Error reporting

**In one line:** each error that a user gets, in the browser or in the API, goes to Sentry through one `reportError`, with the place in the code and the `users.id`, and with no message text, token, IP address or phone number.

## What it is

- **Sentry** is a service that collects errors, groups the same error together, and shows how often it occurs and to how many people. The Sentry free tier has one login.
- The **DSN** is the address of a Sentry project. It is public, because the browser needs it ([ADR-0016](../decisions/0016-credentials-and-secrets.md)). The web and the API each have one.
- An **event** is one error report: the error, its stack trace, the place in the code (`where`), the person and the browser or the server.
- **Scrubbing** removes personal data from an event before it leaves our code.

## How it fits our project

```
browser crash ─┐                                         ┌─▶ /monitoring (our domain) ─▶ Sentry (web project)
page crash ────┼─▶ reportError(err, { where, userId }) ──┤
API 5xx ───────┤        └─ scrubEvent (beforeSend)       └─▶ Sentry (API project)
quiet failure ─┘
```

- **One wrapper:** `packages/config/src/report.ts` has `reportError`, `setReportUser` and `privacyOptions`, which holds `scrubEvent`. Only this file and the start files of each app import Sentry ([standards](../standards/_index.md)). A move to GlitchTip or Crashlytics changes these files only ([ADR-0014](../decisions/0014-error-tracking.md)).
- **The API:** `src/sentry.ts` starts Sentry with `SENTRY_DSN_API`. The error handler reports each 5xx with the route, for example `POST /v1/me/profile/upload-urls`, and the `users.id`. A 4xx is the fault of the request, so it goes nowhere. The quiet failures (alerts, analytics, realtime, the deletes of photos and ID files, the face match) also use `reportError`, and it writes their log line.
- **The web:** `instrumentation-client.ts` starts Sentry in the browser, and `instrumentation.ts` starts it on the server, with `NEXT_PUBLIC_SENTRY_DSN`. An error of a server render goes to `reportError` with its route. The browser sends its events to `/monitoring` on our domain, and Next sends them on to Sentry. Thus, an ad blocker does not drop them, and the policy needs no new host. `app/error.tsx` and `app/global-error.tsx` report a crash of a page and show "Something went wrong" with "Try again".
- **The person:** when `/v1/me` loads, the browser puts the `users.id` on each event. At sign-out, it removes it.
- **The violations of the [Content-Security-Policy](content-security-policy.md)** go from the browser straight to the security address of the web project, so `scrubEvent` does not see them.
- **No DSN, no Sentry:** local work and the tests send nothing. The API tests start Sentry with a transport that keeps the events in memory.

## The choice we made

- The Sentry free tier for launch, not GlitchTip ([ADR-0014](../decisions/0014-error-tracking.md)).
- No source maps, so the browser stack traces stay minified. Their upload needs a secret in the build of the web ([ADR-0014](../decisions/0014-error-tracking.md)).
- The `users.id` on each event. Sentry keeps an event for 30 days ([ADR-0014](../decisions/0014-error-tracking.md)).

## Gotchas

- Sentry 11 collects request bodies, headers, cookies and local variables by default. `privacyOptions` turns them off in each app. Keep it in each `Sentry.init`.
- A failed query of Drizzle puts its values, for example the text of a message, in its message. `scrubEvent` cuts them.
- The automatic capture of Fastify is off in the API. If it is on, Sentry drops our event as a copy of its own, and the event has no `where` and no person.
- A React crash does not reach Sentry by itself, because React catches it. The error pages report it. An error with a `digest` came from the server, which reported it already.
- All `@sentry/*` packages must have the same version. Two versions keep two lists of settings, and the person or the scrubbing goes missing.
- In the settings of each Sentry project, turn on "Prevent Storing of IP Addresses". It is the only guard for the violation reports, and a second guard for the events.

## Tickets

- T-07: [#178](https://github.com/magentawood/roomsie/pull/178), 2026-10-28. `reportError`, Sentry in the web and the API, the error pages and the reports of the policy.
