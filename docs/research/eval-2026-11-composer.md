# The eval of the composer and the router bands

**Date:** 2026-11-04 · **Status:** the first run of T-61. The second run, in the peak hours of DeepSeek, is on 2026-11-05. The two values of the settings then come from the two runs ([the spec of T-61](../plan/tasks/T-61%20Composer%20eval.md)).
**Question:** Does the router put each message in its band? Does the composer reply in the language of the person, and does its output check stop a name? How long does the composer take?

---

## The headline

1. **The router gets each band right on DeepSeek.** It got 60 of 60 turns of the other bands, 6 of 6 `danger` and 6 of 6 `community`, with no false alarm. Each threshold from 0.5 to 0.95 gives the same scores. Thus, the rule keeps `ROUTER_MIN_PROBABILITY` at 0.8 in the first run.
2. **The composer replies in the language and the script that it gets.** On DeepSeek, 168 of 168 texts, and on Gemini 167 of 167, in each language group. No text is in English for a different reply language.
3. **No text has the name of the friend.** In the 18 texts of the 6 sentences with a friend on each model, the composer wrote no name. Thus, the three limits of the name check did not occur.
4. **The deadline of today is too short for DeepSeek.** At 2500 ms, only 72% of the DeepSeek composer calls answer in time. Thus, 28% of the replies go out as the scripted plan in English. The rule selects 3500 ms in the first run (94% in time).
5. **Gemini, the fallback, has two problems.** Its output check stops 4 good texts because of "1RK" and "December". It also flags a veg kitchen as a `community` preference in 1 of 3 repeats.

---

## The run

- The runner of T-61 sends each of the 78 sentences three times through the turn of the API, for each model ([Running the eval](../learn/eval-run.md)). A search goes through the composer, and the router then judges the language of the text. The judge is always DeepSeek.
- **The first run** is `2026-11-04T111619Z`, from 16:39 to 16:46 IST. This is outside the peak hours of DeepSeek (11:30 to 15:30 IST).
- A run at 16:21 IST had 73 sentences. Review round 1 added the 5 sentences in Hindi in Devanagari and the full answer of the judge to the run file. Thus, the first run ran again, and the run at 16:21 IST is not used.

| | DeepSeek | Gemini |
|---|---|---|
| Labelled slots right | 100% (541/543) | 99% (537/543) |
| Vague slots marked unclear | 100% (30/30) | 57% (17/30) |
| Check 6 of PD11 | go | no-go |
| Router language right | 100% (234/234) | 99% (231/234) |
| Router main script right | 100% (234/234) | 95% (223/234) |
| Other bands right | 100% (60/60) | 100% (60/60) |
| Danger kept / community kept | 6/6 · 6/6 | 6/6 · 6/6 |
| False alarms of the core band | 0 | 0 |
| False flags, mean of one repeat | 0 | 0.3 |
| Composer language right | 100% (168/168) | 100% (167/167) |
| Composer main script right | 100% (168/168) | 100% (167/167) |
| Composer texts that fail the check | 0% (0/168) | 2% (4/167) |
| Composer time of a call, median and 95th percentile | 1.7 s, 3.6 s | 1.0 s, 1.3 s |
| Extractor time, median and 95th percentile | 2.5 s, 7.5 s | 1.3 s, 1.7 s |

- Each band gets its own row in the report, also in Hindi in Devanagari. On both models, each band is right in each language.
- The extractor scores agree with [the eval of T-27](eval-2026-11.md), on more sentences.

---

## The deadline

The composer ran with no deadline, so each time is the full time of the call. A call with no answer counts as late. The rule selects the smallest step where 9 of 10 DeepSeek calls answer in time, with at most 4000 ms.

| Deadline | DeepSeek calls in time | Gemini calls in time |
|---|---|---|
| 1500 ms | 39% (66/168) | 99% (165/167) |
| 2000 ms | 59% (99/168) | 99% (166/167) |
| 2500 ms (live) | 72% (121/168) | 99% (166/167) |
| 3000 ms | 86% (144/168) | 99% (166/167) |
| **3500 ms (the rule)** | **94% (158/168)** | 99% (166/167) |
| 4000 ms | 98% (164/168) | 99% (166/167) |

- On DeepSeek, the texts of Marathi and of Hindi in Devanagari are the slowest. An attempt for Marathi has a median of 2.4 s and a 95th percentile of 4.7 s. For Hindi in Devanagari, they are 2.6 s and 5.2 s.
- A longer deadline costs nothing when the composer is fast. It sets only how long a slow call can take before the scripted plan goes out.

---

## The names

| | DeepSeek | Gemini |
|---|---|---|
| Texts of the 6 sentences with a friend | 18 | 18 |
| Texts with the name | 0 | 0 |

- The composer prompt says "Never write the name of a person". On these sentences, both models obey it.
- **Limit 1, a name that the composer makes up.** The report lists the capital words at the start of a sentence that are not in the plan or the message. The list has only words of Hinglish and Marathi, such as "Samajh", "Aap", "Tumhi" and "Theek", and English words such as "Just". It has no name.

---

## Gemini

- **False rejections.** e11 says "1rk", and the plan says "a whole flat". Gemini writes "1RK", a capital word that is not in the plan, so the check stops 3 of 3 texts. In m09, Gemini writes "1 December 2026" for the "1 Dec 2026" of the plan, and the check stops 1 text. A false rejection is safe: the scripted plan goes out.
- **A false community flag.** h08 is "veg kitchen must hai, kharghar ya kamothe mein flat chahiye 18k tak". Gemini flags `community` in 1 of 3 repeats. Live, the turn then skips the composer, and the label goes into the log of [PD3c](../decisions/pd-03c-exclusionary-preferences.md). In the first T-61 run at 16:21 IST, it flagged h08 in 3 of 3 repeats.
- **The script of Marathi.** The router on Gemini calls 15% of the Marathi turns `latin`, as in T-27. The composer then writes Marathi in Latin letters for a message in Devanagari.

---

## What is still open

- **The second run,** on 2026-11-05 in the peak hours of DeepSeek. The research page then adds the two runs and applies the two rules.
- **The fallback.** F-10 decides if the false community flag of Gemini is a no-go for the fallback ([PD11](../decisions/pd-11-launch.md)).
- **The name check.** No name occurred, so the three limits stay as they are. A fix is a follow-up only if a name passes in a later run.

---

## Sources

- The report of the first run, `apps/api/eval/runs/2026-11-04T122152Z.md`, a replay of `2026-11-04T111619Z.json`. The run files are on the computer that ran them, and git ignores them.
- [Running the eval](../learn/eval-run.md), [the eval sentences](../learn/eval-set.md), [The composer](../learn/composer.md), [the eval of T-27](eval-2026-11.md).
