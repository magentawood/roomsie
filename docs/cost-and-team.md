# Cost and team

**Date:** 2026-09-20 · **Status:** working · **Decision:** PD5

**Team:** 4 tech, 2 marketing, 1 designer. Self-funded. Keep cost low and
quality high.

## The important realisation about inference cost

**Most turns should cost nothing.** Of the three turn types, only one is
expensive:

| Turn type | What happens | Model calls |
|---|---|---|
| **Chip tap** | The user taps a chip on a closed question. A script gives the next question. The answer is an enum. | **Zero** |
| **Typed answer, closed question** | The user types. Extract the text to an enum. | One small call |
| **Open question or user question** | Questions that chips cannot capture. Free text in the two directions. | One small call plus one good call |

The first three turns are chips, and cost nothing. Only the open phase is
expensive, and only when the user types. Thus, a completed interview is not 25
model calls, but approximately 8 to 12, and most are small.

## The five cost levers, in order of size

1. **Scripted turns need no model.** A closed question with chips is a scripted
   question and a typed enum. Do not send it to a model only because that is
   easy.
2. **Two models, not one.** Extraction is a classification task, and a small,
   cheap model does it correctly. Conversation needs a good model. Extraction
   is most of the calls, thus this is the largest lever after lever 1.
3. **Send the form, not the transcript.** The form is the state. Send it with a
   small number of recent turns. A 30-turn conversation must not carry 30 turns
   of context. If it does, cost increases as the square of the length.
4. **Cache the system prompt.** It is the same on each call, and it is the
   largest fixed part of the input.
5. **Chips shorten the interview.** Fewer turns give less cost and less
   drop-off. The UX lever and the cost lever are the same lever.

## Where the real risk is

**Not unit cost, but volume and abuse.** One interview is cheap. But a thousand
interviews a month at a small number of rupees each cost approximately all of
the current infrastructure bill. The chat runs before login (PD6b), thus anyone
can start an interview.

Thus, the PD9 controls are a budget control, not only a safety control:

- A rate limit for each device and for each network
- A cap on anonymous turns before the login request
- The cheapest model and the shortest context for anonymous turns
- A hard daily spend ceiling, with a defined behaviour when spend gets to it
- An alert when daily spend crosses a threshold, before the ceiling

**Measure from day one.** For each turn, log tokens in, tokens out and the
model, and tie the log to the session. Cost for each completed interview is a
launch metric, not an afterthought.

## What the AI layer adds to the monthly bill

The current base is approximately $50 to $80 a month. The additions:

| Item | Note |
|---|---|
| Inference | The variable cost. It scales with conversations, not users. |
| A second Fly machine | ADR 0009 accepts a single machine today. Long in-flight agent requests make restarts much more visible. This decision is worth a new review. |
| Vector store | Not necessary. See below. |

**We do not need a vector store.** Retrieval is SQL. The assistant does not
search documents. It fills a form and runs a query. Structured filters on
Postgres do this correctly and at low cost.

This prevents a conflict with ADR 0001, which forbids proprietary extensions
on the critical path. It also saves money and a decision.

## Team allocation

### The 2 marketing people can start now

Nothing blocks them.

1. **The broker calls.** The PD3 decision waits on these calls. They are the
   work with the highest value today.
2. **The blog.** SEO compounds slowly, thus a late start causes a large loss of traffic. Articles need no users and no product. Start immediately, and
   publish at `roomsie.com/blog`.

### The designer has one unresolved decision

The V3 prototype uses a warm cream palette with Bricolage Grotesque and Plus
Jakarta Sans. ADR 0011 makes Figma the source of truth and generates
`theme.css` from Untitled UI. At this time, `theme.css` is Untitled UI blue
with Inter.

These are two different design systems, and one must win. ADR 0011's token
pipeline stays BLOCKED until the correct `theme.css` exists. This decision is
the designer's first task, and it blocks frontend work.

### The 4 tech people

This division is approximate. We will make it firm when we know the hours.

| Person | Area |
|---|---|
| 1 | The agent layer: extraction, form state, the two-model split, cost controls |
| 2 | Web: the chat, the split view, the panel update rules |
| 3 | Data: schema, the location of the form in the schema, anonymous sessions, the query that drives the panel |
| 4 | Infra and CI, and the eval suite |

### The eval suite is real work and it is not optional

ADR 0013 gives CI five minutes and a deterministic philosophy. Evals do not fit
in CI. They run independently, on recorded conversations. The score is
extraction accuracy, not string equality.

Only the eval suite tells you if a prompt change made the product better or
worse. Without it, each change is a guess. Budget it as its own piece of work.

## Open

**At this time, we do not know the hours for each person each week.** This
number turns the plan into a timeline. The previous base assumed 2 hours a day.
We wrote all of the above to be cheap in hours and in money. But we cannot make
the schedule without this number.
