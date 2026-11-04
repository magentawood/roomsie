# Rule candidates

Review writes each mistake that no rule covers in this log. At the second time that review finds the same mistake, move it into the correct standards file as a rule. [_index.md](_index.md) gives the process.

## Format

Add one row for each mistake:

- **Date:** the date of the review, `YYYY-MM-DD`.
- **PR:** a link to the PR where review found the mistake.
- **Mistake:** one line in STE.

When a candidate becomes a rule, write the rule file in the Mistake cell, for example "→ rule in `api.md`", and move the row to [_candidates-archive.md](_candidates-archive.md).

## Log

| Date | PR | Mistake |
|---|---|---|
| 2026-09-30 | — (source: standards extraction) | Code writes analytics events only through one `track()` function. Source: [T-24 task note](<../plan/tasks/T-24 Event logging.md>). |
| 2026-10-27 | [#172](https://github.com/magentawood/roomsie/pull/172) | The web showed the raw text of a sign-in error, for example "FirebaseError: … (auth/…)". Show the text of `errorText()`. |
| 2026-10-28 | [#176](https://github.com/magentawood/roomsie/pull/176) | A best-effort side effect threw into its route after the write committed, so a saved action gave 500. Log the error, and do not throw. |
| 2026-10-28 | [#176](https://github.com/magentawood/roomsie/pull/176) | The analytics Drizzle config had no generate script, and it needed a database address that `.env.example` leaves empty. Each Drizzle config has a script that works with the `.env.example` values. |
| 2026-10-28 | [#178](https://github.com/magentawood/roomsie/pull/178) | The apps import `@roomsie/config` at run time, but list it only in `devDependencies`. It works because tsup and Next bundle it. Runtime code imports only the packages in `dependencies`, or the reason is written down. |
| 2026-11-02 | [#196](https://github.com/magentawood/roomsie/pull/196) | An inner variable took the name of an outer variable that the function used later, so the outer one was hidden. The shared ESLint config can turn on `@typescript-eslint/no-shadow`. |
| 2026-11-02 | [#197](https://github.com/magentawood/roomsie/pull/197) | The tap of a chip turn went into `chat_turns.parts` with no `version`, and the other shapes of that column have one. Each shape that a jsonb column keeps has a `version`. |
| 2026-11-02 | [#200](https://github.com/magentawood/roomsie/pull/200) | With the trust of the proxy, the request log of Fastify wrote the IP address of each person. Redact `req.remoteAddress` in the logger. |
| 2026-11-02 | [#200](https://github.com/magentawood/roomsie/pull/200) | A plain SHA-256 of an IPv4 address can be reversed: there are only 2^32 addresses. Hash a short identifier with an HMAC and a secret key. Not done in T-21. |
| 2026-11-02 | [#200](https://github.com/magentawood/roomsie/pull/200) | A test moved the time of all chat turns with an update that had no `where`, so it also changed the rows of other tests. A test changes only the rows that it made. |
| 2026-11-02 | [#202](https://github.com/magentawood/roomsie/pull/202) | The abuse test on roomsie.in wrote real sessions and about 90 `limit_hit` events with no test mark, so the launch numbers count the bot. A script against production marks its traffic, so the analytics can leave it out. |
| 2026-11-03 | [#204](https://github.com/magentawood/roomsie/pull/204) | A limit of rows for each chat counted the rows, then inserted, so two requests at the same time both passed the count. Take a lock for the chat in the transaction, for example `pg_advisory_xact_lock`. |
| 2026-11-03 | [#204](https://github.com/magentawood/roomsie/pull/204) | The prompt of the extractor changed, and no eval set ran: the repo has no eval set for the extractor yet. A change to the prompt of a handler runs the eval set of the handler before the merge. |
| 2026-11-03 | [#204](https://github.com/magentawood/roomsie/pull/204) | A new required field of the contract broke the web build in CI, but `pnpm -w typecheck` passed. The `typecheck` task of `turbo.json` has no `dependsOn`, so turbo replayed the web result from its cache. Give `typecheck` the `dependsOn` `^typecheck`, or run the typecheck of the web directly. |
| 2026-11-03 | [#204](https://github.com/magentawood/roomsie/pull/204) | The chat screen copied each field of an API reply into the cache, and it did not copy the new required field `outsidePlaces`. When the web writes an API reply into the cache, it spreads the reply. |
| 2026-11-03 | [#204](https://github.com/magentawood/roomsie/pull/204) | `goalOf` parses `form`, but it gives `outside_places` back as stored, typed only by `$type`. A goal that keeps a slug that the list removed then breaks the response check of each later reply. Parse a column with the `$type` of a contract enum when you read it. |
| 2026-11-03 | [#207](https://github.com/magentawood/roomsie/pull/207) | The generated OpenAPI document said that the body of `POST /v1/goals` is required, but the route also takes a request with no body. The generator writes each body schema as required, and `.optional()` refuses a request with no body. The document gives the real optionality of each request body. In T-48, `withOptionalBodies()` in `apps/api/src/server.ts` marks a nullable body as not required. |
| 2026-11-03 | [#210](https://github.com/magentawood/roomsie/pull/210) | A modal put its close button last in the HTML, so `showModal()` focuses the name first. Its screen order and tab order differ. `ModalFrame` can set the element that gets the first focus. |
| 2026-11-03 | [#211](https://github.com/magentawood/roomsie/pull/211) | An update wrote an untyped object into `chat_turns.parts`. A value that code writes into a jsonb column has the type of its contract schema. |
| 2026-11-03 | [#212](https://github.com/magentawood/roomsie/pull/212) | The chat stored the goal of the address before the API accepted it, so a link to another person's goal cleared the own last goal. |
| 2026-11-04 | [#212](https://github.com/magentawood/roomsie/pull/212) | `GET /v1/goals` had no limit. A list that grows with each action of a person has a limit. |
| 2026-11-04 | [#213](https://github.com/magentawood/roomsie/pull/213) | A new `chips` value would break a tab with an older bundle. |
| 2026-11-04 | [#214](https://github.com/magentawood/roomsie/pull/214) | A learn page said that Marathi had the largest decrease; PD7 says one of the largest. |
| 2026-11-04 | [#216](https://github.com/magentawood/roomsie/pull/216) | The JSON shape of the router prompt still offered the script `mixed`, but the new rule of the prompt gives the script of most of the letters. A prompt changes its shape when a rule removes a value. |
| 2026-11-04 | [#216](https://github.com/magentawood/roomsie/pull/216) | The runner sorted the thresholds with `.toSorted()` and no compare function, which sorts numbers as text. Sort numbers with `(a, b) => a - b`. |
| 2026-11-04 | [#216](https://github.com/magentawood/roomsie/pull/216) | A research doc showed a gap between two runs with the same prompts and named no cause. A doc that compares two runs names each change between them, or calls the gap noise. |
| 2026-11-04 | [#216](https://github.com/magentawood/roomsie/pull/216) | An eval counted a turn with no answer of the model as wrong slots, so a gain from fewer timeouts looked like a gain of a prompt. Count a failed call apart from a wrong answer. |
| 2026-11-04 | [#216](https://github.com/magentawood/roomsie/pull/216) | A run file had a stamp with no time zone and no seconds, so two runs in one minute wrote one file. A file stamp names its zone and is unique. |
