# Roomsie Noticed

**In one line:** under the results of a search, a box "Roomsie Noticed" gives up to three notes that the code counted, each with a button that changes the search, and chips under it ask the next step.

## What it is

- **The box** of flow 02 comes under the results card of the newest search. It waits while a reply is on its way, and a closed goal has none.
- **Each results card has a note** (the founders, 2026-11-09). With results and no other note, the box gives what places in the areas usually cost, or for people what a 2 BHK there costs each when two share it. The button of that note for people shows 2 BHK flats.
- **With results**, a note can say:
  - "Heads up, only 6 of 24 have a veg kitchen, if that matters to you." The button makes the must-have a dealbreaker. The must-have that the lifestyle answers point to comes first.
  - "15 people looking around Bandra–Santacruz want to team up." The button switches the search to people to rent with.
  - "12 are a 10-min walk or less from a metro or station." The button makes "Near a station" a dealbreaker.
- **With no results**, a note can say what the places in the areas usually cost and what the cheapest one costs, that a neighbouring area has places at this budget, and what a 2 BHK in the area costs each when two people share it.
- **The chips under the box** are the next message of the person. With results: "Which one's the best deal?", which compares the top three cards (a guest gets the sign-in wall), and "Show some PGs too" or "Show me some flats as well". With none: the next budget band, and a different kind of place.
- **"Show some PGs too" adds a kind of place.** Form A keeps a list of place types, so the search gives rooms and PGs together, the panel says "Rooms and PGs in …", and the title says "Place hunting in …". People to rent with go alone.
- **"Near a station"** is a must-have: a walk of ten minutes or less. A listing that has no walk time shows "Didn't say: walk to a station". A person cannot answer it, so the profile form does not show it.

## Where it is

| Part | File |
|---|---|
| The counts | `apps/api/src/results/noticed.ts`, with `listingCounts`, `rentsOf` and `twoBhkCosts` in `apps/api/src/listings/match.ts`, and `peopleCounts` and `teamUpCount` in `apps/api/src/profiles/match.ts` |
| The response | `noticed` of `resultsResponse` in `packages/contract/src/results.ts`: first page only, and an older API sends none |
| The words and the chips | `apps/web/lib/noticed.ts`: `noteLines()` and `followUps()` |
| The box | `apps/web/components/chat/noticed.tsx`, under the results card in `chat-screen.tsx` |

- **Each number comes from the query.** A note shows only when the data backs it, so no model writes it and no note can state a count that is not true.
- **A button and a chip are chip taps** ([the chips](chat-screen.md)): no model reads them, and each answer shows as the message of the person.
- **The minutes of a deploy.** The old web reads a list of place types as a form that is not valid, and an open tab needs a reload.

## The choice we made

- The rules of the notes, the list of place types and "Near a station": [PD3a](../decisions/pd-03a-flatmate-matching.md) and [PD15](../decisions/pd-15-form-a-contract.md).

## Tickets

- [#244](https://github.com/magentawood/roomsie/pull/244), 2026-11-09. The box, the chips, the list of place types and "Near a station".
