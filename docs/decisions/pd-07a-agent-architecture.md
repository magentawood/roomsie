# PD7a — Agent architecture: a router with small handlers

**Status:** Settled. Changed 2026-11-04, 2026-11-11. · **Date:** 2026-09-26 · **Deciders:** Yash

## Context

The options were one large model, a multi-agent system, or a router with small
handlers.

## Decision

**In one line:** A router sends each turn to the smallest handler that can serve it, and all of it ships at launch.

**A router sends each turn to the smallest handler that can serve it.** Not
multi-agent, and not one large model. **All of it ships at launch.**

| Turn type | Handler | Model |
|---|---|---|
| Chip tap | Scripted next question | None |
| Answer to a closed question | Extractor → Form A | Small, enums only |
| Personal detail | Observer → Form B | Small |
| Consulting question | Advisor | Small + retrieval |
| Off topic | Scripted redirect | None after the router |
| Adversarial or safety signal | Scripted response, logged | None after the router |

- The extractor runs in parallel with the router. The observer runs after the
  reply, only on a turn that the router labels `context` (2026-11-04, T-36).
- **The reply writer** (composer) is the only expensive call. It reads Form A,
  Form B and the last two turns, **never the full transcript**.
- **Two forms.** Form A holds typed filter slots and drives the SQL. Form B is
  a structured profile. **Each observation must quote the user.** Without a
  verbatim span, the system rejects the observation. The user sees and
  corrects Form B in the chat only: "What do you know about me?" A delete is a
  direct database action, never an edit by the model. A formal access request
  goes to the grievance contact, which sends a data export. Form B notes never
  show to others. Their use in the ranking is in [PD3a](pd-03a-flatmate-matching.md).
- **The advisor** answers from our articles first, with Postgres full-text
  search and **no vector store**. For a general question with no article:
  - signed-in users get the DeepSeek `web_search` tool, with Gemini Google
    Search grounding as fallback
  - visitors get model knowledge, clearly hedged.
- **The locator** (2026-11-11) picks the area of a place that the map lacks,
  with the router. Code measures the trip.
- Law, tax, area safety and claims about a person stay **articles-only or
  handed off**.
- RAG is **only** for consulting questions. Listings come from SQL.
- We store all typed messages.
- **0** model calls for a chip tap, **8–12** for each completed interview.

## Rationale

- **Cost comes from model size for each task, not from the number of agents.**
  Each agent adds a system prompt, each handoff repeats the context, and
  sequential calls add latency. More parts give more failure modes.
- **Calls run in sequence.** Thus, the latency of each call adds to the total.
  Users notice three seconds in a chat.
- **"Specialised agents think less"** is correct for each agent. But it is
  incorrect for the system if all the agents run on each turn.
- **No model must be excellent at all tasks.** Thus, there are more options and
  the price is lower.
- **Most turns never get to an expensive model.** Classification is the cost
  lever and the on-rails lever at the same time. The router knows a chip tap
  from the client.
- **The extractor and the observer both read one turn,** because one turn can be
  more than one type. Example: "I need Powai under 20k, my last place fell
  apart because of my flatmate's boyfriend" fills slots *and* reveals
  something.
- **Structure removes hallucination.** In almost all the hallucination
  scenarios that people fear in this product, we ask the model to *know*
  something. The extractor can only select an enum. A
  profile fact must point to the words of the user. Results come from SQL,
  never from prose. The model is never the source of truth. The form is.
- **The two-form idea is correct.** It is the centre of the design.
- **Form B must not be a text blob.** A blob that grows is the transcript with
  a different name. One turn at a time costs less. Form B is then available
  during the session. Thus, it can inform the ranking while the user browses.
- **Form B in the chat.** The designs have no screen for Form B notes. The
  chat gives access and correction with no new screen.
- **The advisor needs a base in our articles.** A general model hallucinates
  on legal rental questions, where an incorrect answer does the most damage.
  Postgres full-text search suits dozens of documents and keeps to ADR 0001.
- **Tiers by risk.** Users accept a hedged general answer, not a confident
  incorrect one. The corpus is almost empty at launch.
- **The chat does not wander.** The router catches off-topic turns before an
  expensive call.
- **We store all typed messages** for the observer.

## Consequences

- The router and the extractor are two parallel calls before the panel
  moves, so the router adds no wait (2026-11-02, T-34). The cost is one small
  router call on each typed message, and an extractor answer that an
  off-topic, adversarial or question-only turn drops. One call with the two
  jobs costs less, but a prompt change for one job can break the other. Do not
  add a sequential hop without a measurement.
- Code plans each reply, and the composer writes only its words (2026-11-02,
  T-13). The composer is a sequential hop after the extractor on a core typed
  turn. One deadline, `COMPOSER_DEADLINE_MS`, limits all its attempts, and it
  is the limit of the wait that this hop adds (3500 ms, measured by T-61). An
  output check stops a text with a contact detail, a link, or a number or a
  name that is not in the plan. When the composer is late, fails or does not
  pass, the scripted reply goes out.
- The observer adds no wait, and costs a call only on a turn with context
  (2026-11-04, T-36). A failure goes to the error report.
- Six handlers is a design. Twelve is a maintenance problem for five
  part-time engineers.
- Measure cost for each interview and each handler from day one. The cost for
  each handler tells you which handler to make smaller.
- Form A and Form B need a schema home outside S1 to S7. Account deletion must
  purge Form B.
- Handler inputs and outputs are Zod schemas with versions, in
  `packages/contract`.
- Each handler gets its own eval score. This is easier, because each handler
  has one job.
- Web searches count in the daily model spend.
- Each question with no article becomes the next article.
- Consulting questions never write to Form A or Form B.
- **Still open (testing): the router model.** DeepSeek runs the router at
  launch. When Jev access arrives, try Jev on the eval set.

Superseded: the 2026-09-23 launch plan cut the router, Form B and the
advisor. On 2026-09-26 they came back, and the advisor got web search after
sign-in.

## Alternatives rejected

- **Multi-agent** and **one large model.** The two cost more.
- **A vector store.** The corpus is dozens of documents, not millions.
- **A list of Form B notes on the profile, with an edit and a delete for each note.** The product team selected the chat.
- **The observer on each typed turn.** It costs a call on "30k" (T-36).

## Revisit when

Jev access arrives.

## Sources

- [CONTEXT.md](../../CONTEXT.md), PD7a row
- [product-base.md](../product-base.md), sections 09 and 11
- [agent-architecture.md](../agent-architecture.md)
- [ai-agent-design.md](../ai-agent-design.md), section 2
- [scope-policy.md](../scope-policy.md), bands 2a and 2b
- [launch-plan.md](../archive/2026-09-launch-plan.md), update of 26 September
- [team-plan.md](../team-plan.md), T-38
