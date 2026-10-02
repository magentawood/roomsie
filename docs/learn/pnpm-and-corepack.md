# pnpm, Corepack and Turborepo

**In one line:** pnpm installs the packages of the monorepo, Corepack gives each developer the same pnpm version, and Turborepo runs the tasks of all packages with one command.

## What it is

- **pnpm** is the package manager. A package can import only the packages that it declares, so a missing dependency fails on your laptop, not in production.
- **Corepack** comes with Node. It reads `"packageManager": "pnpm@11.28.2"` in the root `package.json` and runs that exact pnpm version.
- **Turborepo** runs a task, such as `build` or `test`, in each package, in the correct order, and keeps a cache.

## How it fits our project

1. Run `corepack enable` one time on your laptop.
2. Run `pnpm install`. The `prepare` script also turns on the doc hook.
3. Use the root commands: `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`. Each one runs the task through Turborepo.
4. To add a library to one package: `pnpm --filter @roomsie/api add <name>`.

## The choice we made

- pnpm workspaces and Turborepo: [ADR-0010](../decisions/0010-monorepo-tooling.md).
- pnpm 11.28.2, not 12, and TypeScript 6.0, not 7. The reasons are in the T-02 PR: [#94](https://github.com/magentawood/roomsie/pull/94).

## Gotchas

- **`corepack enable` fails with a permission error:** run `corepack enable pnpm --install-directory ~/.local/bin`, and make sure that `~/.local/bin` is in your PATH.
- **"Unable to find package manager binary":** Turborepo needs `pnpm` in your PATH. Run `corepack enable`.
- **pnpm 12 does not start through Corepack.** Keep the pinned 11.28.2.
- **A new package version is rejected:** pnpm 11 does not install a version that is less than one day old. Use a slightly older version. Do not turn off the guard.
- **"Ignored build scripts":** pnpm 11 blocks install scripts. Approve a package only if it needs its script, with `pnpm approve-builds <name>`. At this time only esbuild is approved.
- **An `AGENTS.md` file appears:** Turborepo writes it when an AI agent runs it. `turbo.json` turns this off. If the file appears, delete it.
- **TypeScript 7 breaks the ESLint tools.** Keep TypeScript at 6.0 until typescript-eslint supports 7.

## Tickets

- T-02: [#94](https://github.com/magentawood/roomsie/pull/94), 2026-10-03. The workspace, the versions and the commands.
