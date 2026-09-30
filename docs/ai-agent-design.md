# The conversational agent: failure modes and guardrails

**Date:** 2026-09-20 · **Status:** working document, feeds decision PD6
**Scope:** all the ways that the roomsie assistant can fail, and what to do about each one.

---

## 1. Verdict on the four concerns raised

| Concern | Verdict |
|---|---|
| Form alongside the chat, conflicts need confirmation | Right |
| The model is stochastic, so we cannot list its mistakes | Right as a fact. Wrong as a frame. |
| The model needs a confidence level before it answers | Right goal, wrong mechanism |
| Chat makes users tired, so offer tap suggestions | Right, and more than convenience |

Why: [PD3b](decisions/pd-03b-interview-vs-chips.md), [PD7a](decisions/pd-07a-agent-architecture.md)

---

## 2. The decision that removes most of the risk

**The form, not the model, is the source of truth** ([PD3b](decisions/pd-03b-interview-vs-chips.md)). Never ask the model to know anything.

Three jobs, different trust levels: **Extract** (enum or number only), **Converse** (free text, no inventory facts), **Retrieve** (SQL, not the model) ([PD7a](decisions/pd-07a-agent-architecture.md)).

- **Rule:** generated prose may never give a fact about a specific listing, person, price, area or availability. These facts show only on cards, with data from the database.
- The assistant refers to the card. It does not describe it.

---

## 3. The four concerns, in detail

### 3.1 The form alongside the chat

Slot filling with a structured state object for the full session:

```
slot: {
  key:        "smoke",
  value:      "no",
  source:     "stated" | "inferred" | "default" | "empty",
  evidence:   "I really can't be around cigarette smoke",
  turn:       7,
  confirmed:  true,
  weight:     "must" | "nice" | null
}
```

| `source` | Meaning | Rule |
|---|---|---|
| stated | The user said it | Fill silently. |
| inferred | The model got it from a related statement | Never fill silently. Propose it: "Should I make that a dealbreaker?" |
| default | A market default, only to show the first results | Always label it visibly. The user can always override it. |
| empty | Unknown | The interview is not complete. |

**Conflicts.** Ask the user which value to use ([PD3b](decisions/pd-03b-interview-vs-chips.md), [PD6c](decisions/pd-06c-interface-holes.md)). Log all conflicts. A high conflict rate on one slot shows a question with bad words, not inconsistent users.

**The form is also the resumption mechanism.** A user who comes back (for example, three days after) continues from the form, not from a transcript replay ([PD5](decisions/pd-05-team-and-budget.md)).

### 3.2 Stochastic, and what that actually implies

| Surface | Risk | Fence |
|---|---|---|
| Slot extraction | Wrong enum value | Enum only, Zod retry ([PD7](decisions/pd-07-models.md), [PD7a](decisions/pd-07a-agent-architecture.md)) |
| Numbers (budget, dates) | Misparses "20k" or "next month end" | The model finds the span, then code parses it deterministically. Never let the model do arithmetic or date maths. |
| Recommendation | Invents a listing | SQL retrieval, card output |
| Free text | Wrong or strange text | Scope rules and the refusal list in [section 5](assistant-guardrails-and-eval.md#5-the-guardrail-architecture-assembled) |
| Tone | Differs between sessions | Version and pin the system prompt. Treat it as code. |

[ADR 0013](decisions/0013-ci-gate-and-testing.md) gives CI a five-minute budget. Thus, evaluation is a separate suite, outside the PR gate. It uses a fixed set of recorded conversations, and scores slot-extraction accuracy, not string equality. Budget it as its own work item ([PD5](decisions/pd-05-team-and-budget.md)).

Why: [PD7a](decisions/pd-07a-agent-architecture.md)

### 3.3 Confidence: right goal, wrong mechanism

1. **The empty slot is the confidence signal** ([PD3b](decisions/pd-03b-interview-vs-chips.md)).
2. **Token probability on the extracted span has much better calibration.** For a constrained choice (for example, four enum values), the probability mass on the selected value is a usable threshold. Below it, ask, and do not fill ([PD7](decisions/pd-07-models.md)).
3. **Never let inference fill a slot.**
4. **A completeness gate, not a confidence gate, controls the match score.** Results show after intent, area and budget. The match score shows only when the minimum slot set is full. This rule is deterministic and readable by all ([PD6c](decisions/pd-06c-interface-holes.md)).

**The minimum slot set before the first recommendation** (a proposal, for discussion):

Per [PD6c](decisions/pd-06c-interface-holes.md), this set gates the match score, not the first results.

| Required | Why |
|---|---|
| Intent | Sets the market side to search |
| Budget | Hard filter |
| Areas | Hard filter |
| Move date | Hard filter |
| At least 2 dealbreakers | Minimum for a useful ranking |
| Identity of the asker as a person or a spot holder | Sets their feed |

All other slots are optional. The assistant can collect them during browsing.

### 3.4 Suggestion chips

Chips are genuine, and worth the work. **The real cost is anchoring.** Thus: **suggestions on closed questions, never on open ones.**

- Closed: the nine lifestyle axes. Offer chips.
- Open: the questions that give the product its reason to exist. No chips. Ask these with no suggestions:
  - Why the last flatshare ended
  - What would make you leave a flat
  - Who else is frequently in the flat, and how frequently
  - What a usual weekday evening at home looks like
- Free text is always available adjacent to the chips. The chips never replace it.
- For a closed question, make the chips from the slot definition, not with a second model call on each turn. Call the model for suggestions only on the small number of turns where the answer space is genuinely open.

Why: [PD6c](decisions/pd-06c-interface-holes.md)

---

## 4. The risks not raised

Moved to [assistant-risks.md](assistant-risks.md).

---

## 5. The guardrail architecture, assembled

Moved to [assistant-guardrails-and-eval.md](assistant-guardrails-and-eval.md#5-the-guardrail-architecture-assembled).

---

## 6. What to test

Moved to [assistant-guardrails-and-eval.md](assistant-guardrails-and-eval.md#6-what-to-test).

---

## 7. Open questions this document does not settle

1. **Settled: [PD7](decisions/pd-07-models.md).** Which model, and where it runs ([section 4.7](assistant-risks.md#47-data-residency-and-dpdp)).
2. Is the interview the only entry, or can a user skip it and browse the grid? Decision PD6.
3. After the interview, does the assistant stay during browsing and chat, or fully hand off?
4. Does the assistant ever speak to the other side of a match for the user? This was option 4 in the value question, not selected. It changes the architecture significantly.
5. Where the slot state is in the schema. It is not in the ledger's S1 to S7. Same item as the open "schema home" point in [PD7a](decisions/pd-07a-agent-architecture.md), Consequences.
