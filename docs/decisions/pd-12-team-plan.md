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
- The principles from before stay the same.
- The designs must be complete because five people must build from them on the morning of Thursday 1 October. There is no spare time for a late design.
- The order of each person's list is the schedule. Other people wait for your work.

Why each lane starts where it does:

- P1 starts first, with the monorepo (T-02).
- The P2 lane needs no designs. P2 works through the two phases with no interruption. Three people build against T-08, so P2 does T-08 on day one.
- P3 owns T-15 and T-18b, because they show the matches and people from the P3 schema and match query. P3 owns the advisor, T-38, because it searches data that P3 owns.
- For P4, the prototype is the design, so T-23a is not blocked. Sunday 27 is spare because T-19 needs the schema. The schema arrives on the evening of that day.
- M-03 also needs no design and no code. It is the only task available to P5 on day one.
- P4 and P5 have Sunday 27 free, because only three tasks in the full project can start before the schema and monorepo exist.

Why the designer gets a design review (`design-review.md`):

- "Does not need a design" is not the same as "has no design decisions in it." Each task quietly assumes some behaviour of the product. Examples: how many questions the assistant asks, what a profile contains, when results appear, and what occurs on a phone.
- We had to make those decisions to start. The design review writes them down.
- The cost to change a decision depends fully on when the designer tells us. On 25 September, most of the decisions were free to change. Thus, we do not build the incorrect thing for a fortnight.
- §1, §5 (mobile) and §6.3 are more important than all other items together. The build is in progress. Each day that the review stays unread, more items change from 🟢 free to 🔴 structural.

| By | Design review item | Why this date |
|---|---|---|
| Now | §1 The questions in the conversation | We build the contract first. |
| Now | §6.3 The launch look | The styling decision controls all designs. |
| Sun 27 Sep | §2 What we store about a person | Migrations after the schema commit are painful. |
| Tue 29 Sep | §3 How the assistant behaves | We build the reply writer on Wed–Thu. |
| Wed 30 Sep | §4 How results appear and update | Work on the match query and the results panel starts on Thursday. |

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
