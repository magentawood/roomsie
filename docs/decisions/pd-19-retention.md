# PD19 — Retention: how long roomsie keeps each kind of data

**Status:** Settled. The privacy drafter (F-07) confirms it. · **Date:** 2026-10-25 · **Deciders:** n3rxv, for the founders

## Context

- The DPDP Act needs a stated period for each kind of personal data. ADR 0012 needs a retention window for raw events.
- PD8 keeps the result of a verification, never the document.
- Visitors chat before sign-up. Most of them never come back.

## Decision

**In one line:** Visitor data goes after 30 days, raw events after 12 months, the DigiLocker selfie right after the check, and account data at deletion.

| Data | Kept for |
|---|---|
| The session, goals and chat turns of a visitor | 30 days after the last visit, unless the visitor signs in and the goals move to the account |
| Raw analytics events | 12 months |
| The chats, Form B notes, profile and messages of an account | Until the account is deleted |
| The DigiLocker selfie | Deleted right after the check |
| Backups | 14 days (PD13) |

- After a deletion, the other person in a conversation sees "Deleted user".
- The privacy drafter confirms these periods when F-07 names the drafter, or changes them.

## Rationale

- A visitor who does not sign in leaves little behind.
- Twelve months of events show a full rental season.
- A selfie is biometric data. PD8 keeps only the result.

## Alternatives rejected

- **Visitors for 7 days, and events for 6 months.** A visitor who thinks about a move for two weeks loses the chat. Six months cannot show a full season.

## Consequences

- T-39 deletes raw events after 12 months. T-46 deletes the selfie after the check. T-20 shows "Deleted user".
- A visitor who comes back after 31 days starts a new chat.

## Revisit when

- The privacy drafter or a DPDP rule needs a different period.

## Sources

- The F-13 grill ([#105](https://github.com/magentawood/roomsie/issues/105))
- [ADR 0012](0012-analytics-event-store.md), [PD8](pd-08-verification.md), [PD13](pd-13-databases-and-backups.md)
