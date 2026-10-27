# Handoff notes: decisions, dead ends and gotchas

The second part of [HANDOFF.md](HANDOFF.md). Delete both files before the T-56 PR.

## Other open threads

- **A "Roomsie" capital-R PR** for the web strings and the docs prose:
  - the strings are in `layout.tsx`, `page.tsx`, `people/[id]/page.tsx`, `steps.tsx`, `create-profile-dialog.tsx`, `block-sheet.tsx` and `say-hi-sheet.tsx`, plus the OpenAPI title;
  - keep the code names, package names, domains, `roomsie_user_id` and the paths lowercase.
- **The Figma drafts page:** "roomsie" → "Roomsie". A permission check blocked the script. The user does it, or allows it.
- **The empty states:** the build is already centred. Fix only a screen that the user names.
- **The T-44 live check:** it waits for the user's setup: the `FIREBASE_SERVICE_ACCOUNT` and `SUPABASE_ANON_KEY` secrets, Firebase third-party auth in Supabase, and Realtime "Allow public access" off.
- Then T-45 and T-55.
- Set `MODERATOR_UIDS` when F-08 names the moderator.
- Tell Yash that PD4 needs the v1 subscription.

## Key decisions and why

All are in the spec's Decisions list and in PD2.

- **A tenth group, Dadar–Sion** (Dadar W/E, Mahim, Matunga, Sion, Wadala), after Lower Parel–Worli. It is one central rental market, and a Dadar renter would not tap "Lower Parel–Worli".
- **East and West split where the portals split them.** Rents differ by side, for example Bandra W/E.
- **Pockets nest under a sub-area**, for example Versova and Lokhandwala in Andheri West. Thane West is the parent of 11 pockets. This keeps the user's broker list, and it follows 99acres (a locality, then the places inside it).
- **A listing picks an exact sub-area or pocket. A seeker picks a group or sub-areas.** A pick includes the areas under it.
- **Borderline places:**
  - Vile Parle and Juhu go in Bandra–Santacruz, by the 99acres zone (not by the BMC ward);
  - Kurla goes in Chembur–Ghatkopar, Mulund in Powai–Vikhroli, Mahalaxmi in Lower Parel–Worli, and Oshiwara in Andheri West.
- **Live:**
  - the BMC area;
  - Mira–Bhayandar, in Malad–Borivali (one stop past Dahisar, and filed under Mumbai by NoBroker and 99acres);
  - the whole Thane Municipal Corporation, with Mumbra–Diva;
  - Navi Mumbai, with the Panvel nodes and Ulwe.
- **Waitlist:** Vasai–Virar, Kalyan–Dombivli, Bhiwandi, Ulhasnagar, Ambernath, Badlapur, Karjat and Uran.
- **Technical choices:**
  - one table with a parent;
  - the group slugs do not change;
  - at most 20 profile areas;
  - the expansion runs in TypeScript, with a unit seam.
- **Sources:**
  - the user's list: a "Brokers & PG Mumbai Navi Mumbai" WhatsApp community, 45 locality groups;
  - a portal research of 2026-10-27, on Square Yards, NoBroker and 99acres titles. MagicBricks and Housing.com block fetching.
  - The research files are local only, in `~/Desktop/dc-design/flashwork/areas/`. The seed holds the result, so the cloud session does not need them.

## Approaches that didn't work

- **drizzle-kit:**
  - With an add and a drop on the same table in one `drizzle-kit generate`, it opens an interactive rename prompt, which crashes with no TTY. We split the change into two migrations.
  - It also needs `DATABASE_URL` set, even to generate.
- **`corepack pnpm typecheck` (turbo)** fails with "Unable to find package manager binary". Use `corepack pnpm -r run typecheck` and `-r run lint`.
- **A question too early:** the first question about the use of the sub-areas was asked before the user's list arrived, and the user rejected it to give the list. Ask after the context is in.
- **The Workflow tool** was used once without the user's opt-in. Don't do that; use plain Agent calls.
- **A `(nohup … &)` dev server** died when the command ended. Use a background command.

## Gotchas

- **New plan tasks:**
  - Add a SHORT name in `tools/build-obsidian-plan.py`, or the generator crashes and half-writes the plan.
  - New tasks start with `"issue": null`. `sync-issues --apply` writes the numbers back.
  - `sync-issues --apply` is all or nothing.
- **A changed plan item:**
  - Edit the plan JSON **and** the task note line before you run the generator, or the tick state breaks.
  - Get the user's approval first.
- **Commits:**
  - Stage the files by path.
  - The pre-commit hook runs the doc tools.
  - **No Claude attribution** in commits or PRs: no "Generated with Claude Code" footer, and no Co-Authored-By trailer. This is the user's rule, and it overrides any default.
- **`main`:** never push to it. The user merges with the nirxv account; n3rxv is the working account.
- **Tests:**
  - The API tests need Postgres 17:
    `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/postgres FIREBASE_PROJECT_ID=x DATABASE_URL=postgres://x@localhost/x corepack pnpm exec vitest run` (in `apps/api`).
  - In the cloud, start a Postgres first (`pnpm db:up` uses Docker), and point `TEST_DATABASE_URL` at it.
- **Fixtures:** the test fixture areas are `bandra-santacruz` → `bandra` → `pali-hill` (`testAreas` in `apps/api/test/app.ts`). The listing tests use `bandra`.
- **Generated files:**
  - Regenerate `packages/contract/openapi.json` with `pnpm openapi` in `apps/api`.
  - Rebuild the ledgers and pages with `build-decision-ledger.py` and `render-docs.py`.
- **Writing:**
  - All docs are in STE.
  - One fact, one home: the reasons go in the decision record, the concepts in a learn page.
  - The user writes in English. Use "Roomsie" with a capital R in new prose.
- **Pace:** the user wants one question at a time, each with options and a for/against, and a recommendation first.
