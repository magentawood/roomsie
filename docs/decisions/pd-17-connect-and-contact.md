# PD17 — Connect and contact: message requests, no phone numbers

**Status:** Settled · **Date:** 2026-10-25 · **Deciders:** n3rxv, for the founders

## Context

- PD14 brought in-app messages into v0. The designs have "Say hi" on a card and a Messages inbox.

## Decision

**In one line:** People talk only in roomsie, through message requests, and the system masks every phone number.

- **No phone numbers.** roomsie never reveals a phone number. The system masks phone numbers and WhatsApp links as •••• in messages, bios, listing descriptions and flatmate fields. The terms forbid them (PD18).
- **Message requests.** "Say hi" sends one first note of up to 300 characters as a request. The receiver accepts or declines. Until an accept, the sender cannot write more.
- **Limits.** A sender has 10 new requests a day. A request expires after 14 days. Only one request is open between two people at a time.
- **After a decline.** The sender sees "Not available", never "Declined". The sender can send a new request later. Abuse goes to a report (PD18).
- **Alerts.** A new request or message sends an email and a browser push, with no message text: "Divya sent you a message". The "Email alerts" and "Push alerts" switches turn them off.
- **Bulk senders.** The daily cap and the reports are the only checks.

## Rationale

- A masked number cannot leak, and a chat stays a record that a report can point to.
- A note gives the receiver a reason to accept. A request that waits for an accept stops unwanted messages.
- An alert with no text keeps messages out of inboxes and lock screens.

## Alternatives rejected

- **The phone number after a mutual accept.** A harvester needs only accepts, and the number cannot come back.
- **Block a message that has a number.** The product team prefers to send it with the number masked.
- **No retry after a decline.** The product team prefers a second chance, and the report for abuse.
- **A complete card before "Say hi", and a weekly review of heavy senders.** The product team keeps the cap and the reports only.
- **Email only.** The product team also wants a browser push.

## Consequences

- The masking pattern must not mask a rent or a flat number. T-44 tests it on real examples.
- A spelled-out number ("nine eight…") can pass the pattern. The terms and the reports are the backstop.

## Revisit when

- Reports show many spelled-out numbers, or bulk senders that the cap does not stop.

## Sources

- The F-13 grill ([#105](https://github.com/magentawood/roomsie/issues/105)), and the Product file: the flatmate detail, Messages, and the drafts page
- [PD14](pd-14-v0-is-the-figma-designs.md), [PD8](pd-08-verification.md), [PD18](pd-18-moderation.md)
