# Testing standards

These rules apply to the CI gate, tests and assistant evals. The rules in [_index.md](_index.md) also apply.

## The CI gate

- Each PR runs typecheck, lint, build and `gitleaks` [tool]. Why: these checks find the cheap mistakes before a merge. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- Each PR also runs unit tests, API integration tests and `check-tokens.mjs` [tool]. The generated-file check starts when the token pipeline ships [tool]. Why: the rule areas need tests, and generated files and tokens must stay correct. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- Typecheck is strict across the full monorepo. Lint uses the shared config from `packages/config`. Why: all packages obey the same checks. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- CI sets each database address in an `env:` value, not in a command or a code default. Why: each step then uses the same database, and the address has one home. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- CI finishes in approximately five minutes. If the suite becomes too large, run it in parallel or divide it. Why: after five minutes, people merge on hope. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))

## Tests

- The person who writes the code writes its tests in the same pass. Why: tests in a subsequent phase do not occur. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- Write API integration tests for these rule areas when each area ships. Why: each rule is hard to check by hand and dangerous when it is incorrect. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
  - Verification gates participation.
  - `tokens_valid_after` revocation.
  - Chat rate limits.
  - Queue seen-exclusion and reject suppression.
- Test the pre-login limits: the turn cap, the rate limits, and the alerts of the daily spend. Why: the abuse test is a go/no-go check. ([PD9](../decisions/pd-09-pre-login-limits.md), [PD11](../decisions/pd-11-launch.md))
- Run API integration tests with Vitest against a disposable Postgres database. Never mock the database. Why: the queue rules are mostly SQL, so a mock tests nothing that ships. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- Put the test data for the queue rules in a shared fixture. Do not copy it into each test. Why: the setup is not simple. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- When the web checks the text of an API error, an API test asserts that text. Why: a change of the text breaks the line of the web, and only an API test sees it. (Rule candidate of [#213](https://github.com/magentawood/roomsie/pull/213), the second time after [#211](https://github.com/magentawood/roomsie/pull/211))
- A test that picks or slices rows from a select orders the rows, for example by `created_at` and `id`. Why: Postgres gives the rows in no fixed order, so the test fails at random when a new row comes first. (Rule candidates of [#205](https://github.com/magentawood/roomsie/pull/205) and [#210](https://github.com/magentawood/roomsie/pull/210))
- A test changes only the rows that it made. Why: the tests of one file share one database, so a change with no `where` breaks the other tests. (Rule candidate of [#200](https://github.com/magentawood/roomsie/pull/200), the second time in [#215](https://github.com/magentawood/roomsie/pull/215))
- A test name claims only what its check proves. Why: a reader trusts the name, so a name that claims more hides the part that no check covers. (Rule candidate of [#214](https://github.com/magentawood/roomsie/pull/214), the second time in [#218](https://github.com/magentawood/roomsie/pull/218))
- Do not require or add snapshot tests on UI components while the design changes. Do not require component coverage. Why: assertions on a UI that changes each week cost time and find nothing. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- Do not add Playwright end-to-end tests until the UI is stable. Why: they are slow to write and brittle while the UI changes. ([ADR-0013](../decisions/0013-ci-gate-and-testing.md))

## Assistant evals

- Each assistant handler has its own eval score. Why: each handler has one job, so its score is easy to read. ([PD7a](../decisions/pd-07a-agent-architecture.md))
- The eval set has 200 to 300 utterances in the actual language mix. Give Marathi a heavy weight. Test at 25%, 50% and 75% code-mix. Why: Marathi, not Hinglish, is the language risk. ([PD7](../decisions/pd-07-models.md))
- Measure register match and abstention. A model that never abstains fails. Why: if you do not measure these, they become worse and nobody sees it. ([PD7](../decisions/pd-07-models.md))
- Test each scope band with its own pass condition, in Hindi, Marathi and Hinglish too. Why: a redirect that works only in English is not a redirect. ([PD10](../decisions/pd-10-scope-bands.md))
- Keep an eval result record before launch. Extraction must get 7 or more in 10 slots correct, and must mark vague sentences `unclear`. Why: these are go/no-go checks. ([PD11](../decisions/pd-11-launch.md))
- Test a new router model on the same eval set before it goes live. Why: the router decides the cost and the scope of each turn. ([PD7a](../decisions/pd-07a-agent-architecture.md))
- A change to the prompt of a handler runs the eval set of the handler before the merge, and the PR records the result. Why: a prompt change can break a handler where no unit test looks. (Rule candidate of [#204](https://github.com/magentawood/roomsie/pull/204), the second time in [#215](https://github.com/magentawood/roomsie/pull/215))
