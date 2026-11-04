# The last run of T-27

The run `2026-11-04T0741`, with the prompts and the code of T-27. The summary is [the eval of November 2026](eval-2026-11.md).

50 sentences of the eval set (M-03).

## deepseek-flash

At the threshold 0.8, 3 repeats of each sentence. Each count is the sum of the repeats. Check 6 of PD11: **go**.

| | All | English | Hinglish | Marathi |
|---|---|---|---|---|
| Labelled slots right | 100% (477/477) | 100% (156/156) | 100% (168/168) | 100% (153/153) |
| Made-up values | 1 | 0 | 0 | 1 |
| Vague slots marked unclear | 100% (30/30) | 100% (9/9) | 100% (12/12) | 100% (9/9) |
| Vague slots with a value | 0 | 0 | 0 | 0 |
| Unclear in a slot with no label | 2 | 2 | 0 | 0 |
| Router language right | 99% (148/150) | 100% (45/45) | 96% (52/54) | 100% (51/51) |
| Router main script right | 100% (150/150) | 100% (45/45) | 100% (54/54) | 100% (51/51) |
| False alarms, above / below the threshold | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| False flags | 0 | 0 | 0 | 0 |
| Output not valid / failed, of the attempts | 0 / 1 of 301 | 0 / 0 of 90 | 0 / 0 of 108 | 0 / 1 of 103 |
| Extractor time, median / 95th percentile | 3217 / 6817 ms | 3454 / 8023 ms | 2703 / 4959 ms | 3443 / 7953 ms |
| Router time, median / 95th percentile | 1649 / 2917 ms | 1536 / 2855 ms | 1753 / 2569 ms | 1578 / 3048 ms |

### The threshold sweep

The recorded answers again, through the extractor at each threshold, with no new call.

| Threshold | Labelled slots right | Made-up values | Vague slots marked unclear | Vague slots with a value | PD11 |
|---|---|---|---|---|---|
| 0.5 to 0.95 (live: 0.8) | 100% (477/477) | 1 | 100% (30/30) | 0 | go |

### The misses

- e02 · `unclear` with no label (1): roomType
- e09 · `unclear` with no label (1): lifestyle.food
- m06 · lifestyle.food: label nothing, got "veg" (1)

**Answers that change between the repeats:** e02, e09, h12, m06.

## gemini-3.5-flash-lite

At the threshold 0.8, 3 repeats of each sentence. Each count is the sum of the repeats. Check 6 of PD11: **no-go**.

| | All | English | Hinglish | Marathi |
|---|---|---|---|---|
| Labelled slots right | 99% (470/477) | 98% (153/156) | 98% (164/168) | 100% (153/153) |
| Made-up values | 0 | 0 | 0 | 0 |
| Vague slots marked unclear | 57% (17/30) | 67% (6/9) | 42% (5/12) | 67% (6/9) |
| Vague slots with a value | 3 | 0 | 3 | 0 |
| Unclear in a slot with no label | 6 | 3 | 3 | 0 |
| Router language right | 96% (144/150) | 100% (45/45) | 94% (51/54) | 94% (48/51) |
| Router main script right | 96% (144/150) | 100% (45/45) | 100% (54/54) | 88% (45/51) |
| False alarms, above / below the threshold | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| False flags | 0 | 0 | 0 | 0 |
| Output not valid / failed, of the attempts | 0 / 0 of 300 | 0 / 0 of 90 | 0 / 0 of 108 | 0 / 0 of 102 |
| Extractor time, median / 95th percentile | 1408 / 1662 ms | 1420 / 1804 ms | 1353 / 1603 ms | 1431 / 1661 ms |
| Router time, median / 95th percentile | 1144 / 1422 ms | 1099 / 1427 ms | 1111 / 1419 ms | 1184 / 1450 ms |

### The threshold sweep

The recorded answers again, through the extractor at each threshold, with no new call.

| Threshold | Labelled slots right | Made-up values | Vague slots marked unclear | Vague slots with a value | PD11 |
|---|---|---|---|---|---|
| 0.5 to 0.95 (live: 0.8) | 99% (470/477) | 0 | 57% (17/30) | 3 | no-go |

### The misses

- e03 · lifestyle.your_days: label "student", got nothing (3)
- e12 · intent: label "unclear", got nothing (3)
- e13 · `unclear` with no label (3): roomType
- h08 · intent: label "whole_flat", got nothing (1)
- h13 · intent: label "unclear", got nothing (2)
- h14 · intent: label "unclear", got nothing (2)
- h16 · `unclear` with no label (3): roomType
- h16 · intent: label "unclear", got "pg" (1)
- h16 · intent: label "unclear", got "room" (2)
- h17 · mustHaves.tidy_flatmates: label "dealbreaker", got "unclear" (3)
- m11 · lifestyle.drinks: label "unclear", got nothing (2)
- m12 · lifestyle.pets: label "unclear", got nothing (1)

**Answers that change between the repeats:** h08, h13, h14, h16, m11, m12, m15.
