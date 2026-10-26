# Place detail and listing reports

**In one line:** a signed-in user opens the full detail of a place, and can report it; a safety report, or reports from two people, hide the listing at once.

## What it is

- The **place detail** is the page `/places/<id>`. It shows the four kinds of the Product file: a room in a flat, an owner flat, a PG or hostel, and a broker flat.
- A **listing report** gives one of the seven reasons of PD18, and a detail. "Other" needs the detail.
- A **hidden listing** has a hide time. Other users do not see it, and the owner sees "Hidden for review". Only the moderator clears the hide time.

## How it fits our project

| Part | Where |
|---|---|
| The page | `apps/web/app/places/[id]/page.tsx` and `apps/web/components/places/place-detail.tsx` |
| The lines of each part | `apps/web/lib/place-detail.ts`, a pure module with its tests. The labels come from `labels` of `listing-steps.ts` |
| The report sheet | `apps/web/components/places/report-sheet.tsx` |
| The route | `POST /v1/reports` in `apps/api/src/reports/routes.ts` |
| The hide rule | `isVisible` and `visibleListing` in `apps/api/src/listings/read.ts` |

- The listing reply has two flags: `mine` (the listing belongs to the user who asks) and `hidden`. Only the owner gets a hidden listing; other users get 404.
- The visible rule is one rule for the detail, Saved and each other read. A hidden listing thus leaves Saved too.
- A part of the page with no data does not show.
- The cards of Saved open the detail.
- Share opens the share sheet of the phone. Where a browser has no share sheet, it copies the link.

## The choice we made

- The scope, the page, the report and the hidden buttons: the spec of T-43 ([#119](https://github.com/magentawood/roomsie/issues/119)).
- The reasons, the hide rule and the review times: [PD18](../decisions/pd-18-moderation.md).
- The match sentence and the "Verified" pill do not show: [PD3a](../decisions/pd-03a-flatmate-matching.md), [PD8](../decisions/pd-08-verification.md).

## Gotchas

- **The client makes the id of a report.** It is a UUIDv7, and its time must be at most 5 minutes from the server clock (ADR-0015). The sheet makes the id at the first tap and keeps it, so a retry files no second report. A user reports a listing one time.
- **Two reports at the same time.** The route locks the listing row, so each report counts the other one.
- **A delete keeps the report.** When the owner deletes a reported listing, the report stays for the moderator, with no listing.
- **A status change does not undo a hide.** The owner can pause and go live again, and the listing stays hidden.
- **A 404 gets no retry.** The page shows "This place is no longer listed." at once.

## Tickets

- T-43: the place detail, listing reports and the hide rule, 2026-10-26.
