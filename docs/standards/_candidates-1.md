# Rule candidates, part 1

The rows of [the log](_candidates.md) to 2026-11-03. New rows go into [the log](_candidates.md). At the second time of a mistake, check both files.

## Log

| Date | PR | Mistake |
|---|---|---|
| 2026-09-30 | — (source: standards extraction) | Code writes analytics events only through one `track()` function. Source: [T-24 task note](<../plan/tasks/T-24 Event logging.md>). |
| 2026-10-27 | [#172](https://github.com/magentawood/roomsie/pull/172) | The web showed the raw text of a sign-in error, for example "FirebaseError: … (auth/…)". Show the text of `errorText()`. |
| 2026-10-28 | [#176](https://github.com/magentawood/roomsie/pull/176) | A best-effort side effect threw into its route after the write committed, so a saved action gave 500. Log the error, and do not throw. |
| 2026-10-28 | [#176](https://github.com/magentawood/roomsie/pull/176) | The analytics Drizzle config had no generate script, and it needed a database address that `.env.example` leaves empty. Each Drizzle config has a script that works with the `.env.example` values. |
| 2026-10-28 | [#178](https://github.com/magentawood/roomsie/pull/178) | The apps import `@roomsie/config` at run time, but list it only in `devDependencies`. It works because tsup and Next bundle it. Runtime code imports only the packages in `dependencies`, or the reason is written down. |
| 2026-11-02 | [#200](https://github.com/magentawood/roomsie/pull/200) | With the trust of the proxy, the request log of Fastify wrote the IP address of each person. Redact `req.remoteAddress` in the logger. |
| 2026-11-02 | [#200](https://github.com/magentawood/roomsie/pull/200) | A plain SHA-256 of an IPv4 address can be reversed: there are only 2^32 addresses. Hash a short identifier with an HMAC and a secret key. Not done in T-21. |
| 2026-11-03 | [#204](https://github.com/magentawood/roomsie/pull/204) | A new required field of the contract broke the web build in CI, but `pnpm -w typecheck` passed. The `typecheck` task of `turbo.json` has no `dependsOn`, so turbo replayed the web result from its cache. Give `typecheck` the `dependsOn` `^typecheck`, or run the typecheck of the web directly. |
| 2026-11-03 | [#204](https://github.com/magentawood/roomsie/pull/204) | The chat screen copied each field of an API reply into the cache, and it did not copy the new required field `outsidePlaces`. When the web writes an API reply into the cache, it spreads the reply. |
| 2026-11-03 | [#207](https://github.com/magentawood/roomsie/pull/207) | The generated OpenAPI document said that the body of `POST /v1/goals` is required, but the route also takes a request with no body. The generator writes each body schema as required, and `.optional()` refuses a request with no body. The document gives the real optionality of each request body. In T-48, `withOptionalBodies()` in `apps/api/src/server.ts` marks a nullable body as not required. |
| 2026-11-03 | [#210](https://github.com/magentawood/roomsie/pull/210) | A modal put its close button last in the HTML, so `showModal()` focuses the name first. Its screen order and tab order differ. `ModalFrame` can set the element that gets the first focus. |
| 2026-11-03 | [#211](https://github.com/magentawood/roomsie/pull/211) | An update wrote an untyped object into `chat_turns.parts`. A value that code writes into a jsonb column has the type of its contract schema. |
| 2026-11-03 | [#212](https://github.com/magentawood/roomsie/pull/212) | The chat stored the goal of the address before the API accepted it, so a link to another person's goal cleared the own last goal. |
