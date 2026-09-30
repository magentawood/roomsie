# ADR 0010 — pnpm workspaces + Turborepo

**Status:** Accepted · **Date:** 2026-09-11 · **Deciders:** Yash

## Context

ADR 0003 put `apps/web` and `apps/api` in one repository. Each is a deployable
that we deploy independently. This is the shape that we build to:

```
femmeflats/
├── apps/
│   ├── web/          Next 16 · Tailwind v4
│   └── api/          Fastify · Drizzle
├── packages/
│   ├── contract/     OpenAPI spec + generated types
│   └── config/       shared tsconfig, eslint
└── docs/decisions/
```

There are two different concerns that we can decide one at a time: the
package manager and the task runner.

## Decision

**In one line:** We use pnpm workspaces for dependency management and Turborepo for task running.

**pnpm workspaces** for dependency management, **Turborepo** for task running.

## Rationale

### pnpm

We chose pnpm for **strictness**, not for speed or disk usage, but it is better
on the two.

- npm and yarn flatten all dependencies into one hoisted `node_modules`. Thus,
  `apps/web` can import a package that only `apps/api` declared. This works on a
  laptop, and it fails in CI or production.
- pnpm makes sure that a package can import only what it declares.
- We have four people and two artefacts that we deploy independently. Thus, it
  is worth it to design out that bug class, and not to debug it.

### Turborepo over Nx

The two tools are task runners on the same pnpm workspace. The reasons for
Turborepo, in our conditions:

- `apps/web` deploys to Vercel. Vercel automatically finds Turborepo and enables
  **remote caching with zero configuration**. Thus, the team and CI share a
  build cache for free. Nx would need Nx Cloud, with its own configuration.
- There is one config file. In the same month, the team learns Fastify, Zod,
  Drizzle, TanStack Query, Fly.io and Docker. Thus, at this time, Turborepo is
  a smaller thing to have opinions about.

**The genuine advantage of Nx is `affected`,** not code generation. Nx makes a
project graph from the actual imports, not from the `package.json` dependencies.
Thus, `nx affected -t test` runs only what a change could break. That is
important at twenty packages with a fifteen-minute CI run. At four packages,
`turbo build` with caching finishes with or without `affected`.

**On the "adopt Nx now to avoid migrating later" argument.** The migration is
cheap: delete `turbo.json`, run `nx init`, and update a small number of scripts.
This takes approximately half a day. To adopt a heavier tool at this time to
prevent half a day of subsequent work is the opposite of the
cheap-versus-expensive-to-change principle that we apply in all these ADRs.

**Terminology note.** Nx deprecated the package-based vs integrated distinction.
**Inferred tasks** ("Project Crystal") replaced it. `nx init` reads the tool
configs that exist and infers tasks. Then you adopt plugins one project at a
time, incrementally. Thus, the incremental-adoption path is simply how Nx works
at this time. You do not have to choose a repo style at the start as a hedge.

## Consequences

- `pnpm-workspace.yaml` defines the workspace. Each package declares its own
  dependencies explicitly.
- `turbo.json` defines the task graph: `dev`, `build`, `lint`, `test`.
- CI enables Turborepo remote caching through Vercel.
- Packages must not rely on hoisting.

## Alternatives rejected

- **Nx with inferred tasks.** It scales to a larger size, and it finds the
  affected projects more accurately. We rejected it because of the amount that
  the team must learn this month, and because its remote caching needs a
  separate setup.
- **npm workspaces.** There is nothing new to install. But hoisting brings back
  the phantom-dependency bug class.
- **No task runner.** This is viable at this size. But you need two terminals
  to start work, and CI has no caching. It saves only ~10 minutes of setup.

## Revisit when

- The repo has more than approximately fifteen packages.
- The CI wall-clock time becomes a real complaint.
