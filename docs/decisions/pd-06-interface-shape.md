# PD6 — Interview first, then split view

**Status:** Settled for desktop · **Date:** 2026-09-20 · **Deciders:** Yash

## Context

One of the open questions in `ai-agent-design.md` (§7, question 2) was: is the interview the only entry, or can a user skip it and browse the grid? PD6 answers it.

## Decision

1. **Landing page.** A traditional hero and product narrative. Public.
2. **Primary call to action.** "Start looking" opens a full-screen chat.
3. **No skip.** From the chat, the user cannot go to the grid.
4. **After 2 to 3 inputs, the view splits.** Chat on one side, listings on the other.
5. **The listings panel has minimal manual filters.** Most filters come from the chat.
6. **The panel updates as the chat continues.**

In the full-screen chat, chips give intent, area and budget. The user can also type.

## Rationale

- The user sees results fast. Thus, the interview feels worth the effort.
- Results change as the user talks. This proves that the assistant listens.
- Minimal manual filters give a way out, and the user does not leave the chat.
- A full chat first and two panels after give the effort a good pace.

## Consequences

The flow opened five holes. `interface-shape.md` records each one:

| Hole | State | Where |
|---|---|---|
| 1. Mobile has no side-by-side | Provisional | PD6a |
| 2. Search traffic breaks the no-skip rule | Closed. We moved the login gate. | PD6b |
| 3. Two or three turns is not sufficient to rank | Closed | PD6c |
| 4. Live updates | Closed | PD6c |
| 5. Two inputs, one form | Closed | PD6c |

- Browse, chat and the two-panel view are public. Thus, there was no conflict with the no-skip rule.
- A visitor from search starts in the two-panel view, with the page filters applied and some form fields filled.
- **Latency.** The panel must not wait for the model. Run the query from the current form state.
- **Cold start.** No skip and an empty panel give a dead end. Define the empty state before launch: make the area larger, relax a dealbreaker, or offer a notification.
- If Mumbai supply is small, a forced interview makes the dead end worse. The user did work for no result.

## Sources

- [CONTEXT.md, PD6, PD6a, PD6b and PD6c rows](../../CONTEXT.md)
- [product-base.md, section 06](../product-base.md)
- [interface-shape.md, the decided flow, "Why it works", hole 2 and "Two smaller notes", with their Why callouts](../interface-shape.md)
- [ai-agent-design.md, section 7, question 2](../ai-agent-design.md)
