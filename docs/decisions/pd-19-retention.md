# PD19 — Retention: how long roomsie keeps each kind of data

**Status:** Settled. The privacy drafter (F-07) confirms it. Changed on 2026-10-26. · **Date:** 2026-10-25 · **Deciders:** n3rxv, for the founders

## Context

- The DPDP Act needs a stated period for each kind of personal data. ADR 0012 needs a retention window for raw events.
- Visitors chat before sign-up. Most of them never return.

## Decision

**In one line:** Visitor data goes after 30 days, raw events after 12 months, the ID photo and the selfie right after the review, and account data at deletion.

| Data | Kept for |
|---|---|
| The session, goals and chat turns of a visitor | 30 days after the last visit, unless the visitor signs in and the goals move to the account |
| Raw analytics events | 12 months |
| The chats, Form B notes, profile and messages of an account | Until the user deletes the account |
| The ID photo and the selfie of a verification | Deleted right after the review. A rule of the bucket deletes each file after 7 days, also with no review ([ADR 0020](0020-id-checks-in-s3-with-rekognition.md)). |
| The result of a verification, and the audit log of its views and reviews | Until the user deletes the account (T-46) |
| The photos of a listing and of its flatmates | Until the lister removes the photo or deletes the listing. The API deletes the photos in R2 before it deletes the rows (T-41). A copy at Cloudflare and in the browser can stay 10 minutes more (T-54). |
| The saved places and people of an account | Until the user unsaves them or deletes the account. The deletion of a listing or of an account deletes its saves (T-47). |
| The email of the sign-in and the push tokens of the browsers | Until the user deletes the account. A deletion clears the email and deletes the tokens (T-55). |
| Backups | See PD13 |

- After a deletion, the other person in a conversation sees "Deleted user".

## Rationale

- A visitor who does not sign in leaves little behind.
- Twelve months of events show a full rental season.
- A selfie is biometric data. PD8 keeps only the result.
- Ten minutes of Cloudflare copies keep the photos fast.

## Alternatives rejected

- **Visitors for 7 days, and events for 6 months.** A visitor who thinks about a move for two weeks loses the chat. Six months cannot show a full season.
- **A purge of the Cloudflare copies at each photo delete.** It needs a Cloudflare token in the API and more code, only to remove the last 10 minutes.
- **No cache rule.** Cloudflare keeps its copy for 2 hours by default, and a browser can keep one longer. A deleted photo, or a photo of a deleted account, shows too long.

## Consequences

- A visitor who comes back after 31 days starts a new chat.

## Revisit when

- The privacy drafter or a DPDP rule needs a different period.

## Sources

- The F-13 grill ([#105](https://github.com/magentawood/roomsie/issues/105))
- [ADR 0012](0012-analytics-event-store.md), [PD8](pd-08-verification.md), [PD13](pd-13-databases-and-backups.md)
