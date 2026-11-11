# Comparing cards

**In one line:** a person selects 1 to 4 places or people in the results and asks a question. With 2 cards or more, code builds a table of their database fields, with no model that reads a card.

## What it is

- **The selection.** Each card of the results panel has a "Select" tick. "Ask in chat" on a card selects it too. A person selects 1 to 4 cards of one kind: places or people. A card of the other kind starts a new selection. The panel shows "N Selected" with a clear button. A selection needs a sign-in, as a card does ([PD6b](../decisions/pd-06b-login-gate-and-search.md)).
- **The chips.** The chat shows each selected card as a blue chip, in a grey box with the input (Figma 63:4472). The X of a chip removes the card, and its tick goes off. The input says "Ask about this listing…" for one place, and "Ask about the listings…" for more.
- **"Ask in chat"** never writes in the input. In the panel, it closes the detail, adds the card and puts the focus in the input. On the page of a card, it opens the last chat, and that chat adds the card. Session storage carries the card (`chatStorage.asked`).
- **One card.** The message goes to the normal chat as "About “<name>”: <message>". A person goes by the first name only. The bubble of the person shows the name as a chip over the message, also after a reload (`aboutOf`).
- **Two to four cards.** The turn sends `compare`: the kind and the ids, in the order of the results. When the router labels the message as a question, and not as filters, the reply is the comparison. A message with filters goes to the normal chat.
- **A fifth card** does not go in. A line under the chips says "You can ask about 4 cards at most. Remove one to add <name>."
- **The reply.** One line names Option 1, the best match of the results, and for places the option with the least cash to move in. A 2b question gets the hand-off line first ([PD10](../decisions/pd-10-scope-bands.md)). The open question and the conflicts of the last reply stay open.
- **The table.** Places start with Rent, Move-in cash, Deposit and Station. People start with Age, Job, Budget, Move date, Food, Smoking and Verified. "Change the fields" adds or removes rows, with no new request. Each option opens its card in the results panel. A click with Ctrl or Cmd opens the page of the card.

## How it fits our project

| Part | Where |
|---|---|
| The request and the table | `compareRequest` and `comparison` in `packages/contract/src/compare.ts` |
| The cash to move in | `moveInOf()` in `packages/contract/src/listings.ts`, also for the place detail |
| The table from the database | `comparisonOf()` in `apps/api/src/compare/compare.ts` |
| The reply | `comparisonReply()` in `apps/api/src/assistant/assistant.ts`, and the lines `compareBest` and `compareCheapest` |
| A deleted or blocked person | `forgetInComparisons()` in `apps/api/src/goals/store.ts`, called by the account deletion and the block |
| The selection, the words of one card, the rows and the picker | `apps/web/lib/compare.ts`, with unit tests |
| The chips and the selection of each list | `apps/web/components/chat/chat-screen.tsx`, and `RemovableBadge` in `apps/web/components/ui/badge.tsx` |
| "Ask in chat" | `AskInChat` in `apps/web/components/detail/parts.tsx` |
| The table on the screen | `apps/web/components/chat/comparison.tsx` |

- **The cards that a person can see.** The API reads each card through the visibility rules of the results, and never the own listing of the person. A card that the person cannot see gets 400 `not valid: compare`, and a guest gets 401, both before any model call.
- **Only the fields of the table.** The options are strict objects. A person gives only what the card shows to others: never the hidden religion or community ([PD3c](../decisions/pd-03c-exclusionary-preferences.md)), and never the bio.
- **The values of that time.** The assistant turn keeps the table, so a reload shows it again. When a person deletes the account, each saved comparison shows "Deleted user" in that column ([PD19](../decisions/pd-19-retention.md)). After a block, each of the two people shows "Not available" in the saved comparisons of the other ([Moderation](moderation.md)).
- **The selection belongs to the list of results in the panel:** the newest list, or the list of an older results card. Each list keeps its own selection. A new search starts a new selection, so Option 1 is the best match of the list.
- **A send keeps the selection,** so the next question asks about the same cards. A reply with new results shows the newest list.

## The choice we made

- Code builds the comparison, and no model reads a card, so a lister's text cannot change the answer: [PD10](../decisions/pd-10-scope-bands.md) and [scope-policy.md](../scope-policy.md), and the spec of T-49.
- "Ask in chat" adds a chip, as the designs show (the founders, 2026-11-10). A question about one card keeps the words "About …" in the text, so the API needs no change. The chip in the bubble shows the person what the question was about.
- A fifth card does not go in, and the chat tells why. A tick that does nothing looks broken. To drop the oldest card changes the comparison with no notice.

## Gotchas

- **The minutes of a deploy.** The old API refuses the field `compare` as `not valid: body`. The chat then says "Comparing cards starts in a few minutes. Try again soon."
- **The message counts as a typed turn** of the cap of PD9, because the router runs on it.
- **A PG** gives its lowest rent and the deposit of that rent.

## Tickets

- T-49: the selection, the comparison and the field picker.
- 2026-11-10: the chips of "Ask in chat", a question about one card, and the selection of an older results card.
