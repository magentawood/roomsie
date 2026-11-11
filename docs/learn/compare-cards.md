# Comparing cards

**In one line:** a person selects 1 to 4 places or people in the results and asks a question. The advisor answers from facts that code took from the database, and with 2 cards or more code also builds a table of their fields.

## What it is

- **The selection.** Each card of the results panel has a "Select" tick. "Ask in chat" on a card selects it too. A person selects 1 to 4 cards of one kind: places or people. A card of the other kind starts a new selection. The panel shows "N Selected" with a clear button. A selection needs a sign-in, as a card does ([PD6b](../decisions/pd-06b-login-gate-and-search.md)).
- **The chips.** The chat shows each selected card as a blue chip, in a grey box with the input (Figma 63:4472). The X of a chip removes the card, and its tick goes off. The input says "Ask about this listing…" for one place, and "Ask about the listings…" for more.
- **"Ask in chat"** never writes in the input. In the panel, it closes the detail, adds the card and puts the focus in the input. On the page of a card, it opens the last chat, and that chat adds the card. Session storage carries the card (`chatStorage.asked`).
- **The turn** sends `compare`: the kind and the ids, in the order of the results. One card also keeps its name in the text, as "About “<name>”: <message>", so the bubble of the person shows the name as a chip, also after a reload (`aboutOf`). A person goes by the first name only. The API takes the name out of the text before the router, the extractor and the advisor read it, so the name of a card is never the person's words.
- **A question** about the cards gets the answer of the advisor: a message that the router labels as a question, or that it cannot label, because the input asks about the cards. Such a turn changes no slot. A message with filters goes to the normal chat.
- **The facts** for the advisor (`cardFacts` in the contract): for a place, the kind, the area, the station and the walk to it, the amounts, the date and the furnishing; for a person, the age, the job, who is moving, the budget, the date, the areas and the lifestyle answers. A PG is only "PG", and a station or a job goes only when it looks like a name. Never a description, a PG name, a bio or the name of a person ([PD10](../decisions/pd-10-scope-bands.md)).
- **A fifth card** does not go in. A line under the chips says "You can ask about 4 cards at most. Remove one to add <name>."
- **The reply.** The advisor answers the question from the facts and what many people in Mumbai know, as the train line and the usual time of a trip. It calls one card "this place" (code puts the words in when a model says "Option 1") and more cards "Option 1", "Option 2". The prompt has the train and metro lines of Mumbai, so a route uses real lines. With no answer, two cards or more get one line that names Option 1, the best match, and for places the option with the least cash to move in. One card gets a line that sends the person to the card. A 2b question gets the hand-off line first. The open question and the conflicts of the last reply stay open.
- **The table.** Places start with Rent, Move-in cash, Deposit and Station. People start with Age, Job, Budget, Move date, Food, Smoking and Verified. "Change the fields" adds or removes rows, with no new request. Each option opens its card in the results panel. A click with Ctrl or Cmd opens the page of the card.

## How it fits our project

| Part | Where |
|---|---|
| The request and the table | `compareRequest` and `comparison` in `packages/contract/src/compare.ts` |
| The cash to move in | `moveInOf()` in `packages/contract/src/listings.ts`, also for the place detail |
| The table and the facts from the database | `cardsOf()` in `apps/api/src/compare/compare.ts` |
| The reply | `cardsReply()` and `withoutCardLabel()` in `apps/api/src/assistant/assistant.ts`, the prompt of the advisor, and the lines `compareBest`, `compareCheapest` and `cardNoAnswer` |
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

- Code builds the comparison and the facts, and no model reads a text of a lister or a person, so that text cannot change the answer: [PD10](../decisions/pd-10-scope-bands.md) and [scope-policy.md](../scope-policy.md), and the spec of T-49. The advisor reads the facts since 2026-11-11, because a question as "which one is closer to my college?" needs the area and the station.
- "Ask in chat" adds a chip, as the designs show (the founders, 2026-11-10). A question about one card keeps the words "About …" in the text, so the API needs no change. The chip in the bubble shows the person what the question was about.
- A fifth card does not go in, and the chat tells why. A tick that does nothing looks broken. To drop the oldest card changes the comparison with no notice.

## Gotchas

- **The minutes of a deploy.** The old API refuses the field `compare` as `not valid: body`. The chat then says "Comparing cards starts in a few minutes. Try again soon."
- **The message counts as a typed turn** of the cap of PD9, because the router runs on it.
- **A PG** gives its lowest rent and the deposit of that rent.

## Tickets

- T-49: the selection, the comparison and the field picker.
- 2026-11-10: the chips of "Ask in chat", a question about one card, and the selection of an older results card.
