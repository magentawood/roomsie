# PD12 — Team plan: design-free waves, then screens

**Status:** Settled. Cut again on 2026-09-25. Changed on 2026-10-03. · **Date:** 2026-10-03 · **Deciders:** Yash

## Context

- The team is 5 engineers at 2 hours a day, 2 marketing people and 1 designer (PD5).
- The designs D-02, D-03 and D-04 were due on 30 September. They were not complete on that date, and they have no new date.
- Most of the build hours need no design. The screens need the designs.
- No accounts or keys exist at this time. Sign-in, the model wrapper, the deploy and error reports need them.

## Decision

**In one line:** All design-free work comes first, in waves, and the screens come when designs D-02, D-03 and D-04 arrive.

- **Waves replace the lane lists and the dates.** The plan build calculates the waves from the dependencies in `docs/team-plan.json`. Wave 0 waits on no open task. `docs/plan/Progress.md` shows the waves.
- **Many people can work on one wave.** Each person does one task at a time. To take a task, a person assigns its GitHub issue to themselves.
- **A founder or marketing task that gates a build task is a dependency in the plan.** It joins the waves.
- **A task with a large screen part has two halves.** The API half needs no design. The screen half waits on a design.
- **The team builds a small screen part plain, with no design.** The screen task of the design then applies the design to it.
- **Each ticket PR rebuilds the plan files.** A check fails when they are stale.
- **The team selects the launch date when the designs arrive,** and records it in [PD11](pd-11-launch.md).
- Rules: open one PR for each task. Never push to `main`. In the first week, merge on the day that you finish.

## Rationale

- A wave comes from the dependencies, thus it stays correct when a date moves. A list with dates was incorrect on the first day that the designs were late.
- Most of the work is in one or two hands with agents. One shared queue is better than five lanes that wait on each other.
- A hidden dependency makes "can start" incorrect. Some tasks need the accounts and the keys, the legal text, the launch areas or the articles. Thus, the plan shows these dependencies.
- An API half that waits on a design wastes build hours on the critical path (⚑). T-16 and T-22 had such halves.
- A small screen part must not block the backend tasks after it. A plain button first, with the design subsequently, costs a small amount.
- A stale `Progress.md` shows the incorrect next task. A check stops this.

## Alternatives rejected

- **Keep the lanes and move each date.** Without a design date, each new date is a guess.
- **Show who works a task in `Progress.md`.** Assignees change without a commit, so the freshness check fails at random.
- **Build against fake accounts, and add the founder tasks subsequently.** The user preferred a hard dependency on F-04.

## Consequences

- We build all screens after the designs arrive. Thus, UI problems show late.
- The launch date is not fixed until the designs arrive.
- `docs/team-plan.json` is the one place where you edit the plan. `team-plan.md`, the task notes and `Progress.md` come from it.
- Each task is a GitHub issue. `docs/plan/` has the graph and the timeline, for Obsidian.
- **The launch look comes from the Figma designs.**
- The GitHub issues keep the initial `vertical:V1`–`V5` labels until we relabel them. Until then, `team-plan.md` has priority.

## Revisit when

- The designs arrive. Then select the launch date in PD11.
- The team becomes more than one or two people with agents. Then the lanes can return.

Superseded (2026-10-03): five lanes in two phases, from 24 September to 10 October. The designs had a hard deadline of 30 September.

Superseded (2026-10-02): the V3 prototype is not the launch design. The Figma designs replace it.

## Sources

- [how-to-work.md](../how-to-work.md)
- [team-plan.md](../team-plan.md)
- [Progress.md](../plan/Progress.md)
- [cost-and-team.md](../cost-and-team.md)
