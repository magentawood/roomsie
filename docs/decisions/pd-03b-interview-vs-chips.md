# PD3b — What the AI interview adds over the chip filters

**Status:** Settled · **Deciders:** Yash

## Context

The team asked what the AI interview adds to the chip filters.

## Decision

**In one line:** Both: the assistant interview runs with the chip filters, and the structured form, not the model, is the source of truth.

**Settled: both.** The assistant does two things that chips cannot do:

- It finds what people never tick a box for: "My ex basically lived there."
- It consults and challenges the user. It disagrees with the user: "Six dealbreakers are hiding 90% of Powai."

**The form is the source of truth, not the model.**

- A structured form runs in parallel with all of the chat.
- For each slot, the form records if the user stated the value or the model inferred it.
- An inferred value never fills a slot silently.
- If a value contradicts an earlier value, the assistant confirms it with the user. It never overwrites the earlier value.
- Confidence is the empty slot. It is not a number that the model reports about itself.

## Rationale

- The interview finds what chips cannot capture.
- The interview also consults and challenges the user.
- **The form alongside the chat is the single most important design decision** in `ai-agent-design.md`.
- **The fix for confidence is in the structure.** If you ask the model how confident it is, the result is not reliable:
  - Language models have bad calibration when they give their certainty in natural language.
  - That number has a weak relation to the correctness of the answer. It has a relation to how fluent the answer sounds.
  - If you make a gate on that number, you feel safe, but you are not safe.
- **An empty slot is a hard fact about state that you can audit.** It is not the opinion of a model.
- Most of what you fear as "the AI assumed something" is an inferred value that the model wrote silently. Prevent that, and most of the fear goes away.
- **The conflict rule is correct.** The conflict log is the one addition.
- Chips also make the attack surface smaller. But they have one important cost: anchoring (PD6c).

## Consequences

- The structured form, not the model, holds the values.
- Each contradiction needs a confirmation from the user.
- Log all conflicts.

## Sources

- [CONTEXT.md](../../CONTEXT.md): "Open decisions" table, row PD3b
- [product-base.md](../product-base.md): section 04 and its "The form is the source of truth, not the model" callout
- [ai-agent-design.md](../ai-agent-design.md): sections 1, 3.1 and 3.3
