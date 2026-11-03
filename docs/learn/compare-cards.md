# Comparing cards

**In one line:** a person selects 2 to 4 places or people in the results and asks a question, and code builds a table of their database fields, with no model that reads a card.

## What it is

- **The selection.** Each card of the results panel has a "Select" tick. A person picks 2 to 4 cards of one kind: places or people. The panel shows "N Selected" with a clear button, and the chat shows the cards as chips above the input, with "Ask about the listings…". A selection needs a sign-in, as the opening of a card ([PD6b](../decisions/pd-06b-login-gate-and-search.md)).
- **The trigger.** The turn sends `compare`: the kind and the ids, in the order of the results. When the router labels the message as a question, and not as filters, the reply is the comparison. A message with filters goes to the normal chat.
- **The reply.** One line names Option 1, the best match of the results, and for places the option with the least cash to move in. A 2b question gets the hand-off line first ([PD10](../decisions/pd-10-scope-bands.md)). The open question and the conflicts of the last reply stay open.
- **The table.** Places start with Rent, Move-in cash, Deposit and Station. People start with Age, Job, Budget, Move date, Food, Smoking and Verified. "Change the fields" adds or removes rows, with no new request. Each option links to its card.

## How it fits our project

| Part | Where |
|---|---|
| The request and the table | `compareRequest` and `comparison` in `packages/contract/src/compare.ts` |
| The cash to move in | `moveInOf()` in `packages/contract/src/listings.ts`, also for the place detail |
| The table from the database | `comparisonOf()` in `apps/api/src/compare/compare.ts` |
| The reply | `comparisonReply()` in `apps/api/src/assistant/assistant.ts`, and the lines `compareBest` and `compareCash` |
| A deleted person | `forgetInComparisons()` in `apps/api/src/goals/store.ts`, called by the account deletion |
| The selection, the rows and the picker | `apps/web/lib/compare.ts`, with unit tests |
| The table on the screen | `apps/web/components/chat/comparison.tsx` |

- **The cards that a person can see.** The API reads each card through the visibility rules of the results. A card that the person cannot see gets 400 `not valid: compare`, and a guest gets 401, both before any model call.
- **Only the fields of the table.** The options are strict objects. A person gives only what the card shows to others: never the hidden religion or community ([PD3c](../decisions/pd-03c-exclusionary-preferences.md)), and never the bio.
- **The values of that time.** The assistant turn keeps the table, so a reload shows it again. When a person deletes the account, each saved comparison shows "Deleted user" in that column ([PD19](../decisions/pd-19-retention.md)).
- **The selection belongs to one list of results.** A new search starts a new selection, so Option 1 is always the best match.

## The choice we made

- Code builds the comparison, and no model reads a card, so a lister's text cannot change the answer: [PD10](../decisions/pd-10-scope-bands.md) and [scope-policy.md](../scope-policy.md), and the spec of T-49.

## Gotchas

- **The minutes of a deploy.** The old API refuses the field `compare` as `not valid: body`. The chat then says "Comparing cards starts in a few minutes. Try again soon."
- **The message counts as a typed turn** of the cap of PD9, because the router runs on it.
- **A PG** gives its lowest rent and the deposit of that rent.

## Tickets

- T-49: the selection, the comparison and the field picker.
