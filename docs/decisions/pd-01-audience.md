# PD1 — Open to all genders

**Status:** Settled · **Deciders:** Yash

## Context

femmeflats was a women-only, swipe-stack discovery app. roomsie is its AI-native pivot. The V3 prototype carries women-only items: the "For women. By women" hero, the "Only women see this" reassurance in the post wizard, and other women-only strings.

## Decision

- **roomsie is open to all genders.**
- roomsie drops the women-only wedge of femmeflats. We removed the women-only promise.

## Rationale

- roomsie is for all people.
- The market is two times larger.
- The cold start is easier.
- Gender verification no longer stops the launch.

## Consequences

- Gender verification is no longer a launch blocker.
- Differentiation is harder, and there is more direct competition.
- We no longer have the safety story. But the safety problem did not go away.
- PD1 makes invalid the safety argument that the women-only items carry.
- We remove all women-only lines from the V3 prototype:
  - all the women-only strings
  - the "For women. By women" hero
  - the "Only women see this" reassurance in the post wizard.
- To replace them, roomsie needs a new trust story. The product scope section must supply this story.
- At this time, gender preferences come through the interview, and PD3c records them.
- **Open:** is that sufficient for the trust story? This question belongs with PD8.
- Brokers break the all-genders trust story in a different way. Thus, roomsie must rebuild the safety argument (risk 5 of the broker model, PD3).

## Sources

- [CONTEXT.md](../../CONTEXT.md): "Decisions taken in this session" table, row PD1, and its "Why" callout. The V3 prototype section, "Items that the all-genders decision (PD1) makes invalid in it", and its "Why" callout
- [product-base.md](../product-base.md): section 01, "What it costs" and "Why" callouts
- [ai-agent-design.md](../ai-agent-design.md): section 4.1, "Related, and still open", and its "Why" callout
- [supply-and-broker-model.md](../research/supply-and-broker-model.md): "The honest risks", risk 5
