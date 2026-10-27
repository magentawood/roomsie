# Handoff: sub-areas (T-56, T-57) and the open threads

**Cloud session, 2026-10-27:** review round 2 is done and its fixes are committed. The push is blocked (GitHub 403). See [HANDOFF-notes.md](HANDOFF-notes.md#cloud-session-2026-10-27-what-it-did-and-where-it-stopped).

Written 2026-10-27 by the local session before the weekly limit ran out. Read it, then continue from "What's next".

**This handoff is for one transfer only.** The cloud session continues the work until the user's weekly limit resets, at 3:30 AM IST on Wednesday 28 October 2026. After the reset, the user takes the work back to the local sessions. Before then, commit and push all work to this branch. At the top of this file, write what the cloud session did and where it stopped. **Delete this file and HANDOFF-notes.md before the T-56 PR is opened. They must not merge to `main`.**

## The goal

- Roomsie launches in all of Mumbai. Every Mumbai area is live, and only places outside Mumbai get the waitlist ("Roomsie is only in Mumbai for now"). PR #162 has this.
- Each area group gets sub-areas, as the Mumbai rental market names them. The spec is [docs/specs/sub-areas.md](docs/specs/sub-areas.md), approved 2026-10-27, and it covers two tickets:
  - **T-56 Sub-areas API** (#163): the data, the API and the matching.
  - **T-57 Sub-area pickers** (#164): the web screens.

## Where things are

| Item | State |
|---|---|
| PR #162 `docs/all-of-mumbai` (each Mumbai area live) | **Merged** on 2026-10-27 (`f771fd5` on `main`). |
| Branch `feat/t-56-sub-areas` | On `main` after the merge of #162. Pushed with this file. No PR yet. |
| Issue #163 T-56 | `status:in-progress`, claimed by n3rxv |
| Issue #164 T-57 | `status:spec`, claimed by n3rxv |

`git log --oneline origin/main..HEAD` lists the commits of T-56.

## What's done in T-56

- **Areas table:**
  - `parent_slug` is a self-reference, and null for a group.
  - `aliases text[]` holds the other names.
  - `is_launch_area` and `areas_launch_idx` are dropped.
  - The migrations are `0011_sub_areas` (add) and `0012_drop_launch_area` (drop).
- **The seed** (`apps/api/src/db/seed-areas.ts`) is a nested tree:
  - 10 groups, 90 sub-areas and 19 pockets, 119 rows;
  - `sort_order` follows the tree, depth first;
  - it is the only home of the list.
- **`apps/api/src/areas.ts`:**
  - `listAreas` serves `GET /v1/areas`, which gives each area with its slug, name, parent and aliases.
  - `isSubArea` checks that an area is not a group.
  - `areaParents` and `matchingAreas` expand the picks: each pick, the areas under it and the areas above it.
- **Listings:**
  - A PATCH with a group area gets 400 `{ error: 'pick a sub-area' }`.
  - A publish, or an edit of a non-draft listing, needs a sub-area or a pocket. Otherwise it gets 422 with `areaSlug` missing.
  - A live listing that has a group from before stays live, and its next edit must pick a sub-area.
- **Profiles:** up to 20 areas, at any level.
- **Match:** `findMatches` uses `profiles.areas && matchingAreas(...)`. It has no route yet.
- **Contract:** a new shared `areaSlug` schema (a slug regex, max 60), used by the listing area, the profile areas and `areasResponse`. `openapi.json` is regenerated.
- **Web stopgap**, until T-57:
  - the listing Where step shows the sub-areas and pockets as flat chips, with `TODO(T-57)`;
  - the profile editor shows only the groups.
- **Docs:**
  - PD2 is rewritten: the ten groups, the sub-areas, where Mumbai ends, the rejected alternatives and three Superseded lines.
  - `interface-shape`, `product-base`, the `team-plan.md` risk row and `learn/listings.md` follow.
  - The new learn page is `learn/areas.md`, and the ledgers are rebuilt.
- **Plan changes**, approved by the user:
  - T-22a's item is now "The API tells if a place is in a Mumbai area group, by its name or another name", and T-22a waits for T-56.
  - T-09's item has no count: "…area as the area groups of PD2…".
- **Tests:** 168 API tests and 32 web tests pass. Typecheck and lint pass. `drizzle-kit generate` gives no change.

## In progress: the T-56 review

The review is **3 blind reviewers (Standards, Spec, Lean) × 2 rounds**. Give each reviewer the spec's Decisions and Out of scope lists as settled facts. Round 1 is done and its fixes are committed.

Round 1 findings, for the PR "Review" section:

- **Fixed:**
  - `relatedAreas` → `matchingAreas`, as one filter;
  - a shared `areaSlug` contract type;
  - the error text `'pick a sub-area'`, because it was `'not a sub-area'` even for an unknown slug;
  - `interface-shape.md` no longer promises sub-area chips (T-09 is out of scope);
  - a comment on the test fixture is removed.
- **Rejected, with the reason:**
  - **Lean:** delete the migration test of 0011/0012. Rejected: the spec's acceptance criterion asks for "each listing and profile keeps its area (migration test)".
  - **Lean:** delete the profile test of mixed levels and the limit of 20. Rejected: it is a spec acceptance criterion.
  - **Lean:** delete the check of the 11 children of `thane-west`. Rejected: it checks a settled decision.
  - **Standards:** do the expansion in SQL (a recursive CTE), per database.md "complex queries in Postgres". Rejected:
    - the spec, which the user approved, chose a unit seam for the expansion;
    - the match is still one SQL array overlap;
    - the catalogue has 119 rows;
    - `findMatches` has no caller yet.
  - **Spec:** a pick that is not in the catalogue drops out of the match. Rejected: the profiles API rejects unknown slugs.
- **Ask the user, open:** "Dronagiri" is another name of Ulwe. Dronagiri is a CIDCO Navi Mumbai node, but it is in Uran taluka, and Uran is on the waitlist.

## What's next, in order

1. **Review round 2** of T-56: three new blind reviewers, the same inputs, `git diff origin/main...HEAD`. Exclude this file and the generated files: `docs/plan/**`, `*.html`, `drizzle/meta`, `openapi.json`. Fix the findings, or record the reason to reject each one.
2. **Done:** #162 is merged, and the branch is on `main`. #162's issue renames are synced.
3. **The PR stage of T-56**, from the agentic-devkit `build-feature` skill, references/pr.md:
   - delete `HANDOFF.md` and `HANDOFF-notes.md`;
   - tick the four T-56 items with the skill's `tick` script;
   - add a `## Log` entry to the T-56 note, and a journal entry in `docs/journal/2026-10.md`;
   - run `python3 tools/build-obsidian-plan.py`;
   - print the full PR body for approval;
   - open the PR, then `issue-status 163 in-review`.
   - **The PR body must say:**
     - the web stopgap;
     - the drop of the column needs #162 deployed first;
     - the code came before the tests in this ticket;
     - the open question about Dronagiri.
4. **The merge command for the user:**
   `! cd ~/Desktop/roomsie-repo && gh auth switch -u nirxv && gh pr review N --approve -R magentawood/roomsie && gh pr merge N --rebase --delete-branch -R magentawood/roomsie; gh auth switch -u n3rxv`
   Then mark the issue done, and watch the deploy. The deploy runs the migrations and the seed.
5. **T-57:**
   - design the pickers first, on our Figma drafts page (page node `261:42868`), with our tokens only;
   - check them at 390 px and 1440 px;
   - then build them:
     - the Where step: pick a group, then its sub-areas, with the pockets under their parent;
     - the profile editor: "All of" a group, or some of its sub-areas, with a search by the other names;
     - cards and details show "Versova, Andheri West".
   - Run the same pipeline: spec section in the task note, review, PR.
6. **Other open threads:** see [HANDOFF-notes.md](HANDOFF-notes.md#other-open-threads).

## Decisions, dead ends and gotchas

They are in [HANDOFF-notes.md](HANDOFF-notes.md). Read it too.
