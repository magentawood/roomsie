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
| The runner that scores a model | `apps/api/eval/run.ts`: [Running the eval](eval-run.md) |
| The personal sentences of the observer, each with its topics | `apps/api/eval/observer-sentences.json` (T-36) |
| The runner of the observer | `pnpm eval:observer`, with its result in [observer-eval.md](../research/observer-eval.md) |

- **The mix.** 15 English, 18 Hinglish and 17 Marathi. Marathi has a heavy weight because, in the benchmark of PD7, Marathi had one of the largest decreases from English (9.63%).
- **The level of code-mix** is the share of the words from the other language: none, light (under a quarter), medium (a quarter to a half) or heavy (more than half). Place names and amounts do not count, as "25k" or "12,000"; a word with digits, as "1BHK", counts as a word, and a number in words counts as a word of its language. **The script** is the script of the letters: digits belong to no script.
- **The language and the register.** The set keeps the script of its letters. The runner gets the expected register from the language of a sentence and its letters, by the rule of the router ([The composer](composer.md)).
- **The check.** Each label must be a valid Form A and each area a slug of the seed, the script must agree with the letters, and the set must keep its counts and the forms that people type: "20k", "bees hazaar", "12,000", "next month end" and the Mumbai areas.

## The choice we made

- The format, the mix, the slots and the authoring: the spec of M-03. The method of the eval: [model-selection.md](../model-selection.md).

## Gotchas

- **A vague sentence leaves the question open.** "I drink sometimes" is not vague, because the two answers of the drinks question cover it. T-27 rewrote h15 and m11 so that they leave it open.
- **The areas, the budget and the move date have no `unclear` value.** A sentence that is vague about them leaves them empty.
- **A name of two areas,** as "Andheri" alone, makes the assistant ask which one, so the labelled sentences use names with one area.
- **The set of M-03 has almost no personal context.** Only a few sentences give a Form B note. Thus, T-36 adds 26 personal sentences, each with the topics of its notes. Two of them, about health and religion, must give no note.
- **The set is small.** The full eval of PD7 has 200 to 300 sentences; these 50 are its start.

## Tickets

- M-03: the 50 sentences and their check.
- T-27: the register rule, and the new h15 and m11.
- T-36: [#215](https://github.com/magentawood/roomsie/pull/215), 2026-11-04. The personal sentences of the observer, their check and the runner.
