# Observer eval: Form B notes on the eval sentences

**Date:** 2026-11-04 · **Status:** eval result record of T-36 · **Model:** `deepseek-flash`, with `gemini-3.5-flash-lite` as the fallback
**Question:** Does the observer quote the person word for word, and does each note get the correct topic?

## The result

| Set | Sentences | Notes | Rejected by the quote check | Rejection rate | Expected topics found | Notes on an expected topic |
|---|---|---|---|---|---|---|
| The 50 sentences of M-03 | 50 | 3 | 0 | 0% | (no labels) | (no labels) |
| The personal sentences of T-36 | 26 | 26 | 0 | 0% | 26 of 26 | 26 of 26 |

- The two sentences with no expected note (health and religion) got no note.
- DeepSeek answered each of the 76 calls. The fallback did not run.
- The median time of a call was 1.4 s, and the 90th percentile was 3.0 s. The observer runs after the reply, so this time does not delay the reply.

## What the eval changed

The first run gave the same rejection rate and topics, with two problems. The prompt now prevents both:

1. **Notes that repeat Form A.** "veg kitchen is a must" gave a cooking note, and "drinks kabhi kabhi" gave a hobbies note. The chips and the must-haves already hold these values. The prompt now lists the questions of the form, and tells the model that they are not notes.
2. **A gender in the value.** "रोज़ खुद बनाता हूँ" gave "cooks for himself". The prompt now asks for a value with no he, she, his or her.

## Findings for other tasks

- **The confidence is always 1.0.** The token probability of the topic and the kind was 1.0 for each note. Thus, on these sentences the confidence does not separate a strong note from a weak note. Each note passes the floor of PD3a (T-14).
- **The one doubtful note of the M-03 set:** "need a place somewhere near a station" gave the commute note "Needs a place near a station". This text is near a search filter.
- **The other two notes of the M-03 set:** "mera night shift hota hai" gave a work note, which is correct. "khana included" gave a cooking note, which is doubtful.

## How to run it again

1. Put the two model keys in `apps/api/.env`.
2. Make sure that the local Postgres runs. The eval uses a disposable database for the topics.
3. Run `pnpm eval:observer` in `apps/api`. The output is JSON, with each note of each sentence.

The sentences are in `apps/api/eval/sentences.json` (M-03) and `apps/api/eval/observer-sentences.json` (T-36).
