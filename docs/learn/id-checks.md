# ID checks and the Verified badge

**In one line:** a person sends an ID photo and a live selfie, a named reviewer decides, and roomsie keeps only the result.

## What it is

- An **ID check** compares a selfie with the photo on a government ID: a passport, a driving licence, a voter ID or a PAN card. We never accept an Aadhaar ([PD8](../decisions/pd-08-verification.md)).
- A **live selfie** comes from the camera in the page at that moment. The page has no file picker for it, so an old photo from a phone gallery cannot go in.
- A **face match** is a score from 0 to 100 that Amazon Rekognition gives when it compares two faces. It is a help for the reviewer, not a decision.
- A **signed link** opens one private file for a short time. Our links last 5 minutes. After that, the link is dead.

## How it fits our project

```
the browser ──signed PUT──▶ private S3 bucket (Mumbai) ◀── Rekognition compares the two files
     │                                │
     └── send the check ──▶ API ──────┘ score ──▶ the "ID checks" screen ──▶ approve or reject
                                                                               │
                         the badge on the cards ◀── the result ◀───────────────┘ the files go
```

- **The person:** "Verify your ID" is in Profile and Settings, also with no profile. Step 1 is the ID type and its photo. Step 2 is the live selfie. The listing flow offers the same check after a publish, and the listing is already live.
- **The states:** not verified, in review ("We check within 24 hours"), verified, rejected (with the reason and the note of the reviewer), and expired after 7 days with no review.
- **The reviewer:** only the accounts in `REVIEWER_UIDS` open "ID checks" at `/admin/id-checks`. Each other person gets "not found". A rejection needs one of five reasons, and can have a note of at most 200 characters.
- **The audit log:** each photo link that the API gives a reviewer is one row, and each approve and reject is one more row.
- **What we keep:** the state, the method, the ID type, the reason and the note, the dates and the reviewer. The two files and the score go at the review ([PD19](../decisions/pd-19-retention.md)).
- **The alerts:** "You're verified on roomsie" or "Your ID check needs a new photo", by email and push ([Alerts](alerts.md)). No alert says the reason.
- **The badge:** "Verified" on a card. "Verified Owner", "Verified Lister" or "Verified Broker" on the detail of a place.

| Route | Who | What it does |
|---|---|---|
| `GET /v1/me/verification` | The person | The state of the latest check |
| `POST /v1/me/verification/upload-urls` | The person | Two upload links, for the ID photo and the selfie |
| `POST /v1/me/verification` | The person | Sends the check: the ID type and the two keys |
| `GET /v1/admin/verifications` | A reviewer | The checks in review, oldest first |
| `POST /v1/admin/verifications/:id/photos` | A reviewer | Two view links. A POST, because each call is a view in the audit log |
| `POST /v1/admin/verifications/:id/review` | A reviewer | Approve, or reject with a reason and a note |

## The choice we made

- The bucket, Rekognition and the keys: [ADR-0020](../decisions/0020-id-checks-in-s3-with-rekognition.md).
- The route of v0, the badge and what we keep: [PD8](../decisions/pd-08-verification.md).

## Gotchas

- **The setup.** The API needs the bucket `roomsie-id-checks`, the CI secret `REVIEWER_UIDS`, and the IAM user of the alerts, with access to that bucket and to `rekognition:CompareFaces`. The bucket needs a CORS rule for the PUT of the web, and a lifecycle rule that deletes each file after 7 days. The AWS account needs the AI services opt-out for Rekognition. Without the bucket name, the API takes no ID check.
- **A parent.** A parent can manage the card of a son or daughter. The parent sends the check, so that card never shows the badge of the parent.
- **No camera.** A laptop with no camera, or a blocked camera, shows "We can't open a camera". The person can verify on a phone.
- **A failed delete.** The review stays, and the error goes to the log. The lifecycle rule deletes the files after 7 days.
- **Tests.** The API tests use a fake ID store that records each link, delete and face match. The unit test of the ID store checks the signed links and the Rekognition request against a fake `fetch`.

## Tickets

- T-46: [#169](https://github.com/magentawood/roomsie/pull/169), 2026-10-27. The ID check, the review, the audit log and the badge.
