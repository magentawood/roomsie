# PD5 — Team and budget

**Status:** Settled · **Deciders:** Yash

## Context

roomsie is self-funded. The goal is to keep cost low and quality high.

The cost of inference depends on the turn type:

| Turn type | Model calls |
|---|---|
| Chip tap | Zero |
| Typed answer, closed question | One small call |
| Open question or user question | One small call plus one good call |

- The first three turns are chips.
- A completed interview is approximately 8 to 12 model calls, not 25. Most of these calls are small.
- The current infrastructure base is approximately $50 to $80 a month.

## Decision

**In one line:** The self-funded team is 5 engineers at 2 hours a day, 2 marketing and 1 designer, with five cost levers and no vector store.

- **5 engineers at 2 hours a day, 2 marketing, 1 designer.** Self-funded.
- Superseded: `cost-and-team.md` (2026-09-20) gave 4 tech people, with unknown hours. PD12 (2026-09-25) has five engineering lanes, and PD11 (2026-09-26) uses 5 × 2h × 17 days.
- Keep the cost low with five levers, in order of size:
  1. Scripted turns need no model.
  2. Two models, not one.
  3. Send the form, not the transcript.
  4. Cache the system prompt.
  5. Chips shorten the interview.
- No vector store.

## Rationale

- **The team size and hours come first.** We wrote all of the cost plan to be cheap in hours and in money. But we cannot make the schedule without the hours for each person.
- Only one turn type is expensive: the open phase, and only when the user types.
- Lever 2: extraction is a classification task, and a small, cheap model does it correctly. Conversation needs a good model. Extraction is most of the calls.
- Lever 3: the form is the state. If each call carries the full transcript, cost increases as the square of the length. Also, a transcript that is not current makes the model's behaviour worse. A summary that replaces the raw transcript is the primary control on cost.
- Lever 4: the system prompt is the same on each call. It is the largest fixed part of the input.
- Lever 5: fewer turns give less cost and less drop-off. The UX lever and the cost lever are the same lever. If an interview is too short, the matches are bad. If it is too long, nobody completes it.
- No vector store: matching is a database query, not a document search. Structured filters on Postgres do retrieval correctly and at low cost.
- No vector store also prevents a conflict with ADR 0001, which forbids proprietary extensions on the critical path. It saves money and a decision.

## Consequences

- The cost risk is volume and abuse, not unit cost. The chat runs before login (PD6b), thus anyone can start an interview.
- One interview is cheap. But a thousand interviews a month at some rupees each cost approximately all of the current infrastructure bill.
- The PD9 controls are a budget control, not only a safety control. Cost and latency is not a safety issue.
- For each turn, log tokens in, tokens out and the model. Tie the log to the session. Cost for each completed interview is a launch metric.
- One completed interview costs approximately ₹1–2 (PD7).
- Inference is the cost that changes. It scales with conversations, not users.
- A second API machine is worth a new review, because long in-flight agent requests make restarts much easier to see.
- The 2 marketing people can start at this time. Nothing blocks them. The broker calls have the highest value, because PD3 waits on them. The blog starts immediately, because SEO compounds slowly and articles need no users.
- The designer's first task is to choose between the V3 prototype palette and the Untitled UI `theme.css` of ADR 0011. It blocks frontend work.
  - Superseded (2026-10-02): the launch look comes from the Figma designs ([PD12](pd-12-team-plan.md)).
- The eval suite is work that we must budget, and it is not optional. Without it, each prompt change is a guess.

## Sources

- [CONTEXT.md, PD5, PD11 and PD12 rows](../../CONTEXT.md)
- [product-base.md, section 15 and its Why callout](../product-base.md)
- [cost-and-team.md and its Why callouts](../cost-and-team.md)
- [ai-agent-design.md, section 3.1](../ai-agent-design.md)
- [assistant-risks.md, sections 4.6 and 4.9](../assistant-risks.md)
