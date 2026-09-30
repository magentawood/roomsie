# ADR 0013 — The CI gate and testing baseline

**Status:** Accepted · **Date:** 2026-09-14 · **Deciders:** Yash

## Context

Four developers at roughly two hours a day. Two constraints follow:

1. **CI must finish in about five minutes.** Past that, people stop waiting for
   it and start merging on hope.
2. **Every test is an hour not spent on features**, out of roughly 200 total.

So the question is not how much testing is good in the abstract — it is where
the expensive bugs actually live in this product.

For femmeflats they concentrate in a small number of server-side rules, each
deterministic, each genuinely hard to verify by hand, each severe when wrong:

| Rule | Failure mode |
|---|---|
| Verification gates participation | An unverified account initiates chat — a product-promise failure, not a bug |
| `tokens_valid_after` revocation (ADR 0007) | A suspended account stays logged in |
| Chat rate limits | The daily new-conversation cap silently does nothing |
| Queue seen-exclusion and reject suppression | Users cycle the same faces; the product feels broken |

A snapshot test on a card component, by contrast, is near-worthless while the
design still moves weekly.

## Decision

Every pull request runs:

| Check | Why |
|---|---|
| Typecheck | Whole monorepo, strict |
| Lint | Shared config from `packages/config` |
| `turbo build` | Both apps actually build |
| **Unit tests** | Written alongside the code as it is authored, not as a later phase |
| **API integration tests** | Vitest against a disposable Postgres, concentrated on the four rule areas above |
| **Generated-file check** | Re-run the token generator; fail if `theme.css` differs from what is committed (ADR 0011) |
| `check-tokens.mjs` | Components use semantic tokens only — no hex, no arbitrary values |
| `gitleaks` | Catches a secret paste before it becomes permanent git history |

Unit tests are a **coding-time habit**, not a separate task: whoever writes the
code writes its tests in the same pass, and CI runs the whole suite on every
merge check.

## Rationale

Integration tests over the rule areas give the highest confidence per hour
spent, because those rules are exactly what cannot be eyeballed and exactly what
is unacceptable to get wrong on a safety product. Running them against a real
disposable Postgres rather than mocks matters here — the queue rules are largely
SQL, so a mocked database would test nothing that ships.

Keeping frontend unit tests to what developers write naturally, rather than
mandating component coverage, avoids paying maintenance on assertions about a
UI that is still changing.

## Consequences

- CI needs a disposable Postgres — a container in CI, or a database branch.
- The five-minute budget is a real constraint: if the suite outgrows it,
  parallelise or split rather than letting people learn to ignore CI.
- Turborepo remote caching (ADR 0010) helps keep build time off the critical path.
- Test data setup for the queue rules is non-trivial and should be a shared
  fixture from the start, not copy-pasted per test.

## Deferred

**Playwright end-to-end tests on critical paths** — signup → verification →
swipe → first message. Genuinely valuable, and it catches integration breaks
nothing else sees. Deferred because E2E is slow to write and brittle while the
UI moves weekly: realistically 15–20 hours now plus ongoing maintenance, against
a 200-hour launch budget.

Revisit once the UI has stabilised, ideally before the first release where a
regression would reach real users.

## Alternatives rejected

- **Typecheck, lint and build only.** A ~90-second gate and zero test hours, but
  nothing would verify that unverified users cannot chat or that revocation
  works. Those failures would be discovered by users, on a safety platform.
- **Full pyramid from day one.** Highest confidence, but roughly 40+ hours out
  of 200 and a CI run people would start skipping.
