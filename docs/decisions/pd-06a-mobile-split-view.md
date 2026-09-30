# PD6a — Mobile pattern for the split view

**Status:** Provisional · **Date:** 2026-09-20 · **Deciders:** Yash

## Context

PD6 gives a split view: the chat on one side and the results on the other. Two panels need approximately 900px.

- Mumbai is a mobile-first market. At 400px, a second panel cannot fit.
- Thus, the central idea must work in a different way on mobile.
- On 20 September, we wrote down three options. We did not fully choose one.

## Decision

Engineering chose a provisional pattern so that it can start:

| When | Chat | Listings |
|---|---|---|
| Start | Fills the screen | — |
| Results are available | A bar at the bottom, approximately 25% of the height | Fill the space above |
| The user taps the input | Approximately 60% of the height | The space above |
| The user sends, or the listings update | Small again | The space above |

**One rule for all options:** never change the size while the user types or reads. The size changes on send, or when the user drags it.

The mechanics are the same as on desktop. We settled the mechanics. We did not settle the appearance. The UI is not the last version.

## Rationale

- The mechanics are the same as on desktop: one form, two views.
- The chat becomes approximately 60% of the height to let the user read the history.
- An automatic shrink in the middle of a sentence is the same defect as silent reorder (hole 4 of `interface-shape.md`).

## Alternatives considered

We did not fully choose one option. The trade-offs of the three options:

- **Bottom sheet.** The chat fills the screen. The results are in a sheet that the user drags up. A pill shows the live count. One more component, but one product.
- **Tabs.** Two tabs, Chat and Results, with a badge. Lowest cost. But it loses the live feedback, which is the primary function.
- **Inline cards.** The results show in the chat as card carousels. Most natural on mobile. But it is hard to compare options, which property search needs.

## Consequences

- The launch plan moved the mobile bottom sheet to v1. At launch, mobile uses only a responsive layout.
- The design review lists mobile as unresolved and the largest open question in the product. The designer must decide by 30 September.
- We expect that the designer will overrule the provisional pattern.

## Revisit when

The designer decides the mobile pattern in the design review.

## Sources

- [CONTEXT.md, PD6a row](../../CONTEXT.md)
- [product-base.md, section 06 "Mobile is provisional", section 16 and the "Still open" table](../product-base.md)
- [interface-shape.md, hole 1 and its Why callout](../interface-shape.md)
- [design-review.md, deadlines and §5 Mobile, with its Why callout](../design-review.md)
- [launch-plan.md, the cut table](../launch-plan.md)
