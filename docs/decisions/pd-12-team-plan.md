# PD12 — Team plan: five lanes, two phases

**Status:** Settled. Cut again on 2026-09-25. · **Date:** 2026-09-25 · **Deciders:** Yash

## Context

- The team is 5 engineers at 2 hours a day, 2 marketing people and 1 designer (PD5).
- There are no designs at this time.
- In the first estimate, 80 of the 115 build hours needed no design. The other 35 could not start without a design.
- V1, V2 and V4 had no blocked hours. V3 and V5 were almost fully blocked. With the initial verticals, V3 and V5 would have no work.

## Decision

**All the work that needs no design comes first. We build all screens when the designs are available.**

There are **five engineering lanes, P1 to P5**, and two phases.

| Phase | Dates | What happens |
|---|---|---|
| A · Design-free | Thu 24 → Wed 30 Sep | Monorepo, database, sign-in, assistant, matching, moderation. No person works on a screen. |
| B · Screens and the assistant | Thu 1 → Sat 10 Oct | All 35 hours of screens, from finished designs. Also the router, the observer, the advisor, the analytics database and backups. |

- **151 build hours against 170 available.**
- **The one hard deadline: designs D-02, D-03 and D-04 must be complete by the end of Wednesday 30 September.** "Mostly done" is not sufficient. D-01, the decision about the launch look, must come before that date.
- **Each task keeps one owner** from start to finish.
- Lane ownership and hours for each lane: see [team-plan.md](../team-plan.md),
  generated from docs/team-plan.json.
- After Phase A, no task in a person's list waits for a different person.
- Design, marketing and the founder keep their roles.
- Rules: work your list in order, one task at a time. Open one PR for each task. Never push to `main`. In the first week, merge on the day that you finish.

| Checkpoint | Date |
|---|---|
| CP0 Kickoff | Fri 25 Sep |
| CP1 Foundation | Mon 28 Sep |
| CP2 Core loop live | Thu 1 Oct |
| CP3 Freeze and go/no-go | Sat 10 Oct, 8 pm |
| CP4 Launch | Mon 12 Oct, fallback Wed 14 Oct |
| CP5 First-week review | Mon 19 Oct |

## Rationale

- **We cut the plan again because there are no designs at this time.** Because there are no designs, the work has two phases.
- The designs must be complete because five people must build from them on the morning of Thursday 1 October. There is no spare time for a late design.
- The order of each person's list is the schedule. Other people wait for your work.

## Consequences

- **For each day after 30 September that a design is late, the launch is one day late.** Phase A has no slack.
- We build all screens in Phase B. Thus, UI problems show in the first week of October. These late problems are the cost of no designs, not a mistake in the order of tasks.
- During Phase A, no person owns a vertical from end to end. We get resilience, but we lose clean ownership.
- If there are only four engineers, plan for 14 October from day one.
- `docs/team-plan.json` is the one place where you edit the plan. `how-to-work.md` and `team-plan.md` come from it.
- The GitHub issues keep the initial `vertical:V1`–`V5` labels until we relabel them. Until then, `team-plan.md` has priority.

Superseded: the first schedule of 115 build hours against 120 available for five engineers, with a bug-fix day on 6 October (see PD11).

## Sources

- [CONTEXT.md, PD12 row and Why callout](../../CONTEXT.md)
- [product-base.md §17](../product-base.md)
- [how-to-work.md](../how-to-work.md)
- [team-plan.md](../team-plan.md)
- [design-review.md](../design-review.md)
- [cost-and-team.md](../cost-and-team.md)
