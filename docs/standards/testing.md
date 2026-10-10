# Testing standards

These rules apply to the CI gate, tests and assistant evals. The rules in [_index.md](_index.md) also apply.

## The CI gate

- Each PR runs typecheck, lint, build and `gitleaks` [tool]. Why: these checks find the cheap mistakes before a merge. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- Each PR also runs unit tests, API integration tests and `check-tokens.mjs` [tool]. The generated-file check starts when the token pipeline ships [tool]. Why: the rule areas need tests, and generated files and tokens must stay correct. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- Typecheck is strict across the full monorepo. Lint uses the shared config from `packages/config`. Why: all packages obey the same checks. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- CI finishes in approximately five minutes. If the suite becomes too large, run it in parallel or divide it. Why: after five minutes, people merge on hope. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))

## Tests

- The person who writes the code writes its tests in the same pass. Why: tests in a subsequent phase do not occur. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- Write API integration tests for these rule areas when each area ships. Why: each rule is hard to check by hand and dangerous when it is incorrect. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
  - Verification gates participation.
  - `tokens_valid_after` revocation.
  - Chat rate limits.
  - Queue seen-exclusion and reject suppression.
- Test the pre-login limits: the turn cap, the rate limits, and the change to chips at the spend ceiling. Why: the abuse test is a go/no-go check. ([PD9](../decisions/pd-09-pre-login-limits.md), [PD11](../decisions/pd-11-launch.md))
- Run API integration tests with Vitest against a disposable Postgres database. Never mock the database. Why: the queue rules are mostly SQL, so a mock tests nothing that ships. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- Put the test data for the queue rules in a shared fixture. Do not copy it into each test. Why: the setup is not simple. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- Do not require or add snapshot tests on UI components while the design changes. Do not require component coverage. Why: assertions on a UI that changes each week cost time and find nothing. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- Do not add Playwright end-to-end tests until the UI is stable. Why: they are slow to write and brittle while the UI changes. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))

## Assistant evals

- Each assistant handler has its own eval score. Why: each handler has one job, so its score is easy to read. ([PD7a](../decisions/pd-07a-agent-architecture.md))
- The eval set has 200 to 300 utterances in the actual language mix. Give Marathi a heavy weight. Test at 25%, 50% and 75% code-mix. Why: Marathi, not Hinglish, is the language risk. ([PD7](../decisions/pd-07-models.md))
- Measure register match and abstention. A model that never abstains fails. Why: if you do not measure these, they become worse and nobody sees it. ([PD7](../decisions/pd-07-models.md))
- Test each scope band with its own pass condition, in Hindi, Marathi and Hinglish too. Why: a redirect that works only in English is not a redirect. ([PD10](../decisions/pd-10-scope-bands.md))
- Keep an eval result record before launch. Extraction must get 7 or more in 10 slots correct, and must mark vague sentences `unclear`. Why: these are go/no-go checks. ([PD11](../decisions/pd-11-launch.md))
- Test a new router model on the same eval set before it goes live. Why: the router decides the cost and the scope of each turn. ([PD7a](../decisions/pd-07a-agent-architecture.md))
