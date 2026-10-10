# ADR 0014 — Error tracking and observability

**Status:** Accepted · **Date:** 2026-09-14 · **Deciders:** Yash

## Context

`apps/web` runs on Vercel, and `apps/api` runs on Lightsail (ADR 0009). The
authenticated app is client-rendered (ADR 0007). The budget is tight:
approximately $50–80/month for all infrastructure. Thus, a $26/month line item
is a third of the bill.

**Vercel's own logging does not cover this system.** It has two structural gaps:

- It sees only `apps/web`. The business logic is in the API on Lightsail, and Vercel
  logging cannot see the API.
- It logs only what runs on Vercel's servers. Thus, **browser errors do not
  appear at all**. These errors are most of the breakage that users see.

Vercel logging does show server and SSR errors in `apps/web`. The Sentry SDK
also shows them. Vercel logging also has no grouping, no alerting, no source-map symbolication
and no release correlation. Its retention is short and depends on the plan.

> [!example]- Examples
> - Errors that never touch a Vercel server: a React crash in the swipe stack, a fetch that fails, or a null reference in chat.

## Decision

**In one line:** `apps/web` and `apps/api` send errors through the Sentry SDK to self-hosted GlitchTip, behind one `reportError` wrapper, until Firebase Crashlytics for web reaches GA.

**Instrument with the Sentry SDK. Point the DSN at self-hosted GlitchTip.**

| | |
|---|---|
| Instrumentation | Sentry SDK in `apps/web` and `apps/api` |
| Destination now | **Self-hosted GlitchTip** on Fly, ~$5/month |
| Destination later | **Firebase Crashlytics for web, when it reaches GA.** This is the preferred destination. The fallback is Sentry paid. |
| Mobile (month 4) | **Firebase Crashlytics**: free, best in class, and we already use Firebase |
| Uptime | A hosted free-tier monitor of the single API machine. It does not run on the API host. |

GlitchTip is protocol-compatible with the Sentry SDK. Thus, **where errors go is
a DSN, not a vendor commitment.**

### Planned migration to Crashlytics for web

**Stated intent: when Firebase Crashlytics for web reaches general availability,
we move to it.** The reasons are:

- It is free.
- We already use Firebase (ADR 0005).
- Crashlytics will handle Android and iOS anyway.
- It uses Google Cloud's Observability Suite as its base. Thus, it puts client and
  server errors in one place.

This move would put all three clients on one free tool, and retire the
GlitchTip instance that we operate.

⚠️ **This migration is not the one-variable switch.** GlitchTip → Sentry is a
DSN change. But Crashlytics does **not** implement the Sentry protocol. It is
the Firebase JS SDK, a fully different integration.

**Mitigation. Build it from the start:**

- A thin internal module wraps error reporting: a single
  `reportError(err, context)`, with breadcrumb and user-context helpers.
- It is in `packages/config` or in a small shared package.
- Application code calls only this module. Then, a change of the SDK that the
  module wraps touches one file for each app, not all call sites.

Without this wrapper, `Sentry.captureException` goes into many places across the
codebase. Then the migration that we explicitly plan becomes the type of rework
that this project consistently chose to avoid.

## Rationale

- **We instrument with the Sentry SDK in all cases.** This is what makes the
  decision reversible. The SDK is the de-facto standard, and it has first-class
  Next.js and Node integrations.
- **GlitchTip, not the Sentry free tier.** The limit that stops us on the free
  tier is **1 user**, not the 5,000-error cap. A shared login conflicts with the
  rules in `docs/security/credentials.md`. GlitchTip gives unlimited users and
  events. Also, error data stays in our own infrastructure. This agrees with the
  sovereignty reasoning in ADR 0012.
- **Crashlytics for mobile, not Sentry.** There is no reason to pay for mobile
  error tracking.
- **We considered Crashlytics for web, and rejected it on timing.** Its
  announcement was at Google I/O 2026. But it is **private preview, not
  generally available**. Thus, it cannot carry a launch that is weeks away.

## Consequences

- **PII scrubbing through `beforeSend` is mandatory, not optional.** Error
  reports must contain no message bodies, no phone numbers and no accurate
  locations. Redact `Authorization` as `docs/security/credentials.md` specifies.
  This is less urgent while the data stays on our own GlitchTip. But it must be
  correct before the DSN ever points at a vendor.
- ⚠️ **Error tracking runs on the infrastructure that it monitors.** If the API
  host or region has a problem, GlitchTip can be down exactly when we need it.
  We accept this knowingly. Hosted Sentry would not have this weakness. This is
  one more reason why the DSN switch must stay trivial.
- GlitchTip is a service that we operate. This is in mild tension with the
  rent-don't-run posture of ADR 0001. We accept this tension, because the
  alternative costs a third of the infrastructure budget.
- GlitchTip needs its own Postgres database. The analytics instance (ADR 0012)
  is a reasonable host for it, because the analytics instance and GlitchTip are
  not on the transactional path. At setup, verify the exact dependencies of
  GlitchTip.
- Add the Sentry SDK integrations to the two apps from the start. If not, we simply
  lose the errors that occur before instrumentation.

## Alternatives rejected

- **Vercel logs only.** $0 and zero setup. But it sees no browser errors and
  no part of the API, and it has no grouping or alerting. On a product where broken
  chat is a safety issue, it is not acceptable to learn about breakage from users.
- **Sentry free tier.** The full feature set at $0, but 1 user against a team of
  four.
- **Sentry Team at $26/month.** This is the best product, and the destination
  that we expect to reach. We deferred it only because of the budget. We did not reject it. A change
  to one variable moves us to it.

## Revisit when

- **Crashlytics for web reaches GA**: migrate, as the stated intent above says.
  Monitor the Firebase release notes and the `firebase-js-sdk` RFC.
- The burden to operate GlitchTip becomes more than $26/month, or error
  volume becomes too large for the self-hosted instance. In these cases, point
  the DSN at Sentry paid as an interim step.
