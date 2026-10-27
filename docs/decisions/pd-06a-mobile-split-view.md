# PD6a — Mobile pattern for the split view

**Status:** Settled. Changed on 2026-10-27. · **Date:** 2026-09-20 · **Deciders:** Yash, then n3rxv for the founders (2026-10-27)

## Context

PD6 gives a split view: the chat on one side and the results on the other. Two panels need approximately 900px.

- Mumbai is a mobile-first market. At 400px, a second panel cannot fit.
- Thus, the central idea must work in a different way on mobile.
- On 20 September, we wrote down three options and a provisional pattern. The designer was to decide with the designs ([PD12](pd-12-team-plan.md)).
- The designs of flow 02 show the phone pattern, and v0 is the product in the designs ([PD14](pd-14-v0-is-the-figma-designs.md)).

## Decision

**In one line:** On a phone, the chat fills the screen, and "Show all" on a results card in the chat opens the results above the input.

On a phone, we use the pattern of flow 02 of the designs:

| When | Chat | Results |
|---|---|---|
| Start | Fills the screen | — |
| Results are available | Still fills the screen | A card in the chat, with "Show all" |
| The user selects "Show all" | The input stays at the bottom of the screen | Fill the space above the input |

**One rule for all sizes:** never change the size while the user types or reads. Only the input grows, to four lines at most, over the screen. The size changes on send, or when the user opens or closes the results.

The mechanics are the same as on desktop: one form, two views.

## Rationale

- The designs settle the appearance, and v0 is the product in the designs (PD14).
- The card keeps the chat as the primary function. The results screen gives the room to compare the options.
- The input at the bottom of the results lets the user change the search without a return to the chat.
- An automatic shrink in the middle of a sentence is the same defect as silent reorder (hole 4 of `interface-shape.md`).

## Alternatives considered

- **The provisional pattern of 20 September.** The chat is a bar below the listings, approximately 25% of the height, and 60% when the user taps the input. The designs do not use it. The size changes are hard to get correct on small screens.
- **Bottom sheet.** The results are in a sheet that the user drags up. A pill shows the live count. One more component.
- **Tabs.** Two tabs, Chat and Results, with a badge. Lowest cost. But it loses the live feedback, which is the primary function.
- **Inline cards only.** The results show in the chat as card carousels. But it is hard to compare options, which property search needs. The designs keep the card and add "Show all".

## Consequences

- T-10 builds the phone chat. The results card and the results screen wait for the Form A contract (T-08), the match route (T-14) and the results panel (T-15).
- This decision closes hole 1 of `interface-shape.md`.

## Revisit when

User tests on phones show that people cannot compare the options on the results screen.

## Sources

- [CONTEXT.md, PD6a row](../../CONTEXT.md)
- [interface-shape.md, hole 1 and its Why callout](../interface-shape.md)
- [design-review.md, deadlines and §5 Mobile, with its Why callout](../archive/2026-09-design-review.md)
- [launch-plan.md, the cut table](../archive/2026-09-launch-plan.md)
- [T-10 Chat screen and split view, the grill of 2026-10-27](../plan/tasks/T-10%20Chat%20screen%20and%20split%20view%20%E2%9A%91.md)
