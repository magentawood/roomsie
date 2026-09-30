# Repo layout

**Updated:** 2026-09-30 · Moved from CONTEXT.md

ADR 0003 and ADR 0010 fix the top level. The contents of `apps/` are a proposal, mapped to the tasks that build them. T-02 creates them. The owner of T-02 can adjust names in an app, and does not have to ask. Each item with a task code does not exist yet.

```
roomsie/
├── apps/
│   ├── web/                    Next 16 · React 19 · Tailwind v4 · TanStack Query → Vercel, bom1
│   │   ├── app/                routes
│   │   │   ├── (public)/       landing, privacy, terms, grievance        T-23a T-23b
│   │   │   ├── chat/           full-screen chat, then split view, chips  T-10 T-09
│   │   │   ├── people/[id]/    person detail and connect                 T-18b
│   │   │   ├── profile/        create and edit, photos                   T-16
│   │   │   └── waitlist/       launch areas and waitlist                 T-22
│   │   ├── components/         prototype look, theme tokens only         ADR 0011 exception · T-23a
│   │   └── lib/                API client typed from packages/contract, Firebase sign-in
│   └── api/                    Fastify · Zod · Drizzle → Fly.io Mumbai
│       ├── src/
│       │   ├── server.ts       mounts every module under /v1             T-02
│       │   ├── plugins/        auth check, rate limits, invite gate      T-05 T-21 T-33
│       │   ├── adapters/       the only place a vendor SDK is imported
│       │   │   ├── llm/        DeepSeek, then Gemini                     T-11
│       │   │   ├── auth/       Firebase token check                      T-05
│       │   │   ├── storage/    R2 presigned URLs                         T-16
│       │   │   └── analytics/  track(), into the analytics database      T-24 T-39
│       │   ├── assistant/      one entry point for every turn
│       │   │   ├── pipeline.ts router first, then the handlers it picks T-12 T-34
│       │   │   └── handlers/   extract, observe, advise, reply           T-12 T-36 T-38 T-13
│       │   ├── articles/       the advisor's articles, full-text search  T-37
│       │   ├── modules/        one folder per feature, each owning its tables
│       │   │   ├── chat/       stored turns, form state, turn cap,
│       │   │   │               spend ceiling                             T-06 T-17 T-21
│       │   │   ├── matching/   the match query                           T-14
│       │   │   ├── profiles/   profiles and photos                       T-16
│       │   │   ├── connections/ connect request, contact reveal          T-18a
│       │   │   ├── moderation/ report, block, suspend                    T-19
│       │   │   ├── account/    first sign-in, deletion                   T-05 T-20
│       │   │   └── waitlist/   launch areas and waitlist                 T-22
│       │   └── db/             Drizzle client; each module keeps its
│       │                       own schema file                           T-06
│       ├── drizzle/            generated SQL migrations                  ADR 0006
│       ├── eval/               eval sentences and the runner             M-03 T-27
│       ├── Dockerfile
│       └── fly.toml                                                      T-04
├── packages/
│   ├── contract/               Zod: Form A, every API route, analytics
│   │                           events. OpenAPI is generated from it      T-08 · ADR 0004 0012
│   └── config/                 shared tsconfig and ESLint, and reportError()  ADR 0010 0013 · T-07
├── docs/
│   ├── how-to-work.md          how the team works: principles, deadlines, task rules
│   ├── design-review.md        behaviour decisions for the designer
│   ├── extensibility.md        every known future change, and the seam that absorbs it
│   ├── product-base.md         product at a glance; ledger generated from the PD records
│   ├── tech-base.md            architecture at a glance; ledger generated from the ADRs
│   ├── decisions/              ADRs 0001 to 0016 and product decision records pd-*.md
│   ├── repo-layout.md          this file
│   ├── prototype-v3.md         what the V3 prototype settles
│   ├── archive/                history; never linked from the index
│   ├── team-plan.json          the plan's data. Edit this, then run the builder
│   ├── team-plan.md            generated from team-plan.json
│   ├── plan/                   the Obsidian view, generated
│   ├── *.md                    working docs: interface, assistant, models, scope, limits, SEO, verification
│   ├── research/ · content/    market research and the article corpus plan
│   └── source/                 vendored inputs: the V3 prototype
├── tools/
│   ├── build-obsidian-plan.py  rebuilds docs/plan/, .obsidian/graph.json and docs/team-plan.md
│   ├── build-decision-ledger.py writes the decision ledgers from the records
│   ├── render-docs.py          writes each docs .html from its .md
│   └── sync-issues.py          makes the GitHub issues match the plan
├── .github/workflows/ci.yml    typecheck, lint, build, secret scan       T-03
├── .obsidian/                  vault settings; the graph shows docs/plan
├── package.json · pnpm-workspace.yaml · turbo.json                       T-02 · ADR 0010
├── CLAUDE.md                   agent entry point
└── CONTEXT.md                  this file
```

- A vendor swap changes one folder in `adapters/`.
- A new feature is a new folder in `modules/`.
- The v1 assistant handlers go into `handlers/`.
- For each future change, `docs/extensibility.md` gives where it goes and what must be correct today.
- Not in v0: a mobile app. It has a prepared place next to `apps/web`.
- We do not plan a vector store at all.
- Nightly backups to R2 run from `.github/workflows/` (T-40).

## Why this layout

- We made the layout to absorb change, not to redraw it.
- `docs/extensibility.md` lists all the future changes that we know about.
- No vector store: matching is a SQL query, and the corpus fits Postgres full-text search.
