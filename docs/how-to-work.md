# How to work — no-designs plan

- Launch: **Monday 12 October**. Fallback: **Wednesday 14 October**.
- Work two hours each day, on all days, weekends included, from **Thursday 24 September**.
- **Quality comes before the date.** The quality bar is the go/no-go list in `docs/team-plan.md`.
- If a check fails, the date moves by a small number of days. We do not release below the bar.
- If your task will be late, tell the team.
- **We do not have designs at this time.**

Why: [PD11](decisions/pd-11-launch.md), [PD12](decisions/pd-12-team-plan.md)

---

## The two phases

- **Phase A · Thu 24 → Wed 30 Sep.** Design-free work. No person works on a screen.
- **Phase B · Thu 1 → Sat 10 Oct.** All 35 hours of screens, when designs exist. Also the router, observer, advisor, analytics database and backups.

- Each task has one owner from start to finish.
- No task in your list waits for a different person.
- The finish date is the same.

Why: [PD12](decisions/pd-12-team-plan.md)

---

## The one hard deadline

**Design must finish D-02, D-03 and D-04 by end of Wednesday 30 September.**

- The designs must be complete. "Mostly done" is not sufficient.
- **For each day after 30 September that a design is late, the launch is one day late.**
- D-01, the styling decision, must come before that date. D-02, D-03 and D-04 cannot start before D-01 is complete.

Why: [PD12](decisions/pd-12-team-plan.md)

## Other dates

| Date | What |
|---|---|
| **Sat 10 Oct** | All lanes finish. Go/no-go meeting at 8 pm. |
| **Sun 11 Oct** | Bug fixing (A-01). Nobody builds new things. |
| **Mon 12 Oct** | Launch (A-02). Fallback Wed 14 Oct. |

---

## The rules

1. **Work your list in order.**
2. **Do one task at a time.** Finish and merge a task before you start the next task.
3. **Open a pull request for each task.** Never push to `main`.
4. **Make one PR for each task.** Put the task ID in the PR title.
5. **Give your standup by 10 am:** tasks finished, current task, blockers.
6. **In the first week, merge on the day that you finish.**

Why: [PD12](decisions/pd-12-team-plan.md)

## Your list

Open `docs/plan/Progress.md` or `docs/team-plan.md` (generated from `docs/team-plan.json`). Your tasks are the rows with your lane.

- Each task note (`docs/plan/tasks/`) and GitHub issue starts with a plain-words description.
- To change the plan, edit `docs/team-plan.json`. Then run `python3 tools/build-obsidian-plan.py`. Do not edit the generated files.

## How to do a task

1. Take the next task in your list.
2. Open its note in `docs/plan/tasks/`. Read the description, "Needs first", "Done when" and "Read first".
3. Make a branch from `main`. Do the work.
4. Open one pull request. Put the task ID in the title.
5. When a "Done when" item is true, tick its box in the task note, not in the GitHub issue.
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

- **We build all screens in Phase B.** Thus, UI problems show in the first week of October.
- **Phase A has almost no slack.**
- **One thing decides if the launch stays on 12 October: if the designs arrive on 30 September.**

Why: [PD12](decisions/pd-12-team-plan.md)
