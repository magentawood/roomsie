# Running the eval

**In one line:** `pnpm eval` sends the 50 eval sentences through the extractor and the router of the API, three times for each model, and writes a report of the scores, so each change of a prompt or a parser has a measurement.

## What it is

- **A run** calls the real models through the real handlers, as a live turn does: the router and the extractor in parallel ([PD7a](../decisions/pd-07a-agent-architecture.md)). The runner gives one model as the primary and as the fallback, so each score is of one model. Each sentence runs three times, because the answers of a model change.
- **The scores,** for each model and each language:
  - **Labelled slots right:** the slots with a label that get that value.
  - **Made-up values:** a value in a slot that the label leaves empty.
  - **Vague slots marked unclear,** and **vague slots with a value.** A value there is a no-go of [PD11](../decisions/pd-11-launch.md), check 6.
  - **Unclear in a slot with no label:** an extra question, not a wrong value.
  - **The router:** the language and the main script of the register, and the false alarms. A false alarm is a search that the router puts in a different band, above or below its threshold.
  - **The calls:** the output that is not valid, the failed attempts, and the median and the 95th percentile of the time.
- **The threshold sweep.** The run file keeps each answer of the extractor model with its token probabilities. The runner replays the answers through the extractor at each threshold from 0.5 to 0.95, with no new call.

## How it fits our project

| Part | Where |
|---|---|
| The runner | `apps/api/eval/run.ts` |
| The scores and the report | `apps/api/eval/score.ts` (unit tests in `test/eval-score.test.ts`) and `apps/api/eval/report.ts` |
| The run files and the reports | `apps/api/eval/runs/`, which git ignores |
| The results of T-27 | [the eval of November 2026](../research/eval-2026-11.md) |

1. Put `DEEPSEEK_API_KEY`, `GEMINI_API_KEY` and `TEST_DATABASE_URL` in `apps/api/.env.eval`. Git ignores the file. Never paste a key into a chat or a file in git.
2. Start the Postgres of the tests. The runner makes a database with the area seed, and drops it at the end.
3. In `apps/api`, run `corepack pnpm eval`. A run takes approximately three minutes and costs less than ₹50.
4. After a change of a parser or of the copy check, run `corepack pnpm eval --replay eval/runs/<file>.json`. It scores the answers of that run again, with no model call. A change of a prompt needs a new run.

## The choice we made

- The scope, the models, the repeats, the tuning rule and the register: the spec of T-27. The method: [model-selection.md](../model-selection.md).

## Gotchas

- **A model copies a name without its Marathi ending,** as "ठाणे वेस्ट" from "ठाणे वेस्टमध्ये". The copy check of the extractor accepts the endings of the area catalogue (PC-09).
- **Gemini gives no token probabilities,** so code cannot make its unsure values `unclear`. Its score of the vague slots is the risk of the fallback ([PD7](../decisions/pd-07-models.md)).
- **An answer can change between the repeats.** The report names each sentence where it changes, so a change of one sentence can be noise.
- **A replay uses the text of the current set.** When a sentence changes, its old answer no longer fits it.
- **A prompt must not hold a sentence of the set.** A rule for one sentence raises the score and helps no user.

## Tickets

- T-27: the runner, the scores, the sweep and the replay.
