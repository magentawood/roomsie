# Repo layout

**Updated:** 2026-10-03 · Moved from CONTEXT.md

ADR 0003 and ADR 0010 fix the top level. Inside `apps/`, this is the target layout. A folder exists when its task builds it. The task of each part is in `docs/team-plan.json`.

```
roomsie/
├── apps/
│   ├── web/                    Next 16 · React 19 · Tailwind v4 · TanStack Query → Vercel, bom1
│   │   ├── app/                routes
│   │   │   ├── (public)/       landing, privacy, terms, grievance
│   │   │   ├── chat/           full-screen chat, then split view, chips
│   │   │   ├── people/[id]/    person detail and connect
│   │   │   ├── profile/        create and edit, photos
│   │   │   └── waitlist/       launch areas and waitlist
│   │   ├── components/         Figma look, theme tokens only
│   │   └── lib/                API client typed from packages/contract, Firebase sign-in
│   └── api/                    Fastify · Zod · Drizzle → Fly.io Mumbai
│       ├── src/
│       │   ├── server.ts       mounts every module under /v1
│       │   ├── plugins/        auth check, rate limits, invite gate
│       │   ├── adapters/       the only place a vendor SDK is imported
│       │   │   ├── llm/        DeepSeek, then Gemini
│       │   │   ├── auth/       Firebase token check
│       │   │   ├── storage/    R2 presigned URLs
│       │   │   └── analytics/  track(), into the analytics database
│       │   ├── assistant/      one entry point for every turn
│       │   │   ├── pipeline.ts router first, then the handlers it picks
│       │   │   └── handlers/   extract, observe, advise, reply
│       │   ├── articles/       the advisor's articles, full-text search
│       │   ├── modules/        one folder per feature, each owning its tables
│       │   │   ├── chat/       stored turns, form state, turn cap,
│       │   │   │               spend ceiling
│       │   │   ├── matching/   the match query
│       │   │   ├── profiles/   profiles and photos
│       │   │   ├── connections/ connect request, contact reveal
│       │   │   ├── moderation/ report, block, suspend
│       │   │   ├── account/    first sign-in, deletion
│       │   │   └── waitlist/   launch areas and waitlist
│       │   └── db/             Drizzle client; each module keeps its
│       │                       own schema file
│       ├── drizzle/            generated SQL migrations                  ADR 0006
│       ├── eval/               eval sentences and the runner
│       ├── Dockerfile
│       └── fly.toml
├── packages/
│   ├── contract/               Zod: Form A, every API route, analytics
│   │                           events. OpenAPI is generated from it      ADR 0004 0012
│   └── config/                 shared tsconfig and ESLint, and reportError()  ADR 0010 0013
├── docs/
│   ├── how-to-work.md          how the team works: principles, deadlines, task rules
│   ├── extensibility.md        every known future change, and the seam that absorbs it
│   ├── product-base.md         product at a glance; ledger generated from the PD records
│   ├── tech-base.md            architecture at a glance; ledger generated from the ADRs
│   ├── decisions/              ADRs 0001 to 0016 and product decision records pd-*.md
│   ├── standards/              code rules for each area, each linked to its record
│   ├── repo-layout.md          this file
│   ├── archive/                history; never linked from the index
│   ├── team-plan.json          the plan's data. Edit this, then run the builder
│   ├── team-plan.md            generated from team-plan.json
│   ├── plan/                   the Obsidian view, generated
│   ├── *.md                    working docs: interface, assistant, models, scope, limits, SEO, verification
│   ├── research/ · content/    market research and the article corpus plan
├── tools/
│   ├── build-obsidian-plan.py  rebuilds docs/plan/, .obsidian/graph.json and docs/team-plan.md
│   ├── build-decision-ledger.py writes the decision ledgers from the records
│   ├── render-docs.py          writes each docs .html from its .md
│   └── sync-issues.py          makes the GitHub issues match the plan
├── .github/workflows/ci.yml    typecheck, lint, build, secret scan
├── .obsidian/                  vault settings; the graph shows docs/plan
├── package.json · pnpm-workspace.yaml · turbo.json                       ADR 0010
├── CLAUDE.md                   agent entry point
└── CONTEXT.md                  this file
```

- A vendor swap changes one folder in `adapters/`.
- A new feature is a new folder in `modules/`.
- The v1 assistant handlers go into `handlers/`.
- For each future change, `docs/extensibility.md` gives where it goes and what must be correct today.
- Not in v0: a mobile app. It has a prepared place next to `apps/web`.
- We do not plan a vector store at all.
- Nightly backups to R2 run from `.github/workflows/`.

## Why this layout

Why: [ADR-0003](decisions/0003-api-as-separate-service.md), [ADR-0010](decisions/0010-monorepo-tooling.md), [PD7a](decisions/pd-07a-agent-architecture.md)
