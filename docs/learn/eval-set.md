# The eval sentences

**In one line:** 50 sentences that people type when they look for a place, in English, Hinglish and Marathi, each with the correct values of Form A, so a run of the extractor can be scored slot by slot.

## What it is

- **An eval set** is a fixed list of inputs with their correct answers. A model or a prompt gets a score on it, and two runs can be compared.
- **The labels** are the values of Form A after the parsers of the code: area slugs, the budget as its minimum and maximum, the move date as a date, and the values of the enums. The reference date is in the file, so "next month end" has one correct date.
- **An empty slot.** A slot that the label does not name must stay empty. The eval thus also finds a value that a model makes up.
- **The vague sentences.** 10 sentences are vague on purpose. The slot that they are vague about has the label `unclear`, and a model that fills it fails ([PD7](../decisions/pd-07-models.md): a model that never abstains fails).

## How it fits our project

| Part | Where |
|---|---|
| The sentences and their labels | `apps/api/eval/sentences.json` |
| The check of the labels | `apps/api/test/eval-set.test.ts` |
| The runner that scores a model | T-27 |

- **The mix.** 15 English, 18 Hinglish and 17 Marathi. Marathi has a heavy weight because, in the benchmark of PD7, Marathi had one of the largest decreases from English (9.63%).
- **The level of code-mix** is the share of the words from the other language: none, light (under a quarter), medium (a quarter to a half) or heavy (more than half). Place names and numbers do not count. **The script** is the script of the letters: digits belong to no script.
- **The check.** Each label must be a valid Form A and each area a slug of the seed, the script must agree with the letters, and the set must keep its counts and the forms that people type: "20k", "bees hazaar", "12,000", "next month end" and the Mumbai areas.

## The choice we made

- The format, the mix, the slots and the authoring: the spec of M-03. The method of the eval: [model-selection.md](../model-selection.md).

## Gotchas

- **The areas, the budget and the move date have no `unclear` value.** A sentence that is vague about them leaves them empty.
- **A name of two areas,** as "Andheri" alone, makes the assistant ask which one, so the labelled sentences use names with one area.
- **The parsers do not read each sentence yet.** "पुढच्या महिन्याच्या शेवटी" (m02) and "पुढच्या आठवड्यापासून" (m05) give no date today. The labels are correct, so T-27 finds the gap.
- **The set is small.** The full eval of PD7 has 200 to 300 sentences; these 50 are its start.

## Tickets

- M-03: the 50 sentences and their check.
