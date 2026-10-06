# Cost and team

**Date:** 2026-09-20 · **Status:** working · **Decision:** PD5

**Team:** see [PD5](decisions/pd-05-team-and-budget.md). Self-funded. Keep cost low and quality high.

## The important realisation about inference cost

**Most turns should cost nothing.** The interview has three turn types:

| Turn type | What happens | Model calls |
|---|---|---|
| **Chip tap** | The user taps a chip on a closed question. A script gives the next question. The answer is an enum. | **Zero** |
| **Typed answer, closed question** | The user types. Extract the text to an enum. | One small call |
| **Open question or user question** | Questions that chips cannot capture. Free text in the two directions. | One small call plus one good call |

- The first three turns are chips.
- A completed interview is approximately 8 to 12 model calls.

Why: [PD5](decisions/pd-05-team-and-budget.md)

## The five cost levers, in order of size

1. **Scripted turns need no model.** A closed question with chips is a scripted
   question and a typed enum. Do not send it to a model only because that is
   easy.
2. **Two models, not one.**
3. **Send the form, not the transcript.** Send the form with a small number of
   recent turns. A 30-turn conversation must not carry 30 turns of context.
4. **Cache the system prompt.**
5. **Chips shorten the interview.**

Why: [PD5](decisions/pd-05-team-and-budget.md)

## Where the real risk is

**Not unit cost, but volume and abuse.** The chat runs before login (PD6b).

The PD9 controls are a budget control, not only a safety control:

- A rate limit for each device and for each network
- A cap on anonymous turns before the login request
- The cheapest model and the shortest context for anonymous turns
- A hard daily spend ceiling, with a defined behaviour when spend gets to it
- An alert when daily spend crosses a threshold, before the ceiling

**Measure from day one:**

- For each turn, log tokens in, tokens out and the model.
- Tie the log to the session.
- Cost for each completed interview is a launch metric, not an afterthought.

Why: [PD5](decisions/pd-05-team-and-budget.md)

## What the AI layer adds to the monthly bill

The current base is approximately $50 to $80 a month.

| Item | Note |
|---|---|
| Inference | The variable cost. It scales with conversations, not users. |
| A second API machine | ADR 0009 accepts a single machine today. This decision is worth a new review. |
| Vector store | **Not necessary.** Retrieval is SQL. The assistant does not search documents. It fills a form and runs a query. |

Why: [PD5](decisions/pd-05-team-and-budget.md)

## Team

The team and its hours are in PD5. The plan and its order are in PD12 and `docs/team-plan.json`.

Why: [PD5](decisions/pd-05-team-and-budget.md), [PD12](decisions/pd-12-team-plan.md)
