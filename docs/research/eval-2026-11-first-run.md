# The first run of T-27

The run `2026-11-04T0723`, with the prompts and the code of `main` before T-27, scored again with the report of T-27. The summary is [the eval of November 2026](eval-2026-11.md).

50 sentences of the eval set (M-03).

## deepseek-flash

At the threshold 0.8, 3 repeats of each sentence. Each count is the sum of the repeats. Check 6 of PD11: **no-go**.

| | All | English | Hinglish | Marathi |
|---|---|---|---|---|
| Labelled slots right | 91% (436/477) | 98% (153/156) | 100% (168/168) | 75% (115/153) |
| Made-up values | 1 | 1 | 0 | 0 |
| Vague slots marked unclear | 80% (24/30) | 100% (9/9) | 83% (10/12) | 56% (5/9) |
| Vague slots with a value | 1 | 0 | 1 | 0 |
| Unclear in a slot with no label | 110 | 9 | 63 | 38 |
| Router language right | 57% (85/150) | 100% (45/45) | 15% (8/54) | 63% (32/51) |
| Router main script right | 97% (145/150) | 100% (45/45) | 94% (51/54) | 96% (49/51) |
| False alarms, above / below the threshold | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| False flags | 0 | 0 | 0 | 0 |
| Output not valid / failed, of the attempts | 0 / 14 of 310 | 0 / 1 of 91 | 0 / 3 of 111 | 0 / 10 of 108 |
| Extractor time, median / 95th percentile | 3481 / 8281 ms | 3403 / 7077 ms | 3323 / 9000 ms | 4359 / 9466 ms |
| Router time, median / 95th percentile | 1890 / 3006 ms | 1557 / 2766 ms | 1907 / 3091 ms | 1960 / 2911 ms |

### The threshold sweep

The recorded answers again, through the extractor at each threshold, with no new call.

| Threshold | Labelled slots right | Made-up values | Vague slots marked unclear | Vague slots with a value | PD11 |
|---|---|---|---|---|---|
| 0.5 to 0.9 (live: 0.8) | 91% (436/477) | 1 | 80% (24/30) | 1 | no-go |
| 0.95 | 91% (435/477) | 1 | 80% (24/30) | 1 | no-go |

### The misses

- e02 · `unclear` with no label (2): roomType
- e02 · roomType: label nothing, got "private" (1)
- e03 · lifestyle.your_days: label "student", got nothing (3)
- e08 · `unclear` with no label (1): lifestyle.food, lifestyle.drinks, lifestyle.guests, lifestyle.your_days, lifestyle.sleep, lifestyle.tidiness, lifestyle.pets
- h04 · `unclear` with no label (3): lifestyle.food, lifestyle.drinks, lifestyle.guests, lifestyle.your_days, lifestyle.sleep, lifestyle.tidiness, lifestyle.pets
- h11 · `unclear` with no label (3): lifestyle.food, lifestyle.smoking, lifestyle.drinks, lifestyle.guests, lifestyle.sleep, lifestyle.tidiness, lifestyle.pets
- h13 · intent: label "unclear", got nothing (1)
- h15 · `unclear` with no label (3): lifestyle.food, lifestyle.smoking, lifestyle.guests, lifestyle.your_days, lifestyle.sleep, lifestyle.tidiness, lifestyle.pets
- h15 · lifestyle.drinks: label "unclear", got "fine_at_home" (1)
- m01 · `unclear` with no label (1): roomType
- m02 · areas: label ["thane-west"], got nothing (3)
- m02 · moveDate: label "2026-12-31", got nothing (3)
- m03 · areas: label ["vile-parle-east"], got nothing (3)
- m04 · areas: label ["malad-west"], got nothing (3)
- m05 · areas: label ["dadar-west"], got nothing (3)
- m05 · moveDate: label "2026-11-09", got nothing (3)
- m07 · `unclear` with no label (3): lifestyle.food, lifestyle.drinks, lifestyle.guests, lifestyle.your_days, lifestyle.sleep, lifestyle.tidiness, lifestyle.pets
- m07 · areas: label ["chembur"], got nothing (2)
- m08 · areas: label ["vashi","nerul"], got ["vashi"] (2)
- m09 · `unclear` with no label (1): roomType
- m09 · areas: label ["mulund-west"], got nothing (3)
- m10 · areas: label ["goregaon-east"], got nothing (3)
- m11 · areas: label ["kandivali-east"], got nothing (3)
- m11 · intent: label "room", got nothing (3)
- m11 · lifestyle.drinks: label "unclear", got nothing (3)
- m12 · `unclear` with no label (2): lifestyle.food, lifestyle.smoking, lifestyle.drinks, lifestyle.guests, lifestyle.your_days, lifestyle.sleep, lifestyle.tidiness
- m12 · areas: label ["borivali-west"], got nothing (3)
- m12 · intent: label "room", got nothing (1)
- m12 · lifestyle.pets: label "unclear", got nothing (1)
- m13 · `unclear` with no label (1): roomType

**Answers that change between the repeats:** e02, e08, h09, h13, h15, m01, m02, m04, m05, m07, m08, m09, m12, m13.

## gemini-3.5-flash-lite

At the threshold 0.8, 3 repeats of each sentence. Each count is the sum of the repeats. Check 6 of PD11: **no-go**.

| | All | English | Hinglish | Marathi |
|---|---|---|---|---|
| Labelled slots right | 95% (455/477) | 98% (153/156) | 98% (164/168) | 90% (138/153) |
| Made-up values | 0 | 0 | 0 | 0 |
| Vague slots marked unclear | 33% (10/30) | 56% (5/9) | 17% (2/12) | 33% (3/9) |
| Vague slots with a value | 11 | 2 | 6 | 3 |
| Unclear in a slot with no label | 169 | 24 | 85 | 60 |
| Router language right | 53% (80/150) | 100% (45/45) | 11% (6/54) | 57% (29/51) |
| Router main script right | 95% (143/150) | 100% (45/45) | 100% (54/54) | 86% (44/51) |
| False alarms, above / below the threshold | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| False flags | 0 | 0 | 0 | 0 |
| Output not valid / failed, of the attempts | 0 / 0 of 300 | 0 / 0 of 90 | 0 / 0 of 108 | 0 / 0 of 102 |
| Extractor time, median / 95th percentile | 1542 / 2670 ms | 1559 / 2694 ms | 1542 / 2079 ms | 1538 / 2470 ms |
| Router time, median / 95th percentile | 1225 / 2065 ms | 1317 / 2411 ms | 1205 / 1573 ms | 1217 / 1868 ms |

### The threshold sweep

The recorded answers again, through the extractor at each threshold, with no new call.

| Threshold | Labelled slots right | Made-up values | Vague slots marked unclear | Vague slots with a value | PD11 |
|---|---|---|---|---|---|
| 0.5 to 0.95 (live: 0.8) | 95% (455/477) | 0 | 33% (10/30) | 11 | no-go |

### The misses

- e03 · lifestyle.your_days: label "student", got nothing (3)
- e08 · `unclear` with no label (3): lifestyle.food, lifestyle.drinks, lifestyle.guests, lifestyle.your_days, lifestyle.sleep, lifestyle.tidiness, lifestyle.pets
- e12 · intent: label "unclear", got nothing (2)
- e13 · `unclear` with no label (3): roomType
- e14 · mustHaves.veg_kitchen: label "unclear", got "prefer" (2)
- h04 · `unclear` with no label (3): lifestyle.food, lifestyle.drinks, lifestyle.guests, lifestyle.your_days, lifestyle.sleep, lifestyle.tidiness, lifestyle.pets
- h08 · `unclear` with no label (1): mustHaves.non_smokers, mustHaves.no_alcohol, mustHaves.women_only, mustHaves.men_only, mustHaves.tidy_flatmates, mustHaves.couple_friendly
- h08 · intent: label "whole_flat", got "unclear" (1)
- h11 · `unclear` with no label (3): lifestyle.food, lifestyle.smoking, lifestyle.drinks, lifestyle.guests, lifestyle.sleep, lifestyle.tidiness, lifestyle.pets
- h13 · intent: label "unclear", got nothing (3)
- h14 · intent: label "unclear", got nothing (1)
- h15 · `unclear` with no label (3): lifestyle.food, lifestyle.smoking, lifestyle.guests, lifestyle.your_days, lifestyle.sleep, lifestyle.tidiness, lifestyle.pets
- h15 · lifestyle.drinks: label "unclear", got "fine_at_home" (3)
- h16 · intent: label "unclear", got "room" (3)
- h17 · mustHaves.tidy_flatmates: label "dealbreaker", got "unclear" (3)
- h18 · `unclear` with no label (2): lifestyle.food, lifestyle.smoking, lifestyle.drinks, lifestyle.guests, lifestyle.your_days, lifestyle.sleep, lifestyle.tidiness, lifestyle.pets
- m02 · areas: label ["thane-west"], got nothing (3)
- m02 · moveDate: label "2026-12-31", got nothing (3)
- m03 · areas: label ["vile-parle-east"], got nothing (3)
- m05 · moveDate: label "2026-11-09", got nothing (3)
- m06 · `unclear` with no label (2): mustHaves.non_smokers, mustHaves.no_alcohol, mustHaves.women_only, mustHaves.men_only, mustHaves.tidy_flatmates, mustHaves.couple_friendly
- m07 · `unclear` with no label (3): lifestyle.food, lifestyle.drinks, lifestyle.guests, lifestyle.your_days, lifestyle.sleep, lifestyle.tidiness, lifestyle.pets
- m08 · areas: label ["vashi","nerul"], got ["vashi"] (1)
- m09 · areas: label ["mulund-west"], got nothing (1)
- m10 · areas: label ["goregaon-east"], got nothing (1)
- m11 · `unclear` with no label (3): lifestyle.food, lifestyle.smoking, lifestyle.guests, lifestyle.your_days, lifestyle.sleep, lifestyle.tidiness, lifestyle.pets
- m11 · lifestyle.drinks: label "unclear", got "fine_at_home" (3)
- m12 · lifestyle.pets: label "unclear", got nothing (3)
- m16 · `unclear` with no label (1): mustHaves.non_smokers, mustHaves.no_alcohol, mustHaves.women_only, mustHaves.men_only, mustHaves.tidy_flatmates, mustHaves.couple_friendly

**Answers that change between the repeats:** e12, e14, h08, h14, h18, m04, m05, m06, m07, m08, m09, m10, m11, m16.
