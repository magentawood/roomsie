# The last run of T-27

The run `2026-11-04T0835Z`, with the prompts and the code of T-27. The summary is [the eval of November 2026](eval-2026-11.md).

50 sentences of the eval set (M-03).

## deepseek-flash

At the threshold 0.8, 3 repeats of each sentence. A share is of all the repeats, and a count is the mean of one repeat. Check 6 of PD11: **go**.

| | All | English | Hinglish | Marathi |
|---|---|---|---|---|
| Turns with no answer of the extractor | 1% (1/150) | 0% (0/45) | 0% (0/54) | 2% (1/51) |
| Labelled slots right | 99% (472/475) | 99% (155/156) | 99% (166/168) | 100% (151/151) |
| Made-up values | 1 | 1 | 0 | 0 |
| Vague slots marked unclear | 97% (28/29) | 89% (8/9) | 100% (12/12) | 100% (8/8) |
| Vague slots with a value | 0 | 0 | 0 | 0 |
| Unclear in a slot with no label | 0.7 | 0 | 0.7 | 0 |
| Router language right | 100% (150/150) | 100% (45/45) | 100% (54/54) | 100% (51/51) |
| Router main script right | 100% (150/150) | 100% (45/45) | 100% (54/54) | 100% (51/51) |
| False alarms, above / below the threshold | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| False flags | 0 | 0 | 0 | 0 |
| Output not valid / failed, of the attempts | 0 / 6 of 305 | 0 / 0 of 90 | 0 / 0 of 108 | 0 / 6 of 107 |
| Extractor time, median / 95th percentile | 3040 / 9326 ms | 3001 / 6882 ms | 2843 / 8505 ms | 3450 / 10003 ms |
| Router time, median / 95th percentile | 1660 / 3587 ms | 1525 / 2554 ms | 1812 / 4055 ms | 1672 / 3240 ms |

### The threshold sweep

The recorded answers again, through the extractor at each threshold, with no new call.

| Threshold | Labelled slots right | Made-up values | Vague slots marked unclear | Vague slots with a value | PD11 |
|---|---|---|---|---|---|
| 0.5 to 0.95 (live: 0.8) | 99% (472/475) | 1 | 97% (28/29) | 0 | go |

### The misses

- e02 · roomType: label nothing, got "private" (3)
- e08 · intent: label "room", got "unclear" (1)
- e12 · intent: label "unclear", got nothing (1)
- h01 · `unclear` with no label (2): roomType
- h06 · budget: label {"min":null,"max":15000}, got nothing (1)
- h17 · mustHaves.tidy_flatmates: label "dealbreaker", got "unclear" (1)
- m11 · no answer of the extractor (1)

**Answers that change between the repeats:** e08, e12, h01, h06, h17, m11.

## gemini-3.5-flash-lite

At the threshold 0.8, 3 repeats of each sentence. A share is of all the repeats, and a count is the mean of one repeat. Check 6 of PD11: **no-go**.

| | All | English | Hinglish | Marathi |
|---|---|---|---|---|
| Turns with no answer of the extractor | 0% (0/150) | 0% (0/45) | 0% (0/54) | 0% (0/51) |
| Labelled slots right | 99% (471/477) | 98% (153/156) | 98% (165/168) | 100% (153/153) |
| Made-up values | 0.7 | 0.7 | 0 | 0 |
| Vague slots marked unclear | 57% (17/30) | 67% (6/9) | 50% (6/12) | 56% (5/9) |
| Vague slots with a value | 1 | 0 | 1 | 0 |
| Unclear in a slot with no label | 2.3 | 1.3 | 1 | 0 |
| Router language right | 95% (143/150) | 100% (45/45) | 93% (50/54) | 94% (48/51) |
| Router main script right | 94% (141/150) | 100% (45/45) | 100% (54/54) | 82% (42/51) |
| False alarms, above / below the threshold | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| False flags | 0 | 0 | 0 | 0 |
| Output not valid / failed, of the attempts | 0 / 0 of 300 | 0 / 0 of 90 | 0 / 0 of 108 | 0 / 0 of 102 |
| Extractor time, median / 95th percentile | 1355 / 1824 ms | 1330 / 1832 ms | 1389 / 1742 ms | 1332 / 1884 ms |
| Router time, median / 95th percentile | 1104 / 1534 ms | 1151 / 1610 ms | 1058 / 1483 ms | 1076 / 1521 ms |

### The threshold sweep

The recorded answers again, through the extractor at each threshold, with no new call.

| Threshold | Labelled slots right | Made-up values | Vague slots marked unclear | Vague slots with a value | PD11 |
|---|---|---|---|---|---|
| 0.5 to 0.95 (live: 0.8) | 99% (471/477) | 0.7 | 57% (17/30) | 1 | no-go |

### The misses

- e02 · roomType: label nothing, got "private" (1)
- e03 · lifestyle.your_days: label "student", got nothing (3)
- e09 · `unclear` with no label (1): lifestyle.food
- e09 · lifestyle.food: label nothing, got "veg" (1)
- e12 · intent: label "unclear", got nothing (3)
- e13 · `unclear` with no label (3): roomType
- h13 · intent: label "unclear", got nothing (3)
- h16 · `unclear` with no label (3): roomType
- h16 · intent: label "unclear", got "pg" (2)
- h16 · intent: label "unclear", got "room" (1)
- h17 · mustHaves.tidy_flatmates: label "dealbreaker", got "unclear" (3)
- m11 · lifestyle.drinks: label "unclear", got nothing (2)
- m12 · lifestyle.pets: label "unclear", got nothing (2)

**Answers that change between the repeats:** e02, e09, h16, h17, m06, m07, m11, m12.
