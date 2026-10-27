# Message requests

**In one line:** "Say hi" sends a request with a short note, the other person accepts or declines, and only then can the two people chat; a phone number never shows in public or in a note.

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
- If Divya's app is open, the API also sends a "request" event to her private channel. The event has only the id of the request, and her app then gets the list again ([Messages and realtime](messages.md)).
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
| `GET /v1/requests/outgoing` | Gives your requests, the newest first, each with its state (open, accepted or not available), the note, and the person who gets it as a conversation shows them. |
| `POST /v1/requests/:id/accept` and `/decline` | The recipient answers an open request. |
| `GET /v1/people/:id` | Gives the card, the connection with you (none, sent, received with the note, accepted, or not available), and the new requests that you can still send today. |

In the web, Divya answers at `/messages/requests`, and Accept opens the chat. Rahul sees his request in his inbox as a thread: "Request sent" with no composer, or "Not available". The inbox shows each person or listing one time: the chat, or else the newest request. A listing detail has a button for its lister, for example "Message the owner", with the same states.

The person detail at `/people/[id]` shows one connect state from this connection: "Say hi", "Request sent", the daily cap, the note of a request to you with Accept and Decline, the chat button after an accept, or the line of "Not available" under a new "Say hi".

## The choice we made

- Message requests, no phone numbers in public, and the limits: [PD17](../decisions/pd-17-connect-and-contact.md).
- The report reasons and the response times: [PD18](../decisions/pd-18-moderation.md).

## Gotchas

- **Masking:** the API masks phone numbers and WhatsApp links as •••• in a note. The pattern must not mask a rent ("15000") or a flat number ("1203"). After the accept, the chat can carry a number in v0 ([Messages and realtime](messages.md)).
- **A spelled-out number** ("nine eight two…") can pass the pattern. The terms and the reports are the backstop.
- **"Not available" is the same for a decline and an expiry.** Thus, a sender never learns which one it was.
- **An expiry needs no job.** After 14 days, the API stops showing a request as open. The row gets the status "expired" only when one of the two people sends a new request.
- **A 404 hides a block.** A hidden card, a block and an unknown card all give 404. Thus, the sender cannot learn about a block.
- **A block declines an open request.** Its sender sees "Not available", as after a decline ([Moderation](moderation.md)).
- **The note opens the chat.** At the accept, the note becomes the first message of the conversation ([Messages and realtime](messages.md)).

## Tickets

- F-13: [#132](https://github.com/magentawood/roomsie/pull/132), 2026-10-25. The rules of message requests.
- T-18a: [#157](https://github.com/magentawood/roomsie/pull/157), 2026-10-26. The API of message requests.
- T-18b: [#159](https://github.com/magentawood/roomsie/pull/159), 2026-10-26. The person detail and its connect states.
- T-44: [#160](https://github.com/magentawood/roomsie/pull/160), 2026-10-27. The note opens the conversation, and a deletion keeps the requests.
- T-45: [#167](https://github.com/magentawood/roomsie/pull/167), 2026-10-27. The requests screen, the sent requests in the inbox, the message button of a listing, and the live "request" event.
