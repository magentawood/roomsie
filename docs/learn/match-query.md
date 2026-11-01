# The match query

**In one line:** the match query takes a Form A and gives the people or the places that fit, in the Best Matches order.

## What it is

- **A search** is `POST /v1/results` with a Form A and a page number. A guest can search, because the results grid has no login gate ([PD6b](../decisions/pd-06b-login-gate-and-search.md)).
- **The response** is a function of the form only ([PD6c](../decisions/pd-06c-interface-holes.md)). Each result is a person card or a listing card, with "Best match" and "Didn't say" ([Form A and intent](form-a-and-intent.md)).
- **A filter** removes a card. **The order** ranks the cards that stay. A gap does not remove a card. It moves the card down ([PD3a](../decisions/pd-03a-flatmate-matching.md)).

## How it fits our project

```
POST /v1/results ──► results module ──┬─► profiles module: matchingPeople   (flatmates seekers)
   Form A + page                      ├─► listings module: matchingListings (room, PG, whole flat)
                                      └─► observations module: formBPoints  (the tie-break)
```

| The seeker wants | The search gives |
|---|---|
| `room` | room-in-a-flat listings |
| `pg` | PG listings |
| `whole_flat` | owner flats and broker flats |
| `flatmates` | other flatmates seekers |
| `unclear`, or no intent | nothing |

- **The filters:** the area and the areas under it, the budget, the move date (30 days before or after), the room type, the dealbreakers, "Who can move in" and "Who is welcome".
- **The budget:** a rent up to 10% over the budget passes, and ranks below the rents in the budget. Two people pass when their budgets overlap.
- **Between people, each dealbreaker works both ways.** A known answer that fails hides the card. A dealbreaker that the other person did not answer moves the card down.
- **The order:** full matches, in budget, the most preferences met, the Form B points, the nearest move date, the newest.
- **An empty search** also gives the suggested posts: the next budget band and two neighbours of the area group, with four cards each. The seed puts the neighbours on the `areas` table.
- **Each page** fires `results_shown` with its count.
- **The setting:** `FORM_B_CONFIDENCE_FLOOR` (default 0.5). A Form B note counts only above it.

## The choice we made

- The rules of the filters, the order and the labels: [PD3a](../decisions/pd-03a-flatmate-matching.md).
- "Who's moving" against "Who is welcome", and the room type: [PD15](../decisions/pd-15-form-a-contract.md).
- The route, the suggested posts, the neighbours and the pages: [#187](https://github.com/magentawood/roomsie/pull/187).

## Gotchas

- **A guest has no gender.** A card with "Women only", or a listing for men only, shows below the full matches for a guest. It does not go.
- **A searcher with no "Who's moving" is a gap.** A listing that names a group of "Who is welcome" shows below the full matches. It does not go.
- **"Couple friendly" on a room is a gap.** A room can welcome only students and working professionals. Thus, a room, or a listing with no household group, shows "Couple friendly" in "Didn't say".
- **A guest has no Form B points** until a route knows the session of the guest (T-21, T-17).
- **A preference that does not apply does not count.** "Couple friendly" does not apply to a person, and "Tidy flatmates" does not apply to a listing. "Best match" needs three preferences that apply, all met, on a full match.
- **Postgres sorts the results.** Change the SQL in `profiles/match.ts`, `listings/match.ts` and `ranking.ts`, not a sort in TypeScript ([database.md](../standards/database.md)).
- **A new area group needs its neighbours** in the seed, or an empty search there gives no area suggestion.

## Tickets

- T-14: [#187](https://github.com/magentawood/roomsie/pull/187), 2026-11-02. The route, the filters, the order, the labels, the suggested posts and the event.
