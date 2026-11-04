# Running the eval

**In one line:** `pnpm eval` scores the extractor, the router and the composer of the API on the eval sentences, for each model.

## What it is

- **A run** sends each sentence three times through the turn of the API, and writes a report of the scores. Then each change of a prompt or a parser has a measurement.
- **The calls** go to the real models through the real handlers, as a live turn does ([PD7a](../decisions/pd-07a-agent-architecture.md)). The router and the extractor run in parallel, then the reply writer and the composer. The runner gives one model as the primary and as the fallback. A share is of all the repeats, a count of turns is the mean of one repeat, and a count of attempts is of all the attempts.
- **The judge (T-61).** After the composer, the router reads its text and gives the language. The judge always uses DeepSeek, also in the run of Gemini. Code gives the script from the letters.
- **The scores,** for each model and each language. Hindi in Devanagari has its own column (T-61):
  - **Turns with no answer** of the extractor or of the router: each attempt failed. Such a turn counts apart, not as wrong values.
  - **Labelled slots right:** the slots with a label that get that value.
  - **Made-up values:** a value in a slot that the label leaves empty.
  - **Vague slots marked unclear,** and **vague slots with a value.** A value there is a no-go of [PD11](../decisions/pd-11-launch.md), check 6.
  - **Unclear in a slot with no label:** an extra question, not a wrong value.
  - **The router:** the language and the main script of the register, and the false alarms. A false alarm is a sentence of the core band that the router puts in a different band, above or below its threshold. Also the share of the other bands that the router gets right, in all and for each band (T-61). Also the share of `danger` and `community` that it keeps.
  - **The composer (T-61):** the language and the script of each text, against the reply language that the composer got. Also the texts in English for a different reply language, and the texts that fail the output check, with the reason. The composer runs with no deadline. Thus, the report gives the share of the calls that answer in time at each deadline from 1500 to 4000 ms.
  - **The names (T-61):** for each search with a friend, the texts with the name, and if the name rules of the check stop each one. For a name that the rules miss, the report gives the limit, and if a different rule stops the text. The report also lists each new capital word at the start of a sentence, for a person to read. A new word is not in the plan or the message.
  - **The calls:** the output that is not valid and the failed attempts. Also the median and the 95th percentile of the time of each handler. The times include the failed attempts.
- **The threshold sweep.** The run file keeps each answer of the extractor and of the router with its token probabilities. The runner replays the answers through the extractor and the router at each threshold from 0.5 to 0.95, with no new call.
- **The rules (T-61).** The report gives the router threshold and the deadline that the rules of [the spec of T-61](../plan/tasks/T-61%20Composer%20eval.md) select.

## How it fits our project

| Part | Where |
|---|---|
| The runner | `apps/api/eval/run.ts` |
| The scores and the report | `apps/api/eval/score.ts` (unit tests in `test/eval-score.test.ts`) and `apps/api/eval/report.ts` |
| The run files and the reports | `apps/api/eval/runs/`, which git ignores. A stamp is the time in UTC |
| The results of T-27 | [the eval of November 2026](../research/eval-2026-11.md) |

1. Put `DEEPSEEK_API_KEY`, `GEMINI_API_KEY` and `TEST_DATABASE_URL` in `apps/api/.env.eval`. Git ignores the file. Never paste a key into a chat or a file in git.
2. Start the Postgres of the tests. The runner makes a database with the area seed, and drops it at the end.
3. In `apps/api`, run `corepack pnpm eval`. A run takes approximately three minutes and costs less than ₹50.
4. After a change of a parser or of the copy check, run `corepack pnpm eval --replay eval/runs/<file>.json`. It scores the answers of that run again, with no model call. A change of a prompt needs a new run. A replay refuses a run file of another version.
5. To score two runs together, give `--replay` two times. The repeats of the second file come after the repeats of the first file.

## The choice we made

- The scope, the models, the repeats, the tuning rule and the register: [the spec of T-27](../plan/tasks/T-27%20Eval%20run.md). The method: [model-selection.md](../model-selection.md).

## Gotchas

- **A model copies a name without its Marathi ending.** The copy check of the extractor accepts it ([The assistant turn](assistant-turn.md)).
- **Gemini gives no token probabilities,** so code cannot make its unsure values `unclear`. Its score of the vague slots is the risk of the fallback ([PD7](../decisions/pd-07-models.md)).
- **An answer can change between the repeats.** The report names each sentence where it changes, so a change of one sentence can be noise.
- **A replay uses the text of the current set.** When a sentence changes, its old answer no longer fits it.
- **A run file of T-27 has version 1.** It has no composer, so the runner of T-61 refuses it.
- **A prompt must not hold a sentence of the set.** A rule for one sentence raises the score and helps no user.

## Tickets

- T-27: the runner, the scores, the sweep and the replay.
- T-61: the composer, the judge, the router on the other bands, the two rules, and the replay of two runs.
