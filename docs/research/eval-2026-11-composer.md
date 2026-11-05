# The eval of the composer and the router bands

**Date:** 2026-11-05 · **Status:** the results of T-61. They set `ROUTER_MIN_PROBABILITY` and `COMPOSER_DEADLINE_MS` by the two rules of [the spec of T-61](../plan/tasks/T-61%20Composer%20eval.md).
**Question:** Does the router put each message in its band? Does the composer reply in the language of the person, and does its output check stop a name? How long does the composer take?

---

## The headline

1. **The router gets each band right on DeepSeek, when it answers.** In the two runs, it got 114 of 114 answered turns of the other bands. It kept 10 of 10 `danger` and 10 of 10 `community`, with no false alarm. Each threshold from 0.5 to 0.95 gives the same scores, so `ROUTER_MIN_PROBABILITY` stays **0.8**.
2. **The composer replies in the language and the script that it gets.** On DeepSeek, 326 of 326 judged texts have the right language, and 327 of 327 the right script. No text is in English for a different reply language.
3. **No text has the name of the friend.** The composer wrote no name in the texts of the 6 sentences with a friend, on either model. Thus, the three limits of the name check did not occur.
4. **The old deadline was too short for DeepSeek.** At 2500 ms, only 71% of the DeepSeek composer calls answer in time. Thus, 29% of the replies go out as the scripted plan in English. The rule selects **3500 ms**: 92% in time.
5. **DeepSeek failed for approximately 3 minutes in its peak hours.** From approximately 12:18 IST on 2026-11-05, 70 attempts failed. Live, Gemini answers such a turn.
6. **Gemini, the fallback, has two problems.** Its output check stops 6 good texts, because of "1RK" and "December". It also flags a veg kitchen as a `community` preference in 2 of 6 repeats.

---

## The runs

- The runner sends each of the 78 sentences three times through the turn of the API, for each model ([Running the eval](../learn/eval-run.md)). A search goes through the composer, and the router then judges the language of the text. The judge is always DeepSeek.
- **The first run** is `2026-11-04T111619Z`, from 16:39 to 16:46 IST, outside the peak hours of DeepSeek (11:30 to 15:30 IST). A run at 16:21 IST had 73 sentences and an older run file, so it is not used.
- **The second run** is `2026-11-05T065135Z`, from 12:15 to 12:21 IST, in the peak hours.
- A turn with no answer of a handler counts apart, not as a wrong value ([the testing standards](../standards/testing.md)).

| | DeepSeek, first | DeepSeek, second | Gemini, first | Gemini, second |
|---|---|---|---|---|
| Labelled slots right | 100% (541/543) | 100% (521/521) | 99% (537/543) | 99% (536/543) |
| Vague slots marked unclear | 100% (30/30) | 100% (30/30) | 57% (17/30) | 67% (20/30) |
| Check 6 of PD11 | go | go | no-go | no-go |
| Turns with no answer of the router | 0 of 234 | 13 of 234 | 0 of 234 | 0 of 234 |
| Router language right | 100% (234/234) | 100% (221/221) | 99% (231/234) | 99% (231/234) |
| Other bands right | 100% (60/60) | 100% (54/54) | 100% (60/60) | 100% (60/60) |
| Danger kept / community kept | 6/6 · 6/6 | 4/4 · 4/4 | 6/6 · 6/6 | 6/6 · 6/6 |
| False alarms / false flags, mean of one repeat | 0 · 0 | 0 · 0 | 0 · 0.3 | 0 · 0.3 |
| Composer language right, of the judged texts | 100% (168/168) | 100% (158/158) | 100% (167/167) | 100% (36/36) |
| Composer texts that fail the check | 0 of 168 | 0 of 159 | 4 of 167 | 2 of 167 |
| Composer time of a call, median and 95th percentile | 1.7 s, 3.6 s | 1.9 s, 3.6 s | 1.0 s, 1.3 s | 1.1 s, 1.5 s |
| Extractor time of one attempt, median and 95th percentile | 2.5 s, 7.5 s | 2.6 s, 7.3 s | 1.3 s, 1.7 s | 1.4 s, 1.8 s |

- Each band has its own row in the report, also in Hindi in Devanagari. Each band is right in each language, on both models.
- The extractor times of these two reports also count the attempts of the sentences of the other bands. Since the review of #229, a report counts the extractor and composer attempts only of the searches, as the spec of T-61 asks.
- **The failure of DeepSeek.** All 13 turns with no answer of the router are Marathi sentences at the end of the run, m17 to m25. The failed attempts took from 0.1 s to 10 s, so they were errors of the vendor and timeouts. In the run of Gemini that came next, the judge failed too, so only 36 Gemini texts have a judged language in the second run.

---

## The deadline

The composer ran with no deadline, so each time is the full time of the call. A call with no answer counts as late.

| Deadline | DeepSeek, first | DeepSeek, second | DeepSeek, both | Gemini, both |
|---|---|---|---|---|
| 1500 ms | 39% (66/168) | 23% (38/162) | 32% (104/330) | 97% (325/334) |
| 2000 ms | 59% (99/168) | 53% (86/162) | 56% (185/330) | 100% (333/334) |
| 2500 ms (the old value) | 72% (121/168) | 69% (112/162) | 71% (233/330) | 100% (333/334) |
| 3000 ms | 86% (144/168) | 81% (131/162) | 83% (275/330) | 100% (333/334) |
| **3500 ms (the rule)** | 94% (158/168) | 91% (147/162) | **92% (305/330)** | 100% (333/334) |
| 4000 ms | 98% (164/168) | 96% (155/162) | 97% (319/330) | 100% (333/334) |

- The rule selects the smallest step where 9 of 10 DeepSeek calls answer in time, at most 4000 ms. With the two runs together, that is **3500 ms**. Each run alone gives the same step.
- On DeepSeek, the texts of Marathi and of Hindi in Devanagari are the slowest. Their attempts have a median of approximately 2.4 s to 2.9 s.
- A longer deadline costs nothing when the composer is fast. It sets only how long a slow call can take before the scripted plan goes out.

---

## The names

- The composer prompt says "Never write the name of a person". In the texts of both models for the 6 sentences with a friend, no text has the name.
- **Limit 1, a name that the composer makes up.** The report lists the capital words at the start of a sentence that are not in the plan or the message. The list has only words of Hinglish and Marathi, such as "Samajh", "Aap" and "Tumhi", and English words such as "Got". It has no name.

---

## Gemini

- **False rejections.** e11 says "1rk", and the plan says "a whole flat". Gemini writes "1RK" or "1 RK", a capital word that is not in the plan, so the check stops the text. In m09, Gemini writes "1 December 2026" for the "1 Dec 2026" of the plan. A false rejection is safe: the scripted plan goes out.
- **A false community flag.** h08 is "veg kitchen must hai, kharghar ya kamothe mein flat chahiye 18k tak". Gemini flags `community` in 2 of 6 repeats. Live, the turn then skips the composer, and the label goes into the log of [PD3c](../decisions/pd-03c-exclusionary-preferences.md).
- **The script of Marathi.** The router on Gemini calls 15% of the Marathi turns `latin`, as in T-27. The composer then writes Marathi in Latin letters for a message in Devanagari.

---

## What is still open

- **The fallback.** F-10 decides if the false community flag of Gemini is a no-go for the fallback ([PD11](../decisions/pd-11-launch.md)).
- **The name check.** No name occurred, so the three limits stay as they are. A fix is a follow-up only if a name passes in a later run.
- **The peak hours.** In the second run, DeepSeek gave no answer on 6% of the turns. A live turn then waits for the timeout of 10 s before Gemini answers.

---

## Sources

- The reports of the two runs and of the two runs together are in `apps/api/eval/runs/` of the computer that ran them, which git ignores. A follow-up copies them into this folder, as the eval of T-27 did.
- [Running the eval](../learn/eval-run.md), [the eval sentences](../learn/eval-set.md), [The composer](../learn/composer.md), [the eval of T-27](eval-2026-11.md).
