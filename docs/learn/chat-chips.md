# The chat chips

**In one line:** the first three questions of the chat (place type, areas and budget) show tap buttons under the question, and a tap writes the answer into Form A with no model call.

## What it is

- **A chip** is a button under the newest question of the assistant. The labels come from the slot definitions: the five place types of [PD15](../decisions/pd-15-form-a-contract.md), the ten area groups of [PD2](../decisions/pd-02-launch-market.md), and the five budget bands of [interface-shape.md](../interface-shape.md).
- **A tap is a turn.** The chip label shows as the message of the person, for example "Under ₹25k", and the scripted reply asks the next question. A tap calls no model, so it costs nothing and it is not one of the five typed turns of the turn cap ([PD9](../decisions/pd-09-pre-login-limits.md)).
- **Typing always works.** A typed answer fills the same slot, and the chips go away with the reply.

## How it fits our project

| Part | Where |
|---|---|
| The chip slots, the labels and the tap body | `chipSlots`, `intentLabels`, `budgetBands`, `chipTap` and `tapText()` in `packages/contract` |
| A tap: no router, no extractor, then the scripted reply | `runTap()` in `apps/api/src/assistant/assistant.ts` |
| The chips that a reply offers | `chips` in the parts of the assistant turn, set by the reply writer |
| The turn route: a typed message or a tap | `apps/api/src/goals/routes.ts` |
| The chips on the screen | `apps/web/components/chat/chips.tsx`, and `chipsOf()` in `apps/web/lib/chat.ts` |

- **Which chips show.** The reply writer sets `chips` only with the plain question of intent, areas or budget. A question about a conflict, an area name with two places or a must-have weight offers no chips. The web shows the chips of the newest turn while their slot is empty or `unclear`. A new goal starts with the place types.
- **Areas take several picks.** Each tap turns an area group on or off, and Done sends all of them in one turn. A sub-area works when the person types it.
- **"Not sure, help me pick"** writes intent as `unclear`. The reply is the help line, which ends with its own question, and the four place types show again.
- **The saved turn** has the input method `chip`, and its parts keep the tap with a version. A typed turn keeps the label of the router.

## The choice we made

- Chips for the closed questions, from the slot definition, never from a model: [PD6c](../decisions/pd-06c-interface-holes.md).
- A tap does not count in the turn cap: [PD9](../decisions/pd-09-pre-login-limits.md).
- Only intent, areas and budget have chips now. T-59 adds the other closed questions.

## Gotchas

- **The API writes the text of a tap.** The web shows the same text from `tapText()` until the answer comes, so the two never disagree.
- **A tap answers its slot.** Its value replaces an earlier value, also a list of areas. A typed area adds to the areas.
- **The chips go away while a reply is pending.** The reply brings the chips of its own question.

## Tickets

- T-09: the chips of intent, areas and budget.
- T-59: the chips of the other closed questions.
- T-21: the turn cap counts only typed turns, and the chat changes to chips only at the spend ceiling.
