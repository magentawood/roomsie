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
| 2026-10-28 | [#175](https://github.com/magentawood/roomsie/pull/175) | A call to an outside service inside a database transaction had no timeout. A hung service then holds the row lock. |
| 2026-10-28 | [#176](https://github.com/magentawood/roomsie/pull/176) | A best-effort side effect threw into its route after the write committed, so a saved action gave 500. Log the error, and do not throw. |
| 2026-10-28 | [#176](https://github.com/magentawood/roomsie/pull/176) | The analytics Drizzle config had no generate script, and it needed a database address that `.env.example` leaves empty. Each Drizzle config has a script that works with the `.env.example` values. |
| 2026-10-28 | [#178](https://github.com/magentawood/roomsie/pull/178) | The apps import `@roomsie/config` at run time, but list it only in `devDependencies`. It works because tsup and Next bundle it. Runtime code imports only the packages in `dependencies`, or the reason is written down. |
| 2026-11-01 | [#184](https://github.com/magentawood/roomsie/pull/184) | A schema that a handler writes used `z.object`, which drops unknown keys. A misspelled slot key then reads as empty with no error. Use `z.strictObject`. → rule in `assistant.md` ([#189](https://github.com/magentawood/roomsie/pull/189)) |
| 2026-11-02 | [#196](https://github.com/magentawood/roomsie/pull/196) | An inner variable took the name of an outer variable that the function used later, so the outer one was hidden. The shared ESLint config can turn on `@typescript-eslint/no-shadow`. |
| 2026-11-02 | [#197](https://github.com/magentawood/roomsie/pull/197) | The tap of a chip turn went into `chat_turns.parts` with no `version`, and the other shapes of that column have one. Each shape that a jsonb column keeps has a `version`. |
