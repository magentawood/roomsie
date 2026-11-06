# Rule candidates

Review writes each mistake that no rule covers in this log. The rows to 2026-11-04 are in [part 1](_candidates-1.md). At the second time that review finds the same mistake, move it into the correct standards file as a rule. [_index.md](_index.md) gives the process.

## Format

Add one row for each mistake:

- **Date:** the date of the review, `YYYY-MM-DD`.
- **PR:** a link to the PR where review found the mistake.
- **Mistake:** one line in STE.

When a candidate becomes a rule, write the rule file in the Mistake cell, for example "→ rule in `api.md`", and move the row to [_candidates-archive.md](_candidates-archive.md).

## Log

| Date | PR | Mistake |
|---|---|---|
| 2026-11-05 | [#228](https://github.com/magentawood/roomsie/pull/228) | The analytics reads of the admin had no timeout and no catch, so a slow or failed analytics database failed the page and its switch. A read of a best-effort store gives no data on a failure, not an error of the page. |
| 2026-11-05 | [#229](https://github.com/magentawood/roomsie/pull/229) | A research page gave counts that were the sum of the reports of two runs and of their combined report, so each text counted twice. A count in a research doc comes from one report. |
| 2026-11-05 | [#231](https://github.com/magentawood/roomsie/pull/231) | The list of the turns parsed each stored answer with `JSON.parse` and no guard, so one row that did not parse failed the whole list. A read of stored text parses it safely, so one bad row does not fail the list. |
| 2026-11-05 | [#232](https://github.com/magentawood/roomsie/pull/232) | The rollup of the analytics events was a new kind of stored data, and PD19 had no row for it. A new kind of stored data gets its row in PD19 in the same PR. |
| 2026-11-05 | [#232](https://github.com/magentawood/roomsie/pull/232) | The SQL of the job and the TypeScript of the numbers both name the fields that the page splits. A split that one side misses gives 0 and no error. Two lists of one thing in two languages get a test that fails when they differ. |
| 2026-11-05 | [#232](https://github.com/magentawood/roomsie/pull/232) | The how-to of a new split in a learn page named only the migration, not the contract, the API and the page. A how-to in a learn page names each file that the change needs. |
| 2026-11-05 | [#232](https://github.com/magentawood/roomsie/pull/232) | The web cast an object built with `Object.fromEntries` to a closed `Record` of a contract enum. The cast checks no key, so a missing label still compiles. Use `satisfies`, or build the keys from the contract list. |
| 2026-11-06 | [#234](https://github.com/magentawood/roomsie/pull/234) | The job of the old visitor chats unlinked the waitlist entries of the old sessions before it deleted them, with no lock, so a claim in the gap kept a session whose entries had lost their chat. A job that deletes rows that a request can renew or claim locks them before its first write. |
| 2026-11-06 | [#234](https://github.com/magentawood/roomsie/pull/234) | The PD19 row of the visitor chats gave 30 days, but the nightly job adds up to one day. A PD19 row gives the longest time that the data stays. |
| 2026-11-06 | [#234](https://github.com/magentawood/roomsie/pull/234) | A learn page gave a query of the runs of all pg_cron jobs to check one job. A query to check a pg_cron job filters by the name of the job. |
| 2026-11-06 | [#234](https://github.com/magentawood/roomsie/pull/234) | A restore of the dump needs each pg_cron schedule again, and the learn page of the traces job gives no command for it. The learn page of each pg_cron job gives the command to schedule it again, and `backups.md` links that page. |
| 2026-11-06 | [#234](https://github.com/magentawood/roomsie/pull/234) | A restore command in a learn page gave only the schedule, but a new project has pg_cron off. A restore command gives each step in order, for example the extension, then the schedule. |
| 2026-11-06 | [#234](https://github.com/magentawood/roomsie/pull/234) | The dump uses `--no-acl`, so a restore drops the `REVOKE EXECUTE ... FROM PUBLIC` of each `jobs.*` function. The restore steps apply each revoke again. |
| 2026-11-06 | [#235](https://github.com/magentawood/roomsie/pull/235) | The privacy draft said that an ID check keeps its face match score, and the code deletes the score at the review. A legal text promises only what the code does, or what the done item of an open task builds. |
| 2026-11-06 | [#235](https://github.com/magentawood/roomsie/pull/235) | The privacy draft said "Settings, then Delete account", but an account with no profile has no delete row. A path in a legal text works for each kind of account. |
| 2026-11-06 | [#235](https://github.com/magentawood/roomsie/pull/235) | The texts copied rules and facts of PD3c, PD3d, PD4, PD8, PD9 and PD13, and the Sources of PD21 did not name them. When a legal text copies a rule or a number, its record is in the Sources of PD21. |
| 2026-11-06 | [#235](https://github.com/magentawood/roomsie/pull/235) | A legal text said one fact in two places, and the two drifted apart. A legal text states each fact once, and a second mention links to the first. |
| 2026-11-06 | [#235](https://github.com/magentawood/roomsie/pull/235) | The privacy draft said that "other people" see the building of a listing, but a visitor sees only the area. A "who sees" line in a legal text names its audience: a visitor or a signed-in person. |
| 2026-11-06 | [#235](https://github.com/magentawood/roomsie/pull/235) | The row of the tombstone said "its dates" and hid that the sign-up and deletion dates stay with no end. A retention row of data that outlives an account names each field that it keeps. |
