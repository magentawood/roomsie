# Rule candidates

Review writes each mistake that no rule covers in this log. The rows to 2026-11-03 are in [part 1](_candidates-1.md). At the second time that review finds the same mistake, move it into the correct standards file as a rule. [_index.md](_index.md) gives the process.

## Format

Add one row for each mistake:

- **Date:** the date of the review, `YYYY-MM-DD`.
- **PR:** a link to the PR where review found the mistake.
- **Mistake:** one line in STE.

When a candidate becomes a rule, write the rule file in the Mistake cell, for example "→ rule in `api.md`", and move the row to [_candidates-archive.md](_candidates-archive.md).

## Log

| Date | PR | Mistake |
|---|---|---|
| 2026-11-04 | [#215](https://github.com/magentawood/roomsie/pull/215) | A value went into a `RegExp` with no escape. Escape each value before it goes into a pattern. |
| 2026-11-04 | [#215](https://github.com/magentawood/roomsie/pull/215) | Two handlers reported the same failure under different conditions. An error report for one failure has one condition in each handler. |
| 2026-11-04 | [#218](https://github.com/magentawood/roomsie/pull/218) | The JSON shape of the router prompt still offered the script `mixed`, but the new rule of the prompt gives the script of most of the letters. A prompt changes its shape when a rule removes a value. |
| 2026-11-04 | [#218](https://github.com/magentawood/roomsie/pull/218) | The runner sorted the thresholds with `.toSorted()` and no compare function, which sorts numbers as text. Sort numbers with `(a, b) => a - b`. |
| 2026-11-04 | [#218](https://github.com/magentawood/roomsie/pull/218) | A research doc showed a gap between two runs with the same prompts and named no cause. A doc that compares two runs names each change between them, or calls the gap noise. |
| 2026-11-04 | [#218](https://github.com/magentawood/roomsie/pull/218) | A run file had a stamp with no time zone and no seconds, so two runs in one minute wrote one file. A file stamp names its zone and is unique. |
| 2026-11-04 | [#215](https://github.com/magentawood/roomsie/pull/215) | `quoteIn` used a UTF-16 index of a joined string as an index of its list of code points, so an emoji before a quote shifted the slice or threw. A text helper uses one kind of index for one string, and its test has an emoji. |
| 2026-11-04 | [#215](https://github.com/magentawood/roomsie/pull/215) | The work after the reply saved the notes on the owner of the request, so a visitor who signed in while the observer ran lost the note. Work after the reply reads the owner again when it writes. |
| 2026-11-04 | [#215](https://github.com/magentawood/roomsie/pull/215) | The router got the flag `notes`, and no eval sentence asks for the notes, so the eval counts only false flags. A new flag of the router gets sentences that must set it, in each reply language. |
| 2026-11-04 | [#215](https://github.com/magentawood/roomsie/pull/215) | The backfill checks for a newer note, then saves in a second step, so a live note of the same topic that comes between the two can be replaced by an older note. Put the condition of the newer turn in the save. |
| 2026-11-04 | [#227](https://github.com/magentawood/roomsie/pull/227) | A test of a contract schema alone was in the API integration suite, with a name that told about the web. A test of a contract schema goes in `packages/contract`. |
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
