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
- A sender has 10 new requests a day. Only one request is open between two people at a time.
- After a decline, Rahul can send a new request later. If this becomes abuse, Divya reports it.

## The choice we made

- Message requests, no phone numbers, and the limits: [PD17](../decisions/pd-17-connect-and-contact.md).
- The report reasons and the response times: [PD18](../decisions/pd-18-moderation.md).

## Gotchas

- **Masking:** the API masks phone numbers and WhatsApp links as ••••. The pattern must not mask a rent ("15000") or a flat number ("1203").
- **A spelled-out number** ("nine eight two…") can pass the pattern. The terms and the reports are the backstop.
- **"Not available" is the same for a decline and an expiry.** Thus, a sender never learns which one it was.

## Tickets

- F-13: [#132](https://github.com/magentawood/roomsie/pull/132), 2026-10-25. The rules of message requests.
