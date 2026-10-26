# Saved

**In one line:** a signed-in user saves a place or a person with the Save button, and sees them again under Saved, in the tabs Places and People.

## What it is

- A **save** is one row that links a user to one listing or to one person card. A user saves an item one time: a second save changes nothing.
- The **Save button** says "Save". After a save, it says "Saved", and a second press unsaves.
- **Saved** is a page in the sidebar and in the phone bar. Its tabs are Places and People, and each shows the newest save first.

## How it fits our project

| Part | Where |
|---|---|
| The table | `saves` in `apps/api/src/db/schema.ts`: `user_id`, and exactly one of `listing_id` and `profile_id` |
| The routes | `apps/api/src/saved/routes.ts`: `PUT /v1/saved/places/:id` and `/v1/saved/people/:id`, `DELETE /v1/saved/:kind/:id`, and `GET /v1/saved/places` and `/v1/saved/people` |
| The button | `apps/web/components/saved/save-button.tsx`: `<SaveButton kind="places" id={…} />` |
| The page | `apps/web/app/saved/page.tsx`, with the place card of `apps/web/components/listings/place-card.tsx` |

- Only a live listing can be saved or listed. Only a live person card of an active account can be saved or listed, when it is not the user and no block exists in either direction. Each other item gets 404. The match query uses the same rule for people (`visiblePeople`).
- The web keeps the two lists in the cache keys `['saved', 'places']` and `['saved', 'people']`. The button reads them to know if an item is saved.
- T-43 and T-18b put the button on the detail screens. `GET /v1/saved/people` gives the person cards, and the People tab lists them; each card opens its person detail.

## The choice we made

- The scope, the button only on the detail screens, the tabs, and the phone bar: the spec of T-47 ([#150](https://github.com/magentawood/roomsie/pull/150)).
- How long a save stays: [PD19](../decisions/pd-19-retention.md).

## Gotchas

- **A paused listing leaves Saved, and comes back.** The list shows only live items. The save itself stays until the user unsaves it.
- **The deletion of an account deletes its saves in code.** The tombstone of T-20 keeps the `users` row, so the cascade of `user_id` does not run. `deleteAccount` deletes the saves.
- **Saving uses `PUT`.** CORS of the API must allow it, as it allows `PATCH` and `DELETE`.

## Tickets

- T-47: [#150](https://github.com/magentawood/roomsie/pull/150), 2026-10-26. The table, the routes, the Save button, the place card, the Saved page, and the phone bar of the designer.
- T-18b: [#159](https://github.com/magentawood/roomsie/pull/159), 2026-10-26. The person cards of the People tab.
