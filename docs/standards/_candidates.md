# Rule candidates

Review writes each mistake that no rule covers in this log. At the second time that review finds the same mistake, move it into the correct standards file as a rule. [_index.md](_index.md) gives the process.

## Format

Add one row for each mistake:

- **Date:** the date of the review, `YYYY-MM-DD`.
- **PR:** a link to the PR where review found the mistake.
- **Mistake:** one line in STE.

When a candidate becomes a rule, write the rule file in the Mistake cell, for example "→ rule in `api.md`".

## Log

| Date | PR | Mistake |
|---|---|---|
| 2026-09-30 | — (source: standards extraction) | A module owns its tables. Other modules call its functions and never use its tables. Source: [extensibility.md](../extensibility.md), proposed. → rule in `database.md` ([#169](https://github.com/magentawood/roomsie/pull/169)) |
| 2026-09-30 | — (source: standards extraction) | Code writes analytics events only through one `track()` function. Source: [T-24 task note](<../plan/tasks/T-24 Event logging.md>). |
| 2026-10-08 | [#112](https://github.com/magentawood/roomsie/pull/112) | CI used the database address that the test code gives as a default. CI must set each connection detail in an env var. → rule in `testing.md` ([#138](https://github.com/magentawood/roomsie/pull/138)) |
| 2026-10-13 | [#138](https://github.com/magentawood/roomsie/pull/138) | A workflow reads secrets that no spec or inventory names. Each secret that a workflow reads needs a record that names it. → rule in `_index.md` ([#168](https://github.com/magentawood/roomsie/pull/168)) |
| 2026-10-27 | [#172](https://github.com/magentawood/roomsie/pull/172) | The web showed the raw text of a sign-in error, for example "FirebaseError: … (auth/…)". Show the text of `errorText()`. |
| 2026-10-28 | [#175](https://github.com/magentawood/roomsie/pull/175) | A call to an outside service inside a database transaction had no timeout. A hung service then holds the row lock. → rule in `api.md` ([#200](https://github.com/magentawood/roomsie/pull/200)) |
| 2026-10-28 | [#176](https://github.com/magentawood/roomsie/pull/176) | A best-effort side effect threw into its route after the write committed, so a saved action gave 500. Log the error, and do not throw. |
| 2026-10-28 | [#176](https://github.com/magentawood/roomsie/pull/176) | The analytics Drizzle config had no generate script, and it needed a database address that `.env.example` leaves empty. Each Drizzle config has a script that works with the `.env.example` values. |
| 2026-10-28 | [#178](https://github.com/magentawood/roomsie/pull/178) | The apps import `@roomsie/config` at run time, but list it only in `devDependencies`. It works because tsup and Next bundle it. Runtime code imports only the packages in `dependencies`, or the reason is written down. |
| 2026-11-01 | [#184](https://github.com/magentawood/roomsie/pull/184) | A schema that a handler writes used `z.object`, which drops unknown keys. A misspelled slot key then reads as empty with no error. Use `z.strictObject`. → rule in `assistant.md` ([#189](https://github.com/magentawood/roomsie/pull/189)) |
| 2026-11-02 | [#196](https://github.com/magentawood/roomsie/pull/196) | An inner variable took the name of an outer variable that the function used later, so the outer one was hidden. The shared ESLint config can turn on `@typescript-eslint/no-shadow`. |
| 2026-11-02 | [#197](https://github.com/magentawood/roomsie/pull/197) | The tap of a chip turn went into `chat_turns.parts` with no `version`, and the other shapes of that column have one. Each shape that a jsonb column keeps has a `version`. |
| 2026-11-02 | [#200](https://github.com/magentawood/roomsie/pull/200) | With the trust of the proxy, the request log of Fastify wrote the IP address of each person. Redact `req.remoteAddress` in the logger. |
| 2026-11-02 | [#200](https://github.com/magentawood/roomsie/pull/200) | A plain SHA-256 of an IPv4 address can be reversed: there are only 2^32 addresses. Hash a short identifier with an HMAC and a secret key. Not done in T-21. |
| 2026-11-02 | [#200](https://github.com/magentawood/roomsie/pull/200) | The Telegram call of the spend alert had no timeout, and the close of the server waits for it. Each call to an outside service has a timeout. → rule in `api.md` ([#200](https://github.com/magentawood/roomsie/pull/200)) |
| 2026-11-02 | [#200](https://github.com/magentawood/roomsie/pull/200) | A test moved the time of all chat turns with an update that had no `where`, so it also changed the rows of other tests. A test changes only the rows that it made. |
| 2026-11-02 | [#201](https://github.com/magentawood/roomsie/pull/201) | A required new field of a response broke the new web for the minutes that the old API still answered: `chips` in #197 and `typedTurnsLeft` in #200. → rule in `api.md` ([#201](https://github.com/magentawood/roomsie/pull/201)) |
| 2026-11-02 | [#201](https://github.com/magentawood/roomsie/pull/201) | In a deploy, the new web can send a new request shape or route to the old API (the chip tap of #197). A new request operates with the API before it, or the web shows a clear error. → rule in `api.md` ([#206](https://github.com/magentawood/roomsie/pull/206)) |
| 2026-11-02 | [#202](https://github.com/magentawood/roomsie/pull/202) | The abuse test on roomsie.in wrote real sessions and about 90 `limit_hit` events with no test mark, so the launch numbers count the bot. A script against production marks its traffic, so the analytics can leave it out. |
| 2026-11-03 | [#204](https://github.com/magentawood/roomsie/pull/204) | A limit of rows for each chat counted the rows, then inserted, so two requests at the same time both passed the count. Take a lock for the chat in the transaction, for example `pg_advisory_xact_lock`. |
| 2026-11-03 | [#204](https://github.com/magentawood/roomsie/pull/204) | The prompt of the extractor changed, and no eval set ran: the repo has no eval set for the extractor yet. A change to the prompt of a handler runs the eval set of the handler before the merge. |
| 2026-11-03 | [#204](https://github.com/magentawood/roomsie/pull/204) | A new required field of the contract broke the web build in CI, but `pnpm -w typecheck` passed. The `typecheck` task of `turbo.json` has no `dependsOn`, so turbo replayed the web result from its cache. Give `typecheck` the `dependsOn` `^typecheck`, or run the typecheck of the web directly. |
| 2026-11-03 | [#204](https://github.com/magentawood/roomsie/pull/204) | The chat screen copied each field of an API reply into the cache, and it did not copy the new required field `outsidePlaces`. When the web writes an API reply into the cache, it spreads the reply. |
| 2026-11-03 | [#204](https://github.com/magentawood/roomsie/pull/204) | `goalOf` parses `form`, but it gives `outside_places` back as stored, typed only by `$type`. A goal that keeps a slug that the list removed then breaks the response check of each later reply. Parse a column with the `$type` of a contract enum when you read it. |
| 2026-11-03 | [#204](https://github.com/magentawood/roomsie/pull/204) | Only a new cascade of `waitlist.goal_id` removed the waitlist entries at account deletion, and the comment of `deleteGoalsOf` did not name it. When a cascade does a part of account deletion, name it at the delete call. → rule in `_index.md` ([#207](https://github.com/magentawood/roomsie/pull/207)) |
| 2026-11-03 | [#205](https://github.com/magentawood/roomsie/pull/205) | The catch of the claim at sign-in hid each 4xx to silence the refusal of the invite gate, so a 401 or a 400 went unreported. → rule in `web.md` ([#206](https://github.com/magentawood/roomsie/pull/206)) |
| 2026-11-03 | [#205](https://github.com/magentawood/roomsie/pull/205) | A test took one chat turn with `limit(1)` and no order, and its fixture said that it was the first user turn. → rule in `testing.md` ([#210](https://github.com/magentawood/roomsie/pull/210)) |
| 2026-11-03 | [#207](https://github.com/magentawood/roomsie/pull/207) | The OpenAPI document said that the body of `POST /v1/goals` is required, but the route also takes no body. Fixed: `withOptionalBodies()` in `apps/api/src/server.ts` marks a nullable body as not required. |
| 2026-11-03 | [#207](https://github.com/magentawood/roomsie/pull/207) | A comment still named saveTurn as the only writer of assistant turns. → rule in `_index.md` ([#207](https://github.com/magentawood/roomsie/pull/207)) |
| 2026-11-03 | [#207](https://github.com/magentawood/roomsie/pull/207) | A learn page kept an old error text. → rule in `_index.md` ([#207](https://github.com/magentawood/roomsie/pull/207)) |
| 2026-11-03 | [#210](https://github.com/magentawood/roomsie/pull/210) | A modal put its close button last in the HTML, so its screen order and tab order differ. |
| 2026-11-03 | [#210](https://github.com/magentawood/roomsie/pull/210) | A test took the rows after a count from a select with no order, so a new earlier row (#207) made it fail at random. → rule in `testing.md` ([#210](https://github.com/magentawood/roomsie/pull/210)) |
| 2026-11-03 | [#211](https://github.com/magentawood/roomsie/pull/211) | An update wrote an untyped object, not of its contract schema, into the jsonb `chat_turns.parts`. |
| 2026-11-03 | [#212](https://github.com/magentawood/roomsie/pull/212) | The chat stored the goal of the address before the API accepted it. |
| 2026-11-04 | [#212](https://github.com/magentawood/roomsie/pull/212) | `GET /v1/goals`, a list that grows with each goal, had no limit. |
| 2026-11-04 | [#213](https://github.com/magentawood/roomsie/pull/213) | A new `chips` value would break a tab with an older bundle. |
| 2026-11-04 | [#213](https://github.com/magentawood/roomsie/pull/213) | The web read an API error text that no API test asserted, in #211 and #213. → rule in `testing.md` ([#213](https://github.com/magentawood/roomsie/pull/213)) |
