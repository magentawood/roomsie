# Message requests

**In one line:** "Say hi" sends a request with a short note, the other person accepts or declines, and only then can the two people chat; a phone number never shows.

## What it is

A **message request** is a first message that waits for permission. It does not go straight to an inbox. It waits in the "Requests" list of the other person until they choose. Instagram and LinkedIn work in the same way for people that you do not follow.

## How it fits our project

```
Rahul taps "Say hi" ──▶ a note (max 300 characters) ──▶ Divya's Requests list
                                                        ├── Accept ──▶ the chat opens
                                                        ├── Decline ──▶ Rahul sees "Not available"
                                                        └── no answer for 14 days ──▶ expired
```

- Divya gets an email and a browser push: "Rahul sent you a message". Neither shows the note.
- Until Divya accepts, Rahul cannot write more.
- Rahul can also say hi through a listing. The request goes to the owner of the listing, who needs no profile. The rules are the same.
- A sender has 10 new requests in a day of India time.
- Between two people, one request is open at a time, in either direction. After an accept, neither person can send a new request.
- After a decline, Rahul can send a new request later. If this becomes abuse, Divya reports it.

## The API

| Route | What it does |
|---|---|
| `POST /v1/requests` | Sends a request to a card (`toProfileId`) or to a listing (`listingId`), with the note. The sender needs a profile. |
| `GET /v1/requests/incoming` | Gives the open requests to you: the name and the photo of the sender, the note, and the time of the expiry. |
| `GET /v1/requests/outgoing` | Gives your requests, each with its state: open, accepted or not available. |
| `POST /v1/requests/:id/accept` and `/decline` | The recipient answers an open request. |

## The choice we made

- Message requests, no phone numbers, and the limits: [PD17](../decisions/pd-17-connect-and-contact.md).
- The report reasons and the response times: [PD18](../decisions/pd-18-moderation.md).

## Gotchas

- **Masking:** the API masks phone numbers and WhatsApp links as ••••. The pattern must not mask a rent ("15000") or a flat number ("1203").
- **A spelled-out number** ("nine eight two…") can pass the pattern. The terms and the reports are the backstop.
- **"Not available" is the same for a decline and an expiry.** Thus, a sender never learns which one it was.
- **An expiry needs no job.** After 14 days, the API stops showing a request as open. The row gets the status "expired" only when one of the two people sends a new request.
- **A 404 hides a block.** A hidden card, a block and an unknown card all give 404. Thus, the sender cannot learn about a block.
- **A block declines an open request.** Its sender sees "Not available", as after a decline ([Moderation](moderation.md)).
- **The note waits for the chat.** T-44 makes the note of an accepted request the first message of the chat.

## Tickets

- F-13: [#132](https://github.com/magentawood/roomsie/pull/132), 2026-10-25. The rules of message requests.
- T-18a: [#157](https://github.com/magentawood/roomsie/pull/157), 2026-10-26. The API of message requests.
