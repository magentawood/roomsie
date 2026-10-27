# PD17 — Connect and contact: message requests, no phone numbers in public

**Status:** Settled. Changed on 2026-10-27 (T-55: the alerts). · **Date:** 2026-10-25 · **Deciders:** n3rxv, for the founders

## Context

- PD14 brought in-app messages into v0. The designs have "Say hi" on a card and a Messages inbox.

## Decision

**In one line:** People talk only in roomsie, through message requests; the system masks each phone number in public and in a request, and two people who connected can share numbers in their chat.

- **No phone numbers in public.** The system masks phone numbers and WhatsApp links as •••• in names, bios, listing descriptions, flatmate fields and request notes. The terms forbid them there.
- **Numbers in a chat.** After an accept, the two people can share a phone number in their messages. In v1, a subscription, still open in [PD4](pd-04-monetisation.md), brings back the masking of the chat.
- **Masked at save.** The API masks each public free-text field and each request note before the save, so the database never stores a phone number there (T-41).
- **Message requests.** "Say hi" sends one first note of up to 300 characters as a request. The receiver accepts or declines. Until an accept, the sender cannot write more.
- **Limits.** A sender has 10 new requests a day. A request expires after 14 days. Only one request is open between two people at a time.
- **After a decline.** The sender sees "Not available", never "Declined". The sender can send a new request later. Abuse goes to a report (PD18).
- **Alerts.** A new request, an accept and a message send an email and a browser push, with no message text: "Divya sent you a message". A chat sends one alert until the person reads it, and none while the person read it in the last 5 minutes. An accept counts as the alert of the chat for 5 minutes. The "Email alerts" and "Push alerts" switches turn them off. The services: [ADR 0019](0019-alerts-by-ses-and-fcm.md).
- **Bulk senders.** The cap and the reports only.

## Rationale

- A masked number cannot leak from a card, a listing or a request, and a chat stays a record that a report can point to.
- Two people who chose to connect can move to a call.
- A note gives the receiver a reason to accept. A request that waits for an accept stops unwanted messages.
- An alert with no text keeps messages out of inboxes and lock screens.

## Alternatives rejected

- **roomsie shows the phone number after a mutual accept.** A harvester needs only accepts, and the number cannot return. In v0, each person decides to type it.
- **Mask the chat in v0 too.** The product team keeps it for v1 (2026-10-27).
- **Block a note or a field that has a number.** The product team prefers to save it with the number masked.
- **No retry after a decline.** The product team prefers a second chance, and the report for abuse.
- **A complete card before "Say hi", and a weekly review of heavy senders.** The product team keeps the cap and the reports only.
- **Email only.** The product team also wants a browser push.

## Consequences

- The masking pattern must not mask a rent or a flat number.
- A spelled-out number ("nine eight…") can pass the pattern. The terms and the reports are the backstop.
- A number in a chat stays in the thread of the other person, also after a deletion of the account.

## Revisit when

- Reports show many spelled-out numbers, or bulk senders that the cap does not stop.
- v1 rolls out the subscription model: mask the chat again.

## Sources

- The F-13 grill ([#105](https://github.com/magentawood/roomsie/issues/105)), and the Product file: the flatmate detail, Messages, and the drafts page
- The T-44 review ([#120](https://github.com/magentawood/roomsie/issues/120)), 2026-10-27: numbers in a chat in v0
- [PD14](pd-14-v0-is-the-figma-designs.md), [PD8](pd-08-verification.md), [PD18](pd-18-moderation.md)
