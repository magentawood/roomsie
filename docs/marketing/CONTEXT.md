# roomsie marketing — context index

The marketing agent loads this file in each session on the `marketing` branch. It is an index. It holds no reasoning. **When a task touches an area in the routing table, read those files first.**

**Owners:** Devashish (DV) and Ritvij (RT) · **Approver:** Yash · **Limit:** 1,500 tokens

## What marketing must know about roomsie

- An AI assistant interviews a person, then shows flatmates who fit. v0 is flatmate matching only, open to all genders, and free ([PD0](../decisions/pd-00-v0-scope.md), [PD1](../decisions/pd-01-audience.md)).
- Launch: **Sunday 11 October**. Fallback: **Sunday 18 October**. Area: **all of Mumbai** ([decisions.md](decisions.md)).
- Sign-in is Google only. A guest gets 5 free typed messages; chip taps are free ([PD9](../decisions/pd-09-pre-login-limits.md)).
- **Do not claim:** verified profiles (verification is v1, [PD8](../decisions/pd-08-verification.md)), women-only, referrals, numbers of users we do not have.
- The real risk is cold start: an empty results panel. Seeding comes first ([PD11](../decisions/pd-11-launch.md)).

## Decisions

All marketing decisions, with the date and one line each: [decisions.md](decisions.md).

## Routing: read before you act

| When your task touches… | Read first |
|---|---|
| Any task | Its note in `docs/marketing/tasks/` and its "Read first" list |
| Posts, ads, captions | [voice-guide.md](voice-guide.md) |
| Articles | [corpus-plan.md](../content/corpus-plan.md), [voice-guide.md](voice-guide.md), `keywords.md` |
| Seeding, invites | [PD11](../decisions/pd-11-launch.md), [pre-login-limits.md](../pre-login-limits.md) |
| SEO, public pages | [seo-with-gated-products.md](../seo-with-gated-products.md), [PD6b](../decisions/pd-06b-login-gate-and-search.md) |
| Numbers, tracking | [ADR-0012](../decisions/0012-analytics-event-store.md), [decisions.md](decisions.md) |
| Brokers | [supply-and-broker-model.md](../research/supply-and-broker-model.md), [PD3](../decisions/pd-03-listing-supply.md) |
| Interview transcripts | [transcripts/README.md](../../transcripts/README.md) |

## Where things live

- **The plan:** edit only `docs/marketing/plan.json`. Then run `mk.py plan build` from the agentic-marketing plugin. It writes the task notes, `Progress.md`, the owner notes and `Marketing timeline.canvas`.
- **Obsidian:** each person sees this folder as `Marketing/` in their roomsie vault (`/marketing obsidian`).
- **Branches:** each task branches off `marketing`. Yash or Niruv approves each merge into `marketing`. A live item (an article) goes to `main` through a merge request, and Yash approves it.
- **Sheets:** KPI sheet, spend log, outreach sheet, form responses. Their IDs are in each person's local config, not here.

## Conventions

- Internal docs (plan, task notes, decisions) use STE. Posts, ads and articles use the voice guide.
- Never push to `main`. Never paste a key into a chat, a file or a commit.
- One fact, one home. Link to it.
