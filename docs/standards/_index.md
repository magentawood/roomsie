# Coding standards

These files hold the code rules for roomsie. Each rule comes from a decision record in [docs/decisions/](../decisions/README.md). The record holds the full reasons. The rule holds one line of reason only.

Before you write or review code, read this file and the file for your area.

## How to read a rule

Each rule is one line:

`- <rule>. Why: <one line>. ([ADR-0004](../decisions/0004-api-stack-typescript-fastify.md))`

- The link at the end is the source of the rule. Cite an ADR as `ADR-0004`, a product decision as `PD7a`, and a schema phase as `S1` to `S7`.
- `[tool]`: a record names a tool check for the rule. Until the tool runs, reviewers check the rule.
- `[tool: planned T-nn]`: task T-nn sets up the tool check.
- `OPEN`: the rule is not settled. Reviewers do not enforce an OPEN rule.

## How to add a rule

Add a rule only in one of these two conditions:

1. A decision record requires the rule.
2. Review finds the same mistake two times.

- Review writes each mistake that no rule covers in [_candidates.md](_candidates.md).
- At the second time, move the mistake into the correct file as a rule, with `Why:` and a source link. Write this in the Progress section of the PR.
- When a record changes, change its rules in the same PR. The most recent record wins.
- Keep each file below approximately 40 rules and 1,200 words.

## Files

| File | Area |
|---|---|
| [api.md](api.md) | `apps/api`: Fastify, Zod, auth, storage, errors, limits and the assistant |
| [database.md](database.md) | Drizzle, the schema, migrations, ids and stored data |
| [web.md](web.md) | `apps/web`: Next.js, React, TanStack Query and auth in the browser |
| [`styling.md`](styling.md) | Tailwind v4, theme tokens and the Untitled UI pipeline |
| [testing.md](testing.md) | The CI gate, tests and assistant evals |
| [_candidates.md](_candidates.md) | The log of mistakes that no rule covers |

## Rules for all code

These rules apply to all code.

### Boundaries

- Clients never connect to the database. Why: the business rules must stay in one place for three clients. ([ADR-0002](../decisions/0002-api-boundary.md))
- All business logic is in `apps/api`. Why: a network boundary stops a shortcut from web code to the database. ([ADR-0002](../decisions/0002-api-boundary.md), [ADR-0003](../decisions/0003-api-as-separate-service.md))
- `users.id` is the only identity key. The Firebase UID is only in `users.auth_provider_id`, and only the login path reads it. Why: a change of auth provider stays a one-column backfill. ([ADR-0005](../decisions/0005-managed-platform-split.md))
- A package imports only the packages that it declares [tool]. Why: a hoisted import works on a laptop and fails in CI. ([ADR-0010](../decisions/0010-monorepo-tooling.md))
- Apps share code only through `packages/`. An app never imports from a different app. Why: each app builds and deploys independently. ([ADR-0003](../decisions/0003-api-as-separate-service.md), [ADR-0010](../decisions/0010-monorepo-tooling.md))
- Error reports and model calls each go through one internal module. Application code never imports those SDKs. Why: a vendor change then touches one module. ([ADR-0014](../decisions/0014-error-tracking.md), [PD7](../decisions/pd-07-models.md))

### Credentials

- Secrets exist only in the environment of `apps/api`. They are never in `apps/web`: not in a config file, an env var or an import. Why: web code goes to the browser. ([ADR-0016](../decisions/0016-credentials-and-secrets.md))
- Never put a secret in a `NEXT_PUBLIC_*` env var. Why: the build compiles these values into the browser bundle. ([ADR-0016](../decisions/0016-credentials-and-secrets.md))
- The Supabase `service_role` key never leaves `apps/api`. Why: the key bypasses Row Level Security, so a leak exposes all data. ([ADR-0016](../decisions/0016-credentials-and-secrets.md))
- Deploy tokens are only in the CI secret store. Why: a deploy token gives control of production. ([ADR-0016](../decisions/0016-credentials-and-secrets.md))
- Git ignores `.env*`. A committed `.env.example` documents each key with dummy values. Why: each key has a record, and no secret goes into git. ([ADR-0016](../decisions/0016-credentials-and-secrets.md))
- Database connection details are only in environment settings. Why: a move of a database is then a transfer, not a code change. ([PD13](../decisions/pd-13-databases-and-backups.md))
- Before each PR, run `pnpm secrets`. CI also runs `gitleaks` on each PR [tool]. Why: it finds a pasted secret before the secret becomes permanent history. ([ADR-0016](../decisions/0016-credentials-and-secrets.md), [ADR-0013](../decisions/0013-ci-gate-and-testing.md))

### Privacy

- Never log a token. API logs redact the `Authorization` header. Why: a token in a log is a password in a log. ([ADR-0016](../decisions/0016-credentials-and-secrets.md))
- `beforeSend` removes personal data from each error report: message bodies, phone numbers, accurate locations and the `Authorization` header. Why: the error data can go to a vendor. ([ADR-0014](../decisions/0014-error-tracking.md))
- Events that reference `users.id` are personal data in the scope of the DPDP Act. Account deletion purges or pseudonymises them. Why: we own the events, so the deletion duty is ours. ([ADR-0012](../decisions/0012-analytics-event-store.md))
- Account deletion also purges Form B and propagates to each model provider that got the text of the user. Why: DPDP obligations follow the data. ([PD7a](../decisions/pd-07a-agent-architecture.md), [PD7](../decisions/pd-07-models.md))
