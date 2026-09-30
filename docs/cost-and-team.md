# Cost and team

**Date:** 2026-09-20 · **Status:** working · **Decision:** PD5

**Team:** 4 tech, 2 marketing, 1 designer. Self-funded. Keep spend low, keep
quality high.

---

## The important realisation about inference cost

**Most turns should cost nothing.**

The interview has three kinds of turn, and only one of them is expensive:

| Turn type | What happens | Model calls |
|---|---|---|
| **Chip tap** | User taps a chip on a closed question. The next question is scripted. The answer is an enum. | **Zero** |
| **Typed answer, closed question** | User types instead of tapping. Extract to an enum. | One small call |
| **Open question or user question** | The questions chips cannot capture. Free text both ways. | One small call plus one good call |

The first three turns are all chips. They cost nothing. The expensive part is
only the open phase, and only when the user types.

So a completed interview is not 25 model calls. It is closer to 8 to 12, most
of them small.

## The five cost levers, in order of size

1. **Scripted turns need no model.** Any closed question with chips is a
   scripted question and a typed enum. Do not route it through a model because
   it is convenient.
2. **Two models, not one.** Extraction is a classification task and a small
   cheap model does it well. Conversation needs a good model. Extraction is the
   majority of calls, so this is the biggest lever after lever 1.
3. **Send the form, not the transcript.** The form is the state. Send it plus
   the last few turns. A 30-turn conversation must not carry 30 turns of
   context, or cost grows quadratically with length.
4. **Cache the system prompt.** It is the same on every call and it is the
   largest fixed part of the input.
5. **Chips shorten the interview.** Fewer turns, less cost, less drop-off. The
   UX lever and the cost lever are the same lever.

## Where the real risk is

**Not unit cost. Volume and abuse.**

One interview is cheap. A thousand interviews a month at a few rupees each is
roughly the size of the entire current infrastructure bill. And because the
chat now runs before login (PD6b), anyone can start one.

So the controls in PD9 are a budget control, not just a safety control:

- Rate limit per device and per network
- Cap anonymous turns before asking for login
- Cheapest model and shortest context for anonymous turns
- A hard daily spend ceiling, with a defined behaviour when hit
- An alert when daily spend crosses a threshold, before the ceiling

**Measure from day one.** Log tokens in, tokens out, and model per turn, tied
to the session. Cost per completed interview is a launch metric, not an
afterthought.

---

## What the AI layer adds to the monthly bill

Current base is about $50 to $80 a month. Additions:

| Item | Note |
|---|---|
| Inference | The variable. Scales with conversations, not users. |
| A second Fly machine | ADR 0009 accepts a single machine today. Long in-flight agent requests make restarts much more visible. Worth revisiting. |
| Vector store | Not needed. Retrieval is SQL. See below. |

**No vector store is needed.** The assistant does not search documents. It
fills a form and runs a query. Structured filters over Postgres do this
correctly and cheaply. This avoids the conflict with ADR 0001, which forbids
proprietary extensions on the critical path, and it saves both money and a
decision.

---

## Team allocation

### The 2 marketing people can start now

They are not blocked on anything.

1. **The broker calls.** The PD3 decision waits on them. This is the highest
   value work available today.
2. **The blog.** SEO compounds slowly, so late starting costs real traffic.
   Articles need no users and no product. Start now, publish at
   `roomsie.com/blog`.

### The designer has one unresolved decision

The V3 prototype uses a warm cream palette with Bricolage Grotesque and Plus
Jakarta Sans. ADR 0011 makes Figma the source of truth and generates
`theme.css` from Untitled UI, which is currently still Untitled UI blue with
Inter.

These are two different design systems. One must win, and ADR 0011's token
pipeline is BLOCKED until the real `theme.css` exists. This is the designer's
first task and it blocks frontend work.

### The 4 tech people

Rough split, to be firmed once hours are known:

| Person | Area |
|---|---|
| 1 | The agent layer: extraction, form state, the two-model split, cost controls |
| 2 | Web: the chat, the split view, the panel update rules |
| 3 | Data: schema, the form's place in it, anonymous sessions, the query that drives the panel |
| 4 | Infra and CI, plus the eval suite |

### The eval suite is real work and it is not optional

ADR 0013 gives CI five minutes and a deterministic philosophy. Evals do not fit
there. They run separately, on recorded conversations, scored on extraction
accuracy rather than string equality.

It is the only thing that tells you whether a prompt change made the product
better or worse. Without it, every change is a guess. Budget it as its own
piece of work.

---

## Open

**Hours per person per week is still unknown,** and it is what turns this into
a timeline. The old base assumed 2 hours a day. Everything above is written to
be cheap in hours as well as in money, but the schedule cannot be drawn without
this number.
