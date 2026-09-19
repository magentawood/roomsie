# ADR 0010 — pnpm workspaces + Turborepo

**Status:** Accepted · **Date:** 2026-09-11 · **Deciders:** Yash

## Context

ADR 0003 put `apps/web` and `apps/api` in one repository as independent
deployables. The shape we are building toward:

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

Two separable concerns: the package manager, and the task runner.

## Decision

**pnpm workspaces** for dependency management, **Turborepo** for task running.

## Rationale

### pnpm

Not chosen for speed or disk usage, though it wins on both. Chosen for
**strictness**.

npm and yarn flatten every dependency into one hoisted `node_modules`, so
`apps/web` can import a package only `apps/api` declared. It works on a laptop
and fails in CI or production. pnpm enforces that a package may import only what
it declares.

With four people and two independently deployed artefacts, that bug class is
worth designing out rather than debugging.

### Turborepo over Nx

Both are task runners over the same pnpm workspace, so this is a narrow call.

**For Turborepo, specific to us:**

- `apps/web` deploys to Vercel, which auto-detects Turborepo and enables
  **remote caching with zero configuration** — the team and CI share a build
  cache for free. Nx would need Nx Cloud configured separately.
- One config file. The team is absorbing Fastify, Zod, Drizzle, TanStack Query,
  Fly.io and Docker in the same month; this is a smaller thing to have opinions
  about right now.

**Nx's genuine advantage is `affected`,** not code generation. Nx builds a
project graph from actual imports rather than `package.json` dependencies, so
`nx affected -t test` runs only what a change could have broken. That matters at
twenty packages with a fifteen-minute CI run. At four packages, `turbo build`
with caching finishes either way.

**On the "adopt Nx now to avoid migrating later" argument.** The migration is
cheap: delete `turbo.json`, run `nx init`, update a few scripts — about half a
day. Adopting a heavier tool now to avoid half a day later inverts the
cheap-versus-expensive-to-change principle applied throughout these ADRs.

**Terminology note.** Nx has deprecated the package-based vs integrated
distinction. It was replaced by **inferred tasks** ("Project Crystal"):
`nx init` reads existing tool configs and infers tasks, and plugins are adopted
per project, incrementally. So the incremental-adoption path is now simply how
Nx works — there is nothing to hedge for by choosing a repo style up front.

## Consequences

- `pnpm-workspace.yaml` defines the workspace; every package declares its own
  dependencies explicitly.
- `turbo.json` defines the task graph: `dev`, `build`, `lint`, `test`.
- CI enables Turborepo remote caching through Vercel.
- Packages must not rely on hoisting. If something is imported, it is declared.

## Alternatives rejected

- **Nx with inferred tasks** — scales further and detects affected projects more
  precisely. Rejected on learning surface this month and on remote caching
  needing separate setup. A legitimate alternative, cheap to adopt later.
- **npm workspaces** — nothing new to install, but hoisting reintroduces the
  phantom-dependency bug class.
- **No task runner** — viable at this size, but two terminals to start work and
  no CI caching, for ~10 minutes of saved setup.

## Revisit when

The repo passes roughly fifteen packages, or CI wall-clock becomes a real
complaint. Then `nx init` is half a day.
