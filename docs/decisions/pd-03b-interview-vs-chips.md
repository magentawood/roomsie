# PD3b — What the AI interview adds over the chip filters

**Status:** Settled · **Deciders:** Yash

## Context

The team asked what the AI interview adds to the chip filters.

## Decision

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

## Consequences

- The structured form, not the model, holds the values.
- Each contradiction needs a confirmation from the user.

## Sources

- [CONTEXT.md](../../CONTEXT.md): "Open decisions" table, row PD3b
- [product-base.md](../product-base.md): section 04 and its "The form is the source of truth, not the model" callout
