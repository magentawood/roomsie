# Secret scanning

**In one line:** gitleaks finds a password or a key in the code before the secret goes into the shared git history. Run `pnpm secrets` before each pull request.

## What it is

A **secret** is a value that gives access, for example an API key, a database password or a token. When a secret goes into git history, it stays there, also after you delete the file. Thus, each person who can read the repo can read the secret, and you must replace the key.

**gitleaks** is a free tool that reads files and git history. It looks for text that has the shape of a secret, for example `AKIA…` for an AWS key or `ghp_…` for a GitHub token. When it finds one, it fails and gives the file and the line. It hides the value in its output.

## How it fits our project

gitleaks runs in two places:

| Where | When | What it scans |
|---|---|---|
| Your laptop, `pnpm secrets` | One time, before you open a pull request | The commits of your branch that are not on `main` |
| CI, the `secrets` check | On each pull request | The full git history |

`pnpm secrets` runs gitleaks if it is on your laptop. If it is not, the script runs the gitleaks Docker image. You do not have to install gitleaks. Docker is necessary, the same as for the local Postgres.

When an agent opens a pull request with `build-feature`, the agent runs `pnpm secrets` first.

## The choice we made

- gitleaks before each pull request and in CI, not before each commit: [ADR-0016](../decisions/0016-credentials-and-secrets.md).
- CI runs the gitleaks Docker image, not the gitleaks GitHub Action: the T-03 spec and [#112](https://github.com/magentawood/roomsie/pull/112).

## Gotchas

- **`pnpm secrets` finds a secret:** do not push the branch. Remove the secret from the file, then remove it from the commit, for example with `git commit --amend` or an interactive rebase. If you already pushed it, replace the key at its provider. A deleted line does not remove the secret from the history.
- **The `secrets` check is red on a pull request:** the secret is already on GitHub. Replace the key at its provider first. Then remove it from the branch.
- **gitleaks finds a value that is not a secret:** for example, a dummy value in `.env.example`. Change the value so that it does not have the shape of a real key.
- **"0 commits scanned":** your branch has no commits that are not on `main`. This is correct.
- **"Cannot connect to the Docker daemon":** open Docker Desktop, then run `pnpm secrets` again.

## Tickets

- T-03: [#112](https://github.com/magentawood/roomsie/pull/112), 2026-10-08. `pnpm secrets` and the `secrets` check in CI.
