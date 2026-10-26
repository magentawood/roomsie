# Moderation: reports, blocks and the admin screen

**In one line:** a user reports or blocks a person; reports can hide a card or a listing at once, and a moderator reviews each report on the admin screen and dismisses it, keeps the hide, or suspends the account.

## What it is

- A **report** tells the moderator about a person or a listing. It has one of the seven reasons of PD18, and a detail. "Other" needs the detail. The person who is reported is not told who reported.
- A **block** hides two people from each other. The blocked person is not told.
- A **moderator** is a signed-in user whose Firebase uid is in the setting `MODERATOR_UIDS`. Only a moderator can open the admin screen at `/admin`.
- A **suspension** stops an account. The person is signed out everywhere, and cannot sign in again.

## How it fits our project

```
report ──▶ safety reason, or open reports from 2 people? ──yes──▶ hidden at once
   │                                                                   │
   └──────────────▶ the queue of the admin screen ◀────────────────────┘
                     ├── Dismiss ──▶ the reports close, the card or listing comes back
                     ├── Keep hidden (or Hide) ──▶ the reports close, it stays hidden
                     └── Suspend ──▶ the reports close, and the account stops
```

| Part | Where |
|---|---|
| The settings | `apps/api/src/moderation/settings.ts` |
| Report and block | `POST /v1/reports` and `POST /v1/blocks` |
| The admin routes | `GET /v1/admin/reports`, and `POST /v1/admin/people/:userId/review` or `/v1/admin/listings/:id/review` |
| The admin screen | `/admin`, in `apps/web/components/admin/report-queue.tsx` |

- **A report of a person** uses the profile id. A user can report each profile but the own profile, also a card that is not live, so that the recipient of a request can report its sender.
- **A hidden card** leaves the results, the person detail and Saved, and it cannot get a request. The owner sees "Hidden for review" on the profile page. "Hide my card" does not bring it back. A hidden listing works in the same way ([Place detail](place-detail.md)).
- **A block** hides the two people in the results, the person detail, Saved and the listings. An open message request between them becomes declined, so its sender sees "Not available" ([Message requests](message-requests.md)). There is no unblock in v0.
- **The queue** has one item for each reported person or listing, with all its open reports. Safety reports come first, then the oldest.
- **Suspend** sets `tokens_valid_after` to now, so each token of the person stops. It also hides the card and the listings, and closes each open report about the person. The open requests that the person sent are withdrawn. The open requests to the person are declined, so their senders see "Not available".

## The choice we made

- The reasons, the hide rule and the review times: [PD18](../decisions/pd-18-moderation.md).
- The admin routes and screen, the settings and the moderator list: the spec of T-19 ([#45](https://github.com/magentawood/roomsie/issues/45)).

## Gotchas

- **The rules are settings.** `REPORT_HIDE_AT_REPORTERS` (default 2) and `REPORT_SAFETY_REASONS` (default `harassment,under_18`) change the hide rule for people and listings. A change needs a redeploy.
- **Make a moderator.** Add the Firebase uid of the person to the GitHub secret `MODERATOR_UIDS` (comma-separated), then redeploy the API. With no uid, nobody is a moderator.
- **A guest and a non-moderator get 404**, from the admin routes and from `/admin`. Thus, the screen does not show that it exists.
- **The end of a suspension is not in v0.** A developer changes the status in the database.
- **A report of a deleted listing** goes to the item of its owner, because the listing is gone.

## Tickets

- T-19: [#158](https://github.com/magentawood/roomsie/pull/158), 2026-10-26. Person reports, blocks, the settings, the admin routes and the admin screen.
