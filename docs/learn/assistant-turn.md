# The assistant turn

**In one line:** one entry point fills Form A from each typed message, and writes a reply with the next question.

## What it is

- A **goal** is one move, with its own chat and its own Form A ([ADR-0017](../decisions/0017-schema-v1-shape.md)). A **turn** is one message: the person types it, and the assistant replies.
- A **visitor** chats with no sign-in ([PD6b](../decisions/pd-06b-login-gate-and-search.md)). The first goal of a visitor makes a **visitor session**, and the API gives the browser a **visitor key** one time.
- A **handler** is one step of a turn. The **extractor** changes the text into Form A slots. The **reply writer** plans the reply, and the **composer** writes its words: see [The composer](composer.md). The **router** labels each message at the same time as the extractor: see [The router](router.md). The **observer** writes Form B notes after the reply: see [Form B notes](form-b-notes.md). The **advisor** answers a general question: see [The router](router.md).
- The **token probability** is the probability that the model gave to each piece of its answer. The extractor uses it as a **gate**: a value that the model was not sure of becomes `unclear` ([PD7](../decisions/pd-07-models.md)).

## How it fits our project

```
the chat screen ── POST /v1/goals/:id/turns ──▶ runTurn()
                                                  ├─ router ────▶ models.scored(): the label    } at the
                                                  ├─ extractor ──▶ models.scored() ──▶ DeepSeek, or Gemini   } same time
                                                  │     ├─ the gate on the token probabilities
                                                  │     ├─ the words check, the area names, the budget and date parsers
                                                  │     └─ applyValues(): the new form, the changes, the conflicts
                                                  ├─ the first message, like an open goal: "Same move?" holds it (goals.md)
                                                  ├─ advisor, on a 2a question: a short answer before the question,
                                                  │     and on a question about selected cards: an answer from their facts
                                                  ├─ reply writer: the line of the band, "Got it: …" and one question
                                                  │     (selected cards: the answer, and the table of code, T-49)
                                                  │     (the notes question: the notes and a scripted line, T-36)
                                                  └─ composer, on a core turn: the words in the language of the person
                                  saveTurn(): the two turns and the form, then the events
                                  the reply, with the notes hint one time after the first note
                                  then, after the reply: the observer, on a turn with context (T-36)
```

| Part | Where |
|---|---|
| The routes: start a goal, read a goal, send a turn | `apps/api/src/goals/routes.ts` |
| The goals, the turns and the visitor sessions | `apps/api/src/goals/store.ts` |
| The entry point: the router and the extractor at the same time | `apps/api/src/assistant/assistant.ts` |
| The extractor, its prompt and the parsers | `apps/api/src/assistant/handlers/extractor/` |
| The gate on the token probabilities, and the message of a turn, for each handler | `apps/api/src/assistant/handlers/gate.ts`, `turn-message.ts` |
| The reply writer and its lines | `apps/api/src/assistant/handlers/reply/` |
| The schemas of the routes and the handlers | `packages/contract/src/goals.ts` |

- **The visitor key.** The browser keeps it in session storage, for the visit of the tab, so a guest starts fresh on the next visit. It sends it in the header `X-Visitor-Key`. The database keeps only its SHA-256, so a log line or an event with the session id opens no chat. A session ends 30 days after the last visit ([PD19](../decisions/pd-19-retention.md)). A signed-in person sends the token, and the key too until T-17 moves the goals of the session.
- **The words of the person.** The model picks enum values, and it copies the words for the areas, the budget and the move date. Code makes sure that the words are in the turn. A Marathi ending on the last word counts, as "ठाणे वेस्ट" in "ठाणे वेस्टमध्ये" (T-27). Then `parseBudget` and `parseMoveDate` read them. They know "20k", "lakh", the Hindi and Marathi number words and month names in Latin and Devanagari, "agle mahine", "ASAP" and the date of today in IST. "zyada nahi" makes a maximum, Marathi endings such as "लाखापर्यंत" and "डिसेंबरमध्ये" count, and two amounts are a range only with a word such as "to" or "se" between them. A day and a month in the past go to next year. Words that a parser cannot read leave the slot empty.
- **The area names.** A name of the seed gives its areas, also inside longer words, as "Andheri station". The seed has each name in Devanagari too, and a Marathi ending counts, as "अंधेरीत" or "ठाण्यात". A name of two areas, such as "Andheri", leaves the slot empty, and the reply asks "Andheri West, Andheri East, or both?", one line for each such name. A slug that the model picked counts only if its name is in the turn, or in that area question.
- **The gate.** Only DeepSeek gives token probabilities. Below `ASSISTANT_MIN_PROBABILITY` (0.8), a value becomes `unclear`. A value that the tokens do not hold also becomes `unclear`, and the API reports it, as an answer of DeepSeek with no probabilities does. Gemini gives none, so its values have no gate.
- **Conflicts.** A new value never replaces an earlier stated value ([PD3b](../decisions/pd-03b-interview-vs-chips.md)). The reply asks which value to keep, and the assistant turn keeps that question. The next answer for that slot wins. Each conflict of a turn gets its question. "doosra wala" or "नया" keeps the new value, and "pehla" or "जुना" keeps the earlier value. An answer that settles nothing gets the question again. The extractor reads only the question of the last reply, not the "Got it" line before it. The event `slot_conflict` records the slot. A new area adds to the areas, and a new budget bound can fill the other bound.
- **The reply.** Code plans it. A question with selected cards gets the comparison of code, and keeps the open question ([Comparing cards](compare-cards.md)). A conflict comes first, then a name of two areas, then an unclear must-have weight ([PD15](../decisions/pd-15-form-a-contract.md)), then the next empty or unclear slot in `ASSISTANT_QUESTION_ORDER`. On a core turn, the composer writes its words.
- **The events.** The first turn of a goal fires `interview_started`. Each conflict fires `slot_conflict`, after the save.

## The choice we made

- The router, the small handlers and the extractor that picks only enum values: [PD7a](../decisions/pd-07a-agent-architecture.md).
- `unclear` in each enum, and the gate on token probability: [PD7](../decisions/pd-07-models.md).
- The visitor key, the scripted reply, the area rules and the gate that fails closed: the spec of T-12 ([#189](https://github.com/magentawood/roomsie/pull/189)).

## Gotchas

- **Put fixed text in the system prompt.** The prompt holds the enums, the area list from the database and the number forms. It has no date, so the cache of the vendor applies to each turn.
- **The two turns get the time of `clock_timestamp()`.** `now()` is the same for the whole transaction, so two inserts in two statements keep the reply after the turn of the person.
- **A 409 means that a different tab changed the goal.** The second turn does not replace the form of the first. The person sends the message again.
- **The catalogue loads one time for each database.** After a change of the area seed, start the API again.
- **In the tests, use `scored()` of `apps/api/test/goals.test.ts`.** It gives one token for each character, so a test can make one value unsure.
- **The handler schemas use `z.strictObject`** ([assistant.md](../standards/assistant.md)). A misspelled key then fails at once.

## Tickets

- T-12: [#189](https://github.com/magentawood/roomsie/pull/189), 2026-11-02. The goals routes, the visitor key, the extractor with the gate and the parsers, the scripted reply, and the chat screen that sends turns.
