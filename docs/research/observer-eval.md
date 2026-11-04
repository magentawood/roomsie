# Observer eval: Form B notes on the eval sentences

**Date:** 2026-11-04 · **Status:** eval result record of T-36 · **Model:** `deepseek-flash`, with `gemini-3.5-flash-lite` as the fallback
**Question:** Does the observer quote the person word for word, and does each note get the correct topic?

## The result

The run of 2026-11-04 at 15:19 IST, with the prompt of the review of T-36. The M-03 set is the set after T-27, with the new h15 and m11.

| Set | Sentences | Notes | Rejected by the quote check | Rejection rate | Expected topics found | Notes on an expected topic |
|---|---|---|---|---|---|---|
| The 50 sentences of M-03 | 50 | 2 | 0 | 0% | (no labels) | (no labels) |
| The personal sentences of T-36 | 26 | 27 | 0 | 0% | 25 of 26 | 25 of 27 |

- The two sentences with no expected note (health and religion) got no note.
- DeepSeek answered each of the 76 calls. The fallback did not run.
- The median time of a call was 1.4 s, and the 95th percentile was 3.7 s. The observer runs after the reply, so this time does not delay the reply.

## What the eval changed

The first run gave the same rejection rate, with two problems. The prompt now prevents both:

1. **Notes that repeat Form A.** "veg kitchen is a must" gave a cooking note, and "drinks kabhi kabhi" gave a hobbies note. The chips and the must-haves already hold these values. The prompt now lists the questions of the form, and tells the model that they are not notes.
2. **A gender in the value.** "रोज़ खुद बनाता हूँ" gave "cooks for himself". The prompt now asks for a value with no he, she, his or her.

The review added one more rule: night shifts and student days are answers of the form, so they are not notes. "mera night shift hota hai" (h11 of M-03) now gives no note.

## The misses

- **o02,** "I work night shifts at a call centre, so I sleep till 2pm": a work note, "Works night shifts at a call centre, sleeps till 2pm". It breaks the rule of the review, because night shifts are an answer of Form A. The label expects a commute note for the call centre only.
- **o06,** "I play the guitar in the evenings, I hope that's not a problem": the hobby note, and also a noise note about the guitar. The second note is not in the label.

## The limits of the set

- The personal set has 10 English, 8 Hinglish and 8 Marathi sentences, with no level of code-mix. The rule of `testing.md` asks for a heavy weight of Marathi and code-mix at 25%, 50% and 75% for the eval set of PD7.
- No count measures the rule of the chips. A miss shows only in the notes, as o02.

## Findings for other tasks

- **The confidence is almost always 1.0.** The token probability of the topic and the kind was 1.0 for each note but one (0.94). Thus, on these sentences the confidence does not separate a strong note from a weak note. Each note passes the floor of PD3a (T-14).
- **The two notes of the M-03 set** are near a search filter: "need a place somewhere near a station" (e12) and "bas station ke paas ho" (h13) each gave a commute note about a place near a station.

## The router after the notes flag

T-36 adds the flag `notes` to the router prompt, so `pnpm eval` ran on the branch (the rule of `testing.md`). DeepSeek: the language of the router right in 99% of the turns, the main script in 100%, and no false alarm and no false flag. The flag `notes` stayed false on each of the 150 search turns. Gemini set the flag `community` on h08 ("veg kitchen must hai") in 2 of 3 repeats. [The eval of November 2026](eval-2026-11.md) has the full method.

## How to run it again

1. Put the two model keys in `apps/api/.env.eval`.
2. Make sure that the local Postgres runs. The eval uses a disposable database for the topics.
3. Run `pnpm eval:observer` in `apps/api`. The output is JSON, with each note of each sentence.

The sentences are in `apps/api/eval/sentences.json` (M-03) and `apps/api/eval/observer-sentences.json` (T-36).
