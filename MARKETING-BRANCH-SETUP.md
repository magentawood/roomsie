# How to add these files to roomsie (tech, one time)

The plan generator is in the agentic-marketing plugin. Install the plugin first (see its README).

1. `git checkout main && git pull && git checkout -b marketing`
2. Copy the contents of this folder into the repo root. It adds only new files, except `CLAUDE.md`, which on this branch also imports `docs/marketing/CONTEXT.md`.
3. `python3 <plugin>/scripts/mk.py plan check` (it must say "47 task notes current").
4. Commit and push `marketing`.
5. Create the labels: `gh label create marketing`, `gh label create marketing-help`, `gh label create design-help`.
6. `python3 <plugin>/scripts/mk.py plan sync-issues --dry-run`, then without `--dry-run`, to make one issue for each marketing task.
7. Protect `marketing`: one approval, from Yash or Niruv. Protect `main`: one approval, from Yash.
8. Give Devashish and Ritvij write access to the repo.
9. Each of the 7 people runs `/marketing obsidian` one time, in Claude Code, in their roomsie folder.

`<plugin>` is the folder of the plugin, for example `~/Projects/agentic-marketing`.

Do not merge the `marketing` branch into `main`. Only live items (the articles) go to `main`, each through its own merge request.

## Conflicts with main to resolve

`docs/marketing/decisions.md` lists where marketing decisions differ from PD2, PD11, ADR-0012, corpus-plan.md and how-to-work.md. Each one needs an update of that record on `main`.
