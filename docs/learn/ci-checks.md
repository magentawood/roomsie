# CI checks

**In one line:** GitHub checks each pull request automatically, and `main` accepts a merge only when the checks pass and a teammate approves.

## What it is

**CI** (continuous integration) is a set of checks that run on the servers of GitHub. A **workflow** is a YAML file in `.github/workflows/` that gives the steps. Each pull request starts the workflows, and each **job** shows as one check on the pull request: green when it passes, red when it fails.

A **service container** is a second container that GitHub starts next to a job. Our tests need a real Postgres, so the job starts Postgres 17 in a service container. The tests then find it on `localhost:5432`, the same address as on a laptop.

A **ruleset** is a setting of the repo on GitHub. It tells GitHub which conditions a change to a branch must meet.

## How it fits our project

Each pull request runs three checks:

| Check | Workflow | What it does |
|---|---|---|
| `check` | `ci.yml` | Installs the packages, then runs typecheck, lint, build and the tests against Postgres. |
| `secrets` | `ci.yml` | Runs gitleaks on the full git history. See [Secret scanning](secret-scanning.md). |
| `docs` | `docs-check.yml` | Runs the doc checks: the limits, the links, and the generated files. |

The `protect-main` ruleset gives these conditions for `main`:

- A change goes in only through a pull request. Nobody can push to `main`, also an admin.
- The three checks pass.
- One teammate approves the pull request. You cannot approve your own pull request.

Before you open a pull request, you can run the same checks on your laptop: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test` and `pnpm secrets`.

## The choice we made

- The checks of each pull request and the five-minute target: [ADR-0013](../decisions/0013-ci-gate-and-testing.md).
- The tests run in CI, the ruleset needs one approval, and no person can bypass it: the T-03 spec and [#112](https://github.com/magentawood/roomsie/pull/112).

## Gotchas

- **A check is red:** open the check on the pull request, then open the step with the red mark. The log shows the error. Fix it on your branch and push again.
- **The tests pass on your laptop, but fail in CI:** CI starts with an empty database and no `.env` file. A test must not use data or settings that only your laptop has.
- **CI gives a variable to the tests, but the tests do not see it:** Turborepo gives a task only the variables that `turbo.json` names. Add the variable to the `env` list of the task.
- **The Merge button is grey:** a check is red or not complete, or nobody approved the pull request.
- **A change to a job name:** the ruleset names the checks. If you rename a job, change the ruleset in the same pull request. If you do not, each pull request waits for a check that never runs.

## Tickets

- T-03: [#112](https://github.com/magentawood/roomsie/pull/112), 2026-10-08. The CI workflow, the Postgres service container and the `protect-main` ruleset.
