# ADR 0014 — Error tracking and observability

**Status:** Accepted · **Date:** 2026-09-14 · **Deciders:** Yash

## Context

`apps/web` runs on Vercel, `apps/api` on Fly (ADR 0009). The authenticated app
is client-rendered (ADR 0007). Budget is tight — roughly $50–80/month total
infrastructure — so a $26/month line item is a third of the bill.

**Vercel's own logging does not cover this system.** Two structural gaps:

- It sees only `apps/web`. The API on Fly — where the business logic lives — is
  invisible to it.
- It logs what runs on Vercel's servers. A React crash in the swipe stack, a
  failed fetch, a null reference in chat never touches a Vercel server, so
  **browser errors do not appear at all** — and that is most user-facing breakage.

It also has no grouping, no alerting, no source-map symbolication, no release
correlation, and short plan-dependent retention.

## Decision

**Instrument with the Sentry SDK. Point the DSN at self-hosted GlitchTip.**

| | |
|---|---|
| Instrumentation | Sentry SDK in `apps/web` and `apps/api` |
| Destination now | **Self-hosted GlitchTip** on Fly, ~$5/month |
| Destination later | **Firebase Crashlytics for web, once it reaches GA** — preferred. Sentry paid as the fallback |
| Mobile (month 4) | **Firebase Crashlytics** — free, best in class, already on Firebase |
| Uptime | Free-tier monitor on the single Fly machine |

GlitchTip is protocol-compatible with the Sentry SDK, so **where errors go is a
DSN, not a vendor commitment.** We are choosing a URL, not locking in.

### Planned migration to Crashlytics for web

**Stated intent: when Firebase Crashlytics for web reaches general availability,
we move to it.** Rationale: it is free, we are already on Firebase (ADR 0005),
Crashlytics will be handling Android and iOS anyway, and being built on Google
Cloud's Observability Suite it puts client and server errors in one place. That
would consolidate all three clients onto one free tool and retire the GlitchTip
instance we operate.

⚠️ **This migration is not the one-variable switch.** GlitchTip implements the
Sentry protocol, so GlitchTip → Sentry is a DSN change. Crashlytics does **not**
— it is the Firebase JS SDK, a different integration entirely.

**Mitigation, to be built from the start:** error reporting is wrapped in a thin
internal module — a single `reportError(err, context)` (plus breadcrumb and
user-context helpers) in `packages/config` or a small shared package. Application
code calls only that. Swapping the underlying SDK then touches one file per app
rather than every call site.

Without that wrapper, `Sentry.captureException` ends up scattered across the
codebase and the migration we are explicitly planning for becomes the kind of
rework this project has consistently chosen to avoid.

## Rationale

Instrumenting with the Sentry SDK regardless is what makes this reversible. The
SDK is the de-facto standard, has first-class Next.js and Node integrations, and
its protocol is what GlitchTip implements.

GlitchTip over Sentry's free tier: the free tier's binding limit is **1 user**,
not the 5,000-error cap, and a shared login conflicts with the rules in
`docs/security/credentials.md`. GlitchTip gives unlimited users and events for
roughly $5/month, and error data stays inside our own infrastructure —
consistent with the sovereignty reasoning in ADR 0012.

**Crashlytics for mobile, not Sentry.** Crashlytics is free, best in class for
native crash reporting, and we are already on Firebase (ADR 0005). There is no
reason to pay for mobile error tracking.

**Crashlytics for web was considered and rejected on timing.** Announced at
Google I/O 2026 and built on Google Cloud's Observability Suite, but it is
**private preview, not generally available** — it cannot carry a launch weeks
away. Worth revisiting when it reaches GA, since it would be free and would put
client and server errors in one place.

## Consequences

- **PII scrubbing via `beforeSend` is mandatory, not optional.** No message
  bodies, no phone numbers, no precise locations; `Authorization` redacted per
  `docs/security/credentials.md`. Less acute while data stays on our own
  GlitchTip, but it must be correct before the DSN ever points at a vendor.
- ⚠️ **Error tracking runs on the infrastructure it monitors.** If the Fly
  account or region has a problem, GlitchTip may be down exactly when it is
  needed. Accepted knowingly; hosted Sentry would not have this weakness, and it
  is one more reason the DSN switch must stay trivial.
- GlitchTip is a service we operate — mild tension with ADR 0001's
  rent-don't-run posture, accepted because the alternative costs a third of the
  infrastructure budget.
- It needs its own Postgres database. The analytics instance (ADR 0012) is a
  reasonable host, since neither is on the transactional path. Verify GlitchTip's
  exact dependencies at setup.
- Sentry SDK integrations must be added to both apps from the start, or errors
  before instrumentation are simply lost.

## Alternatives rejected

- **Vercel logs only.** $0 and zero setup, but blind to browser errors and to the
  entire API, with no grouping or alerting. On a product where broken chat is a
  safety issue, learning about breakage from users is not acceptable.
- **Sentry free tier.** Full feature set at $0, but 1 user against a team of four.
- **Sentry Team at $26/month.** The best product, and the destination we expect
  to reach — deferred purely on budget, and reachable by changing one variable.

## Revisit when

- **Crashlytics for web reaches GA** — migrate, per the stated intent above.
  Track the Firebase release notes and the `firebase-js-sdk` RFC.
- GlitchTip's operational burden outweighs $26/month, or error volume outgrows
  the self-hosted instance — in which case point the DSN at Sentry paid as an
  interim step.
