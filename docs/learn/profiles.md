# Profiles and cards

**In one line:** a signed-in user makes one profile with a name, an age of 18 or more and a gender; the card goes live by itself when it is complete, and other users read it through the API.

## What it is

- A **profile** holds the fields of PD16 and the Form A fields of PD15: who is moving, the areas, the budget, the move date, the eight lifestyle answers and the seven must-haves. The room type is a Form A field that only the chat fills.
- A **card** is what other users see of a profile. It has no gender: the designs do not show it, and the filters that use it run on the server.
- A card is **live** when the name, the age, who is moving, the areas and the budget are complete, unless "Hide my card" is on. If not, it is a draft, or hidden. A budget is complete when its lowest or its highest amount is set, so the band "Above ₹35k" counts.
- Reports can hide a live card until a moderator reviews it. The owner then sees "Hidden for review" ([Moderation](moderation.md)).
- A **parent** can run the card of a son or daughter of 18 or more. The parent says what the son or daughter does, and the card shows "Managed by a parent".

## How it fits our project

| Part | Where |
|---|---|
| The schemas | `packages/contract/src/profiles.ts`: the Form A answers, the create and edit bodies, and the replies |
| The routes | `apps/api/src/profiles/routes.ts`: `POST`, `PATCH` and `GET /v1/me/profile`, `POST /v1/me/profile/upload-urls` and `GET /v1/people/:id` |
| The replies | `apps/api/src/profiles/read.ts`: the card, the own profile, and the fields that a card still needs |
| The lister on a listing | `partsOf` and `listingView` in `apps/api/src/listings/read.ts` |
| The screens | `apps/web/app/profile/page.tsx`, and `apps/web/components/profile/`: the page, the create dialog and the delete dialog |
| The pure parts of the screens | `apps/web/lib/profile-form.ts`: the budget bands, "What best describes you?", the edit body and the labels |

- An edit sends only the fields that change. `null` clears a field, and in `lifestyle` and `mustHaves` it clears one answer.
- A value from the profile form is "stated". T-08 adds the values that the chat infers.
- The reply of the own profile has `visibility` and `missing`, so the profile screens can tell why a card is not live.
- `GET /v1/people/:id` uses the rule that Saved and the match query use (`visiblePeople`). It also gives the connection with the viewer for the person detail at `/people/[id]` ([Message requests](message-requests.md)).
- A listing shows the name and the first photo of the profile of its lister. A card of a son or daughter is not the lister.
- After a sign-in, the app shell opens the create dialog when the account has no profile. "Explore for now" closes it until the browser tab closes.
- The page saves its fields with one Save button. A photo saves at once, so no uploaded photo waits for a Save.
- "Delete my account" calls `DELETE /v1/me`, then signs out.

## The choice we made

- The fields, adults only, the parent and the visibility rule: [PD16](../decisions/pd-16-profiles.md). The Form A fields: [PD15](../decisions/pd-15-form-a-contract.md). The gender: [PD8](../decisions/pd-08-verification.md).
- The routes, the follow-up choice of a parent and the lister: the spec of T-16a ([#36](https://github.com/magentawood/roomsie/issues/36)).
- The create dialog, the page, the photos that save at once, the budget bands and the delete: the spec of T-16b ([#98](https://github.com/magentawood/roomsie/issues/98)).

## Gotchas

- **The catalogues must exist.** A lifestyle answer and a must-have refer to the rows that the seed of the deploy makes. A test database needs `seedCatalogues`.
- **A photo change and the deletion of an account lock the same account row.** The deletion reads and deletes the photos while it holds the lock, so the deletion cannot miss a new photo.
- **R2 fails, nothing changes.** A removed photo leaves R2 before its row. If R2 fails, the edit gives 502.
- **One profile for each account.** A second create gives 409.

## Tickets

- T-16a: [#155](https://github.com/magentawood/roomsie/pull/155), 2026-10-26. The profile API, the photos, one card, the gender and the lister on a listing.
- T-16b: [#156](https://github.com/magentawood/roomsie/pull/156), 2026-10-26. The profile page, the create and delete dialogs, and the budget rule of the bands.
- T-18b: [#159](https://github.com/magentawood/roomsie/pull/159), 2026-10-26. The person detail and the connection with the viewer.
