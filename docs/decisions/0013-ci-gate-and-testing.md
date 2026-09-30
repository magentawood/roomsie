# ADR 0013 — The CI gate and testing baseline

**Status:** Accepted · **Date:** 2026-09-14 · **Deciders:** Yash

## Context

Four developers work approximately two hours a day. From this, two constraints
follow:

1. **CI must finish in about five minutes.** After that time, people do not wait
   for CI. They start to merge on hope.
2. **Each test is an hour that we do not spend on features.** The total is
   approximately 200 hours.

Thus, the question is where the expensive bugs actually are in this product.
For femmeflats, these bugs concentrate in a small number of server-side rules.
Each rule is deterministic, genuinely hard to verify by hand, and severe when it
is incorrect:

| Rule | Failure mode |
|---|---|
| Verification gates participation | An unverified account starts a chat. This is a failure of the product promise, not a bug. |
| `tokens_valid_after` revocation (ADR 0007) | A suspended account stays logged in |
| Chat rate limits | The daily new-conversation cap silently does nothing |
| Queue seen-exclusion and reject suppression | Users see the same faces again and again. The product feels broken. |

But a snapshot test on a card component is almost worthless while the design
changes each week.

## Decision

Each pull request runs these checks:

| Check | Why |
|---|---|
| Typecheck | All of the monorepo, strict |
| Lint | Shared config from `packages/config` |
| `turbo build` | Makes sure that the two apps actually build |
| **Unit tests** | We write them with the code, at the time that we write the code, not in a subsequent phase |
| **API integration tests** | Vitest against a disposable Postgres. They concentrate on the four rule areas above. |
| **Generated-file check** | Run the token generator again. Fail if `theme.css` is different from the committed file (ADR 0011). |
| `check-tokens.mjs` | Components use only semantic tokens: no hex and no arbitrary values |
| `gitleaks` | Finds a secret paste before it becomes permanent git history |

The person who writes the code writes its tests in the same pass. CI runs the
full suite on each merge check.

## Rationale

- **Integration tests on the rule areas give the highest confidence for each
  hour that we spend.** These rules are exactly the items that a person cannot
  eyeball, and exactly the items where an error is unacceptable on a safety
  product.
- **Real disposable Postgres, not mocks.** The queue rules are largely SQL.
  Thus, a mocked database would test nothing that ships.
- **Frontend unit tests stay at the tests that developers write naturally.** We
  do not mandate component coverage. Thus, we do not pay maintenance on
  assertions about a UI that is not stable.

## Consequences

- CI needs a disposable Postgres: a container in CI, or a database branch.
- The five-minute budget is a real constraint. If the suite becomes too large
  for it, parallelise or divide the suite. Do not let people learn to ignore CI.
- Turborepo remote caching (ADR 0010) helps to keep build time off the critical path.
- Test data setup for the queue rules is not simple. It should be a shared
  fixture from the start. Do not copy and paste it for each test.

## Deferred

**Playwright end-to-end tests on critical paths** — signup → verification →
swipe → first message.

- These tests are genuinely valuable. They find integration breaks that nothing
  else sees.
- We deferred them because E2E tests are slow to write and brittle while the UI
  changes each week. The realistic cost is 15–20 hours at this time, plus
  continued maintenance.
- Revisit these tests after the UI becomes stable. Ideally, do this before the
  first release where a regression would reach real users.

## Alternatives rejected

- **Typecheck, lint and build only.** This is a ~90-second gate with zero test
  hours. But nothing would verify that unverified users cannot chat, or that
  revocation works. Users would find those failures, on a safety platform.
- **Full pyramid from day one.** This gives the highest confidence. But it costs
  approximately 40+ hours out of 200, and people would start to skip the CI run.
