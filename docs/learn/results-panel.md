# The results panel

**In one line:** the results panel shows the matches of Form A as cards beside the chat. It changes only when the form changes.

## What it is

- The **results panel** is the right half of `/chat` on a desktop. It has a header, the "Best Matches" sort and a grid of person and place cards ([interface-shape.md](../interface-shape.md)).
- **A tap anywhere on a card opens it.** The name link covers the card (`CardLink stretched`). Select and Save sit above it and keep their own tap.
- **The line between the chat and the panel** can be dragged on a computer, or moved with the arrow keys. A double click gives back the 530 px of the designs. The chat stays 360 px wide or more, and the panel 420 px. Local storage keeps the width (`roomsie.chatWidth`).
- The **header** shows the count only, as "8 Results".
- **The cards follow the frame "All types of cards and listings"** (Figma `67:6750`). Each line comes from a field of the listing or the person. A line with no value does not show:
  - A room: the faces of up to three flatmates on the photo, "Accommodation: 1 person" for a private room, and the date.
  - A PG: the type ("Boys", "Girls" or "Boys and girls"), who is welcome, the sharing types and the meals.
  - A flat: the area only. The tags start with the furnishing and the bathroom.
  - A person: the job and the age, what they look for, the budget, the date, the lifestyle tags and the bio.
- **The tags line** shows the house rules, or the lifestyle answers of a person. It shows up to three, and "+3" counts the rest. A line longer than 44 characters shows fewer tags.
- **The pill of a place card** names the lister. A verified lister gets the check icon: "Verified" on a room, "Owner" on a flat or a PG, "Broker" on a broker flat. A broker flat always shows the yellow "Broker" pill, so the brokerage is never a surprise ([ID checks](id-checks.md)).
- **The Select tag** is a white pill on the photo. When the person selects the card, its box turns black, the tag says "Selected", and the card gets a shadow.
- **The photos of a card** scroll sideways: a swipe on a phone, or a scroll or a dot on a computer. A tap still opens the card. The dots show on a phone, and on a computer only under the pointer, as in the designs. A person card shows them on a phone only, and a selected card shows none. The code is `PhotoStrip` in `apps/web/components/ui/photo-strip.tsx`.
- **The results card** in the chat shows the photos of the first three results as a tilted stack, and the count, as "24 listings" or "3 people". The name of the search, as "Rooms in Powai–Vikhroli under ₹25,000", is for a screen reader only. An older card keeps its photos in local storage.
- A **label** sits on the photo of a card. "Best match" means that the person stated three or more preferences, and the card meets all of them. "Didn't say: smoking" means that the card did not answer a dealbreaker ([PD3a](../decisions/pd-03a-flatmate-matching.md)).
- With no match, the panel shows "No relevant results" and the **suggested posts** ([PD6c](../decisions/pd-06c-interface-holes.md)).
- New results come as a **results card** in the chat. On a desktop, the panel opens beside the chat on the next send, or when the person opens the card. On a phone, the chat fills the screen, and "Show all" on the card opens the panel above the input. The size never changes while the person reads ([PD6a](../decisions/pd-06a-mobile-split-view.md)).

## How it fits our project

| Part | Where |
|---|---|
| The rules: the header, the form key, the labels, the photo stack and the update rule | `apps/web/lib/results.ts`, with unit tests |
| The lines, the tags and the pill of each card | `apps/web/lib/cards.ts`, with unit tests |
| The place card and the person card | `apps/web/components/listings/place-card.tsx`, `apps/web/components/people/person-card.tsx` |
| The panel | `apps/web/components/results/results-panel.tsx` |
| The results card in the chat | `apps/web/components/results/results-card.tsx` |
| The split view | `apps/web/components/chat/chat-screen.tsx` |
| The search: the pages of `POST /v1/results` for a form | `useResults()` in `apps/web/lib/queries.ts` |
| The sample data of the preview | `apps/web/lib/sample-results.ts` |

- **The panel is a pure function of the form.** `formKey()` keeps the values and the weights of Form A, not the sources. Thus, a confirmed default gives the same key and no new results.
- **The panel searches the form of the chat.** It shows when intent, area and budget have a value. It loads 20 results, then the next 20 when the person comes to the end of the grid ([The match query](match-query.md)).
- **The order never moves under the person.** While the person scrolls, new results wait. They show 1.5 seconds after the last scroll. `panelUpdate()` holds this rule. The cache never searches again for one form, so the next page of the form on the screen adds cards only at the end.
- **A card opens in place.** A place or a person opens its detail in the panel, with "Ask in chat" and the match box ([Place detail](place-detail.md)). On a phone the detail is a layer over the chat. An option of a comparison opens in the panel too. The X of the detail closes the detail and the panel. A guest gets the sign-in wall ([PD6b](../decisions/pd-06b-login-gate-and-search.md)).
- **The preview.** To see each card kind and the empty panel with no listings, open `/chat?preview=results` or `/chat?preview=empty`. A "Sample data" badge shows on the panel.

## The choice we made

- The panel shows when intent, area and budget have a value: [interface-shape.md](../interface-shape.md), hole 3.
- The update rule, the empty state and the header states: [PD6c](../decisions/pd-06c-interface-holes.md).
- The preview with sample data: the spec of T-15.

## Gotchas

- **The area names come from the API.** While they load, the header shows the slug, such as `powai-vikhroli`.
- **The areas route is public.** `api()` takes no user for a public route, so the chat of a guest can name the areas.
- **Headless Chrome is at least 500 px wide.** To check the phone layout, set the size through the DevTools protocol (`Emulation.setDeviceMetricsOverride`), not with `--window-size`.

## Tickets

- T-15: the results panel, the labels, the empty state, the split view, the search of the form and the preview.
