# Place detail and listing reports

**In one line:** a signed-in user opens the full detail of a place, and can report it; a safety report, or reports from two people, hide the listing at once.

## What it is

- The **place detail** is the page `/places/<id>`. It shows the four kinds of the Product file: a room in a flat, an owner flat, a PG or hostel, and a broker flat.
- In the chat, a place and a person open in the results panel ([The results panel](results-panel.md)). The top bar has "Ask in chat", and the X at the end closes the detail and the panel.
- **The match box** sits under the title of a place and of a person ([PD3a](../decisions/pd-03a-flatmate-matching.md)). Its sentence names the facts that both sides share:
  - A person: the same food, smoking or drinks, ages within 3 years, budgets that overlap, and areas or commute that overlap.
  - A place: a rent inside the budget, an area asked, the must-haves met, and a walk of 10 minutes or less to a station.
- A **listing report** gives one of the seven reasons of PD18, and a detail. "Other" needs the detail.
- A **hidden listing** has a hide time. Other users do not see it, and the owner sees "Hidden for review". Only the moderator clears the hide time, on the admin screen ([Moderation](moderation.md)).

## How it fits our project

| Part | Where |
|---|---|
| The page | `apps/web/app/places/[id]/page.tsx` and `apps/web/components/places/place-detail.tsx` |
| The lines of each part | `apps/web/lib/place-detail.ts`, a pure module with its tests. The labels come from `labels` of `listing-steps.ts` |
| The report sheet | `apps/web/components/places/report-sheet.tsx` |
| The match box | `apps/web/lib/match-box.ts`, a pure module with its tests, and `apps/web/components/detail/match-box.tsx` |
| The label of a card outside the results | `POST /v1/results/fit` and `fitOf()` in `apps/api/src/results/search.ts` |
| The route | `POST /v1/reports` in `apps/api/src/reports/routes.ts` |
| The hide rule | `isVisible` and `visibleListing` in `apps/api/src/listings/read.ts` |

- The listing reply has three flags: `mine` (the listing belongs to the user who asks), `hidden` and `removed`. Only the owner gets a hidden or a removed listing; other users get 404.
- The visible rule is one rule for the detail, Saved and each other read. A hidden listing thus leaves Saved too.
- Each part shows each field of the kind of the place. A field with no answer reads "Didn't say". The person detail does the same.
- On a computer, the message button ends the column. On a phone it is in the bar at the bottom.
- "Ask in chat" on a page opens the chat of the tab, else the newest open goal, else a new goal. The chat input then has the draft "About <name>: ".
- The cards of Saved open the detail.
- Share opens the Share modal (T-50): it sends the card as a message to the ticked conversations, and "Copy link" ("Share link" on a phone) shares the link anywhere. The link opens the card behind the sign-in.
- A confirmation dialog has its two buttons side by side, also on a phone.

## The choice we made

- The scope, the page, the report and the hidden buttons: the spec of T-43 ([#119](https://github.com/magentawood/roomsie/issues/119)).
- The reasons, the hide rule and the review times: [PD18](../decisions/pd-18-moderation.md).
- The match box: [PD3a](../decisions/pd-03a-flatmate-matching.md). The "Verified" pill shows beside the title and in "Listed by" when the lister has an approved ID check ([PD8](../decisions/pd-08-verification.md)). The listing reply gives it as `verified`.

## Gotchas

- **The client makes the id of a report.** It is a UUIDv7, and its time must be at most 5 minutes from the server clock (ADR-0015). The sheet makes the id at the first tap and keeps it, so a retry files no second report. A user reports a listing one time.
- **A second report of the same user files nothing.** So it cannot hide the listing either, also with a safety reason.
- **Two reports at the same time.** The route locks the listing row, so each report counts the other one.
- **A delete keeps the report.** When the owner deletes a reported listing, the report stays for the moderator, with no listing.
- **A status change does not undo a hide.** The owner can pause and go live again, and the listing stays hidden.
- **A removed listing cannot go live again.** A moderator removed it for good ([Moderation](moderation.md)), so the route gives 409.
- **A 404 gets no retry.** The page shows "This place is no longer listed." at once.
- **The box of a card outside the results asks the API for its label.** In the chat, a card of the results has its label. Another card, and each page, calls `POST /v1/results/fit`. An API from before the route gives 404, so the box does not show.
- **The fit leaves out the hidden slots.** Thus the label tells nothing of the religion or the community of a person ([PD3c](../decisions/pd-03c-exclusionary-preferences.md)).
- **A label needs three preferences.** With fewer, each card is "An average match", as the "Best match" rule says.
- **The box needs a side to compare.** A page with no profile of the viewer, and the own card or listing, show no box.

## Tickets

- T-43: [#154](https://github.com/magentawood/roomsie/pull/154), 2026-10-26. The place detail, listing reports and the hide rule.
- The asks of the founders of 2026-11-09: the match box, each field, the person in the panel, the close X and the pill in "Listed by".
