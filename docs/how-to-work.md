# How to work — no-designs plan

- **The launch date is not fixed.** The team selects it when the designs arrive.
- Work two hours each day, on all days, weekends included, from **Thursday 24 September**.
- **Quality comes before the date.** The quality bar is the go/no-go list in `docs/team-plan.md`.
- If a check fails, the date moves by a small number of days. We do not release below the bar.
- If your task will be late, tell the team.
- **We do not have designs at this time.**

Why: [PD11](decisions/pd-11-launch.md), [PD12](decisions/pd-12-team-plan.md)

---

## Until the designs arrive: waves

The work goes in waves, not in dates.

- Open "Design-free work" in `docs/plan/Progress.md`. No task there waits on a design.
- **Wave 0 waits on no open task.** When a wave is complete, the next wave can start.
- **Many people can work on one wave.** Ask the agent what you can pick up next. The `next-task` skill shows the free tasks, and does not show the tasks that a different person claimed.
- In a wave, take the ⚑ tasks first. Then take the task that unblocks the most tasks.
- Founder and marketing tasks that gate a build task are in the waves too. F-03 and F-04 come first.
- F-11 to F-14 are grill sessions for the open product calls. Their questions are in `docs/product-calls/`. "Waits on product calls" shows the tasks that wait on them.
- A task can need only a number or a list from an open call. Then put a default in config or seed data, not in the code.
- A small screen part, for example a sign-in button, is plain. It has no design. The screen tasks apply the design to it.
- When the designs arrive, the tasks in "Waits on the designs" join the waves. Then the team selects the launch date.

Why: [PD12](decisions/pd-12-team-plan.md)

---

## The rules

1. **Take the next task from the waves.**
2. **Do one task at a time.** Finish and merge a task before you start the next task.
3. **Open a pull request for each task.** Never push to `main`.
4. **Make one PR for each task.** Put the task ID in the PR title.
5. **Give your standup by 10 am:** tasks finished, current task, blockers.
6. **In the first week, merge on the day that you finish.**

Why: [PD12](decisions/pd-12-team-plan.md)

## Your list

Open "Design-free work" in `docs/plan/Progress.md`. It comes from `docs/team-plan.json`.

- Each task note (`docs/plan/tasks/`) and GitHub issue starts with a plain-words description.
- To change the plan, edit `docs/team-plan.json`. Then run `python3 tools/build-obsidian-plan.py`. Do not edit the generated files.

## How to do a task

0. The hook turns on by itself when you open the repo in Claude Code, and on `pnpm install` after T-02. If it is off, run `git config core.hooksPath .githooks` one time in the clone. The hook checks the doc limits and the generated files before each commit.
1. Take the next free task. Start it with `/agentic-devkit:build-feature <ID>`. It assigns the issue to you before its first question.
2. Open its note in `docs/plan/tasks/`. Read the description, "Needs first", "Done when" and "Read first".
3. Make a branch from `main`. Do the work. Obey the code rules in [docs/standards/](standards/_index.md).
4. Open one pull request. Put the task ID in the title.
5. When a "Done when" item is true, tick its box in the task note, not in the GitHub issue. Then run `python3 tools/build-obsidian-plan.py`, and commit `Progress.md` in the same PR.
6. Merge when all the items are true. Then start the next task.

If you have spare hours, tell the team. If a person is late, P4, P5 and P2 are the first to help.

Why: [PD12](decisions/pd-12-team-plan.md)

## How a code is built

| Prefix | Means | Who |
|---|---|---|
| **T-** | Technical build task | The five engineers |
| **D-** | Design task | Design |
| **M-** | Marketing task | Content (M1) and Community (M2) |
| **F-** | Founder task | Founder |
| **A-** | All-hands task | Everyone |
| **CP** | Checkpoint — a date, not a task | Everyone |
| **P1–P5** | The five engineering lanes. The first plan called them V1–V5 | One engineer each |

- A letter at the end of a code (**T-18a**, **T-18b**) shows one task in two halves: backend and screen. Different people own the two halves.
- We never use a removed code again.
- **⚑ marks the critical path.** If a ⚑ task is late, the launch date is late.

---

## What this costs

- **We build all screens after the designs arrive.** Thus, UI problems show late.
- **The launch date depends on the date of the designs.** The team selects it when they arrive.

Why: [PD12](decisions/pd-12-team-plan.md)
