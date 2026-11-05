# Traces of the model calls

**In one line:** the API keeps the prompt and the raw answer of each model call of a chat for 30 days, masked and under a session code, and a moderator opens one turn on the AI pipeline as a timeline of its calls.

## What it is

- A **trace** is one attempt of a model call: the messages, the raw answer, the role, the model, the outcome, the time and the tokens. A retry and a call to the fallback are traces too.
- A **turn** is the model calls of one typed message: the router, the extractor and the composer, and the observer after the reply.
- A **session code** is "s-" and four characters from the goal, as "s-7f3a". It names a chat, never a person.
- The **mask** replaces each word of religion, and each community name that is not a language, with "[hidden]". A slot of religion or community in an answer shows "set".

## How it fits our project

```
a typed message ──▶ the model module ──▶ each attempt ──▶ the mask ──▶ the table of the traces
                                                              (after the call, never in its way)
the AI pipeline ──▶ Turns ──▶ one turn ──▶ the timeline and the prompt and answer of a call
                                    └──▶ a row of the audit log
each night at 04:15 IST ──▶ the job deletes each trace older than 30 days
```

| Part | Where |
|---|---|
| The mask | `apps/api/src/traces/mask.ts`, with the words in `traceMaskWords` of the contract |
| The save and the reads | `apps/api/src/traces/store.ts`. The model module saves through `req.server.traces` |
| The routes | `GET /v1/admin/ai/turns`, `GET /v1/admin/ai/turns/:key` and `GET /v1/admin/ai/trace-views`, for moderators |
| The tables | `traces` (its messages are a versioned jsonb), `trace_prompts` (each system prompt one time) and `trace_views` (the audit log) |
| The job | `jobs.delete_old_traces()`, scheduled with pg_cron by migration `0030` |
| The pages | the tab Turns of `/admin/ai`, `/admin/ai/turns/[key]`, and the trace views on Settings and log |

- A save goes after the attempt, in a queue. A failed save goes to the error report, and the call goes on.
- A call with no goal saves no trace: the check of the keys. The scripts (the eval and the backfill) give their calls a goal, but they give the model module `noTraces`, so they save no trace.
- The number of a turn is the number of the typed message in its chat.
- The result of a turn is "failed" when a role has no answer in any attempt, and "to the fallback" when a role went to the fallback.

## The choice we made

- What a trace keeps, the mask, the session code, the audit log and the 30 days: [PD20](../decisions/pd-20-model-traces.md).
- The period in the list of all the data: [PD19](../decisions/pd-19-retention.md).
- The religion and community lists that the mask starts from: [PD3c](../decisions/pd-03c-exclusionary-preferences.md).

## Gotchas

- **The mask is a word list.** A spelling that the list does not name stays readable. Add it to `traceMaskWords`, and the test of the mask checks it in each script.
- **The names of a language stay.** "Marathi only" stays readable in a trace ([PD20](../decisions/pd-20-model-traces.md)).
- **A word in Devanagari masks each ending that joins it**, so a word that only starts like a mask word is masked too. `traceMaskKeep` names the known ones, as "सिखाना" (to teach). A word in Latin letters masks only a short ending, so "sikhna" and "sikho" stay. "UP" alone stays, because "up to 20k" is common.
- **The system prompts are code**, so they keep their words, also the religion list of the extractor.
- **pg_cron runs only on Supabase.** Local work and the tests have no pg_cron, so the migration skips the schedule, and a test calls the function. See the runs with `select * from cron.job_run_details order by start_time desc`.
- **An open is a read.** Each open of the page of a turn reads it with no copy in the cache, so each open and each refresh adds a row of the audit log. A focus of the tab does not.

## Tickets

- T-64: [#231](https://github.com/magentawood/roomsie/pull/231), 2026-11-05. The traces, the mask, the nightly delete, the tab Turns and the page of a turn.
