# Cost and team

**Date:** 2026-09-20 · **Status:** working · **Decision:** PD5

**Team:** 4 tech, 2 marketing, 1 designer. Self-funded. Keep cost low and
quality high.

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
| A second Fly machine | ADR 0009 accepts a single machine today. This decision is worth a new review. |
| Vector store | **Not necessary.** Retrieval is SQL. The assistant does not search documents. It fills a form and runs a query. |

Why: [PD5](decisions/pd-05-team-and-budget.md)

## Team allocation

### The 2 marketing people can start now

Nothing blocks them.

1. **The broker calls.** The PD3 decision waits on these calls. They are the
   work with the highest value today.
2. **The blog.** Start immediately, and publish at `roomsie.com/blog`.

Why: [PD5](decisions/pd-05-team-and-budget.md)

### The designer has one unresolved decision

- The V3 prototype uses a warm cream palette with Bricolage Grotesque and Plus
  Jakarta Sans.
- ADR 0011 makes Figma the source of truth and generates `theme.css` from
  Untitled UI.
- At this time, `theme.css` is Untitled UI blue with Inter.
- These are two different design systems, and one must win.
- ADR 0011's token pipeline stays BLOCKED until the correct `theme.css` exists.
- This decision is the designer's first task, and it blocks frontend work.

### The 4 tech people

This division is approximate. We will make it firm when we know the hours.

| Person | Area |
|---|---|
| 1 | The agent layer: extraction, form state, the two-model split, cost controls |
| 2 | Web: the chat, the split view, the panel update rules |
| 3 | Data: schema, the location of the form in the schema, anonymous sessions, the query that drives the panel |
| 4 | Infra and CI, and the eval suite |

### The eval suite is real work and it is not optional

- ADR 0013 gives CI five minutes and a deterministic philosophy.
- Evals do not fit in CI. They run independently, on recorded conversations.
- The score is extraction accuracy, not string equality.
- Budget the eval suite as its own piece of work.

Why: [PD5](decisions/pd-05-team-and-budget.md)

## Open

- **At this time, we do not know the hours for each person each week.** This
  number turns the plan into a timeline.
- The previous base assumed 2 hours a day.

Why: [PD5](decisions/pd-05-team-and-budget.md)
