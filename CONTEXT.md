# roomsie — context index

Every agent session loads this file. It is an index: it tells you what roomsie is, where each fact lives, and what to read before a task. It holds no reasoning. **When your task touches an area in the routing table, read the files for that area before you act.**

**Owner:** Yash Mangal · **Org:** magentawood · **Limit:** 1,500 tokens (`doc-budget`)

## What roomsie is

- An AI-native platform to find flats and flatmates in Mumbai. An assistant interviews the user, then recommends. Browsing comes after the conversation.
- v0 is flatmate matching only, open to all genders, and free.
- Launch: Monday 12 October, fallback Wednesday 14 October. Go or no-go: Saturday 10 October, 8 pm ([PD11](docs/decisions/pd-11-launch.md)).
- roomsie is a pivot of femmeflats, a women-only swipe app. Its PRD is deprecated: do not cite it.

## Decisions

Each decision has one record in `docs/decisions/`: ADRs (architecture) and `pd-*.md` (product). The record is the only home of the decision and its reasons. Cite it as `ADR-0006` or `PD7a`.

<!-- decisions:start -->
**Not settled yet:** [PD3](docs/decisions/pd-03-listing-supply.md) Where listing supply comes from at launch (deferred); [PD3a](docs/decisions/pd-03a-flatmate-matching.md) Flatmate matching design (open); [PD3d](docs/decisions/pd-03d-listing-identity-restrictions.md) Identity restrictions in published listings (open); [PD4](docs/decisions/pd-04-monetisation.md) Monetisation model and pricing (pending); [PD6a](docs/decisions/pd-06a-mobile-split-view.md) Mobile pattern for the split view (provisional).

**All decisions:** product in [product-base.md](docs/product-base.md), architecture in [tech-base.md](docs/tech-base.md). Each links its record.
<!-- decisions:end -->

Open, with no record yet: the elevator pitch.

## Routing: read before you act

| When your task touches… | Read first |
|---|---|
| Any task | Its task note in `docs/plan/tasks/` and its "Read first" list |
| Writing or reviewing code | [docs/standards/_index.md](docs/standards/_index.md) and the file for the area |
| The schema, migrations, ids | [ADR-0006](docs/decisions/0006-drizzle.md), [ADR-0015](docs/decisions/0015-primary-key-strategy.md), [ADR-0012](docs/decisions/0012-analytics-event-store.md) |
| The API, auth, tokens | [ADR-0002](docs/decisions/0002-api-boundary.md), [ADR-0004](docs/decisions/0004-api-stack-typescript-fastify.md), [ADR-0007](docs/decisions/0007-web-rendering-and-auth-transport.md) |
| Secrets, env vars, logging PII | [ADR-0016](docs/decisions/0016-credentials-and-secrets.md), [ADR-0014](docs/decisions/0014-error-tracking.md) |
| Web UI, styling, tokens | [ADR-0008](docs/decisions/0008-web-stack.md), [ADR-0011](docs/decisions/0011-design-system-token-pipeline.md), [PD6a](docs/decisions/pd-06a-mobile-split-view.md), [interface-shape.md](docs/interface-shape.md) |
| The assistant, prompts, models | [PD7](docs/decisions/pd-07-models.md), [PD7a](docs/decisions/pd-07a-agent-architecture.md), [PD10](docs/decisions/pd-10-scope-bands.md), [ai-agent-design.md](docs/ai-agent-design.md), [agent-architecture.md](docs/agent-architecture.md), [scope-policy.md](docs/scope-policy.md) |
| Matching and preferences | [PD3b](docs/decisions/pd-03b-interview-vs-chips.md), [PD3c](docs/decisions/pd-03c-exclusionary-preferences.md), [PD6c](docs/decisions/pd-06c-interface-holes.md) |
| Limits, abuse, spend, cost | [PD9](docs/decisions/pd-09-pre-login-limits.md), [pre-login-limits.md](docs/pre-login-limits.md), [PD5](docs/decisions/pd-05-team-and-budget.md), [cost-and-team.md](docs/cost-and-team.md) |
| Login gate, SEO, public pages | [PD6b](docs/decisions/pd-06b-login-gate-and-search.md), [seo-with-gated-products.md](docs/seo-with-gated-products.md) |
| Verification, trust, safety | [PD8](docs/decisions/pd-08-verification.md), [verification.md](docs/verification.md), [assistant-risks.md](docs/assistant-risks.md) |
| Hosting, deploy, CI, backups | [ADR-0009](docs/decisions/0009-hosting-and-region.md), [ADR-0013](docs/decisions/0013-ci-gate-and-testing.md), [PD13](docs/decisions/pd-13-databases-and-backups.md) |
| A new vendor or feature | [extensibility.md](docs/extensibility.md), [repo-layout.md](docs/repo-layout.md), [ADR-0005](docs/decisions/0005-managed-platform-split.md), [ADR-0010](docs/decisions/0010-monorepo-tooling.md) |
| Articles, the advisor corpus | [corpus-plan.md](docs/content/corpus-plan.md), [PD10](docs/decisions/pd-10-scope-bands.md) |
| The plan, dates, owners | [how-to-work.md](docs/how-to-work.md), [Progress.md](docs/plan/Progress.md), [PD11](docs/decisions/pd-11-launch.md), [PD12](docs/decisions/pd-12-team-plan.md) |

## Where things live

- **The plan:** edit only `docs/team-plan.json`, then run `python3 tools/build-obsidian-plan.py`. It writes the task notes, `Progress.md` and `team-plan.md`. `python3 tools/sync-issues.py --apply` updates the GitHub issues.
- **Decision ledgers:** `python3 tools/build-decision-ledger.py` writes the lists in this file, `product-base.md` and `tech-base.md` from the records.
- **Browser pages:** `python3 tools/render-docs.py` writes each `.html` from its `.md`.
- **Learn pages:** `docs/learn/` has one plain-language page for each technical topic. [The list](docs/learn/README.md) is generated.
- **History:** `docs/journal/` (one file each month, append only) and `docs/archive/`. The index never links them.

## Conventions

- **Never push to `main`.** Each change goes in through a pull request.
- Write all Markdown in STE with the `ste-writing` skill.
- One fact, one home. Link to it; do not copy it. When a decision changes, update its record and remove the replaced text.
- Keep each doc inside its limit. The hook turns on by itself in Claude Code, and on `pnpm install` after T-02. If it is off, run `git config core.hooksPath .githooks`. It runs `tools/doc-budget.py` and the generated-file checks.
- Remote Control stays off. The repo is private: its history holds a session transcript with personal data.
