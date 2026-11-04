# The chat chips

**In one line:** each closed question of the chat (place type, areas, budget, room type, who is moving, the eight lifestyle questions and the weight of a must-have) shows tap buttons under the question, and a tap writes the answer into Form A with no model call.

## What it is

- **A chip** is a button under the newest question of the assistant. The labels come from the slot definitions: the five place types of [PD15](../decisions/pd-15-form-a-contract.md), the ten area groups of [PD2](../decisions/pd-02-launch-market.md), the five budget bands of [interface-shape.md](../interface-shape.md), the answers of room type, who is moving and each lifestyle question, and "It's a must" or "Show them first" for the weight of a must-have.
- **A tap is a turn.** The chip label shows as the message of the person, for example "Under ₹25k", and the scripted reply asks the next question. A tap calls no model, so it costs nothing and it is not one of the five typed turns of the turn cap ([PD9](../decisions/pd-09-pre-login-limits.md)).
- **Typing always works.** A typed answer fills the same slot, and the chips go away with the reply.

## How it fits our project

| Part | Where |
|---|---|
| The chip slots, the labels and the tap body | `chipSlots`, `intentLabels`, `budgetBands`, `chipAnswers()`, `chipTap` and `tapText()` in `packages/contract`; the lifestyle labels are `lifestyleAnswerLabels`, which the profile form also uses |
| A tap: no router, no extractor, then the scripted reply | `runTap()` in `apps/api/src/assistant/assistant.ts` |
| The chips that a reply offers | `chips` in the parts of the assistant turn, set by the reply writer |
| The turn route: a typed message or a tap | `apps/api/src/goals/routes.ts` |
| The chips on the screen | `apps/web/components/chat/chips.tsx`, and `chipsOf()` in `apps/web/lib/chat.ts` |

- **Which chips show.** The reply writer sets `chips` with the plain question of a closed slot, and with the question about the weight of a must-have. A question about a conflict or an area name with two places offers no chips, and the hidden religion and community slots and the move date never have chips. Room type and who is moving get chips only when the order of the questions asks them. When no model reads a typed message, the line "Sorry, I could not read that just now" keeps the chips of the last question, or the place types on a first message, because a tap needs no model. The web shows the chips of the newest turn while their slot is empty or `unclear`. A new goal starts with the place types.
- **Areas take several picks.** Each tap turns an area group on or off, and Done sends all of them in one turn. A sub-area works when the person types it.
- **"Not sure, help me pick"** writes intent as `unclear`. The reply is the help line, which ends with its own question, and the four place types show again.
- **The saved turn** has the input method `chip`, and its parts keep the tap with a version. A typed turn keeps the label of the router.

## The choice we made

- Chips for the closed questions, from the slot definition, never from a model: [PD6c](../decisions/pd-06c-interface-holes.md).
- A tap does not count in the turn cap: [PD9](../decisions/pd-09-pre-login-limits.md).
- The chips of the other closed questions, their words and the same two weight chips for each must-have: the spec of T-59, and section 35 of the drafts page.

## Gotchas

- **The API writes the text of a tap.** The web shows the same text from `tapText()` until the answer comes, so the two never disagree.
- **A tap answers its slot.** Its value replaces an earlier value, also a list of areas, and also a slot inside the lifestyle or the must-haves (`withSlot`). A typed area adds to the areas.
- **The minutes of a deploy.** The old API refuses a chip of T-59 as `not valid: body`, and the chat says "These buttons start in a few minutes. Type your answer for now."
- **The chips go away while a reply is pending.** The reply brings the chips of its own question.

## Tickets

- T-09: the chips of intent, areas and budget.
- T-59: the chips of room type, who is moving, the lifestyle questions and the weight of a must-have.
- T-21: the turn cap counts only typed turns.
