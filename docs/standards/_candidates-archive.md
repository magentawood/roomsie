# Rule candidates: the archive

The rows of [_candidates.md](_candidates.md) that became rules. Each row names its rule file. The log moves a row here when its rule is written, so the log keeps only the open candidates.

The rows to 2026-11-03 are in [part 1](_candidates-archive-1.md).

## Log

| Date | PR | Mistake |
|---|---|---|
| 2026-11-04 | [#213](https://github.com/magentawood/roomsie/pull/213) | The web read an API error text that no API test asserted, in #211 and #213. → rule in `testing.md` ([#213](https://github.com/magentawood/roomsie/pull/213)) |
| 2026-11-04 | [#214](https://github.com/magentawood/roomsie/pull/214) | A test name said "some Hinglish in Devanagari", but its check passed for each script that is not Latin. A test name claims only what its check proves. The second time: a test name said "for each language" with no check of English ([#218](https://github.com/magentawood/roomsie/pull/218)). → rule in `testing.md` ([#218](https://github.com/magentawood/roomsie/pull/218)) |
| 2026-11-04 | [#213](https://github.com/magentawood/roomsie/pull/213) | A new `chips` value would break a tab with an older bundle. Then the cards of the admin home in #227. → rule in `api.md` ([#227](https://github.com/magentawood/roomsie/pull/227)) |
| 2026-11-04 | [#227](https://github.com/magentawood/roomsie/pull/227) | The intro of the reports page told the review times of PD18 as fixed text, but the times are settings of the API, so the text goes false when a setting changes. A web text gives the value of an API setting only from the API. Then the empty queue in the same PR. → rule in `web.md` ([#227](https://github.com/magentawood/roomsie/pull/227)) |
| 2026-11-04 | [#212](https://github.com/magentawood/roomsie/pull/212) | `GET /v1/goals` had no limit. A list that grows with each action of a person has a limit. Then the log of the Gemini switch in #228. → rule in `api.md` ([#228](https://github.com/magentawood/roomsie/pull/228)) |
| 2026-11-04 | [#218](https://github.com/magentawood/roomsie/pull/218) | An eval counted a turn with no answer of the model as wrong slots, so a gain from fewer timeouts looked like a gain of a prompt. Count a failed call apart from a wrong answer. Then the band and flag scores of the router in #229. → rule in `testing.md` ([#229](https://github.com/magentawood/roomsie/pull/229)) |
| 2026-11-04 | [#214](https://github.com/magentawood/roomsie/pull/214) | A learn page said that Marathi had the largest decrease; PD7 says one of the largest. Then a learn page said that the log rows of a person go with the account, in #230. → rule in `_index.md` ([#230](https://github.com/magentawood/roomsie/pull/230)) |
| 2026-11-05 | [#228](https://github.com/magentawood/roomsie/pull/228) | The flip of the switch took the lock, but its row got `now()`, the time of the start of the transaction, so a flip that waited for the lock could get the older time. A row whose order a lock decides takes its time after the lock, for example `clock_timestamp()`. Then two rows of the moderation log in one transaction, in #230. → rule in `database.md` ([#230](https://github.com/magentawood/roomsie/pull/230)) |
| 2026-11-05 | [#230](https://github.com/magentawood/roomsie/pull/230) | The test of the home card counted the rows that the earlier tests of its file made, so it failed alone and in another order. A test checks only the rows that it or a shared fixture made. Then a test of the log of a deleted listing read the remove of the test before it, in #230. → rule in `testing.md` ([#230](https://github.com/magentawood/roomsie/pull/230)) |
