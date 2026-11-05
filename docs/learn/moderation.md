# Moderation: reports, blocks and the admin screen

**In one line:** a user reports or blocks a person; reports can hide a card or a listing at once, and a moderator reviews each report on the admin screen and dismisses it, keeps the hide, or suspends the account.

## What it is

- A **report** tells the moderator about a person or a listing. It has one of the seven reasons of PD18, and a detail. "Other" needs the detail. The person who is reported is not told who reported.
- A **block** hides two people from each other. The blocked person is not told.
- A **moderator** is a signed-in user whose Firebase uid is in the setting `MODERATOR_UIDS`. A moderator or an ID reviewer opens the admin home at `/admin`, and only a moderator opens the queue at `/admin/reports`.
- A **suspension** stops an account. The person is signed out everywhere, and cannot sign in again.
- A **removed** listing is taken down for good by a moderator. Only its owner sees it, with "Removed by a moderator", and it cannot go live again.
- The **moderation log** keeps each hide, unhide, suspend and remove, with the moderator and the time.

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
| The admin routes | `GET /v1/admin/home`, `GET /v1/admin/reports`, and `POST /v1/admin/users/:id/review` or `/v1/admin/listings/:id/review` |
| The admin screens | The home at `/admin` ([The admin home](admin-home.md)), and the queue at `/admin/reports`, in `apps/web/components/admin/report-queue.tsx` |
| People and listings | `GET /v1/admin/people`, `GET /v1/admin/listings`, the detail of each, and `POST /v1/admin/people/:id/actions` or `/v1/admin/listings/:id/actions`; the pages `/admin/people` and `/admin/listings`, in `apps/web/components/admin/directory.tsx` |
| The log | `apps/api/src/moderation/log.ts`, the table `moderation_log` |

- **A report of a person** uses the profile id. A user can report each profile but the own profile, also a card that is not live, so that the recipient of a request can report its sender.
- **A hidden card** leaves the results, the person detail and Saved. It cannot get a request, and its owner cannot send a new one. The owner sees "Hidden for review" on the profile page. "Hide my card" does not bring it back. A hidden listing works in the same way ([Place detail](place-detail.md)).
- **A block** hides the two people in the results, the person detail, Saved and the listings. An open message request between them becomes declined, so its sender sees "Not available" ([Message requests](message-requests.md)). Each saved comparison of the other person shows "Not available" for that person too ([Comparing cards](compare-cards.md)). There is no unblock in v0.
- **The queue** has one item for each reported person or listing, with all its open reports. Safety reports come first, then the oldest.
- **People and listings** finds each account by the name of its card or its sign-in email, and each listing by its area or by the name or the email of its lister. A list is a search or a filter, not both, and gives the 50 newest that match. A person shows the card as users see it, the email, the reports and the log, and never gender, religion or community. An action closes the open reports as the queue does: an unhide as dismissed, the other actions as actioned.
- **The log** gets a row from each action of People and listings and from each review of the queue that changes something. A dismiss of a hidden item is an unhide, and the suspend of a person also covers the hide of the card. Each row takes its time with `clock_timestamp()`, so two rows of one transaction keep their order.
- **The order of a list:** a search, no filter, and the filters Suspended, Hidden of listings and Removed give the newest accounts or listings. Reported gives the newest report first, Hidden of people the newest hide, and Verified the newest review.
- **Suspend** sets `tokens_valid_after` to now, so each token of the person stops. It also hides the card and the listings, and closes each open report about the person. The open requests that the person sent are withdrawn. The open requests to the person are declined, so their senders see "Not available".

## The choice we made

- The reasons, the hide rule and the review times: [PD18](../decisions/pd-18-moderation.md).
- The admin routes and screen, the settings and the moderator list: the spec of T-19 ([#45](https://github.com/magentawood/roomsie/issues/45)).

## Gotchas

- **The rules are settings.** `REPORT_HIDE_AT_REPORTERS` (default 2) and `REPORT_SAFETY_REASONS` (default `harassment,under_18`) change the hide rule for people and listings. `REPORT_SAFETY_LATE_HOURS` (4), `REPORT_LATE_HOURS` (24) and `ID_CHECK_LATE_HOURS` (24) set when the admin home marks a report or an ID check late. A change needs a redeploy.
- **Make a moderator.** Add the Firebase uid of the person to the GitHub secret `MODERATOR_UIDS` (comma-separated), then redeploy the API. With no uid, nobody is a moderator.
- **A non-moderator gets 404 from the admin routes**, and a guest gets 401. On the web, both see "not found" at each admin address. Thus, the screen does not show that it exists.
- **The end of a suspension is not in v0.** A developer changes the status in the database.
- **A report of a deleted listing** goes to the item of its owner, because the listing is gone.
- **The rows of the log about a person stay after an account deletion**, as the reports do, because the `users` row stays as a tombstone. A row of a deleted moderator shows "a deleted account". The rows of a listing go with the listing: when its owner deletes it, and at an account deletion.
- **A removed listing keeps its rows and photos** until its owner deletes it in Edit. A moderator cannot delete a listing or an account.

## Tickets

- T-19: [#158](https://github.com/magentawood/roomsie/pull/158), 2026-10-26. Person reports, blocks, the settings, the admin routes and the admin screen.
- T-63: [#230](https://github.com/magentawood/roomsie/pull/230), 2026-11-05. People and listings, the actions with the log, and the remove of a listing.
