# PD19 — Retention: how long roomsie keeps each kind of data

**Status:** Settled. Confirmed by F-07. Changed on 2026-11-06. · **Date:** 2026-10-25 · **Deciders:** n3rxv, for the founders

## Context

- The DPDP Act needs a stated period for each kind of personal data. ADR 0012 needs a retention window for raw events.
- Visitors chat before sign-up. Most of them never return.

## Decision

**In one line:** Visitor data goes after 30 days, raw events after 12 months by whole month, the ID photo and the selfie right after the review, and account data at deletion.

| Data | Kept for |
|---|---|
| The session, goals and chat turns of a visitor, with their Form B notes, traces and feedback | 30 days after the last visit, unless the visitor signs in and the goals move to the account. Each day at 04:30 IST, a job deletes each session that nobody claimed (T-67). Thus, a visitor chat stays at most 31 days after the last visit. A claimed session stays until the account deletion. |
| The waitlist entry of a visitor: the email and the place | Until the chat goes and the team invites the email, whichever comes later. The job of the visitors keeps the entry with no chat, and deletes it after the team sets its invite time (T-67). The entry of an account goes with its chat. |
| Raw analytics events | 12 months, deleted by whole month. Each day at 04:00 IST, a job drops each month that ended 12 months ago or earlier. Thus, an event stays at most 13 months and one day (T-39). |
| The chats with the assistant, the Form B notes and the profile of an account | Until the user deletes the account |
| The messages and request notes that a person sent | They stay with the other person after an account deletion, from "Deleted user" (T-44) |
| The registration record: the sign-in email, the sign-up date and the deletion date | 180 days after the account deletion, in a locked record, as Rule 3(1)(h) of the IT Rules asks (T-69, [PD21](pd-21-legal-texts.md)) |
| Reports, blocks and the moderation log | No end. They stay after an account deletion, for moderation. |
| The tombstone of a deleted account: the sign-up and deletion dates, if it was suspended, and a hash of the Google account id | The dates and the suspension have no end. The hash stops a suspended person, or one with an open report, from a new account (T-20). It goes when the person joins again. |
| A quote on the landing page, with its name | Until a moderator removes it (T-23a) |
| An invite email of the invite gate | Until a moderator removes it (T-33) |
| The ID photo and the selfie of a verification | Deleted right after the review. A rule of the bucket deletes each file after 7 days, also with no review ([ADR 0020](0020-id-checks-in-s3-with-rekognition.md)). |
| The result of a verification, and the audit log of its views and reviews | Until the user deletes the account (T-46) |
| The photos of a listing and of its flatmates | Until the lister removes the photo or deletes the listing. The API deletes the photos in R2 before it deletes the rows (T-41). A copy at Cloudflare and in the browser can stay 10 minutes more (T-54). |
| The saved places and people of an account | Until the user unsaves them or deletes the account. The deletion of a listing or of an account deletes its saves (T-47). |
| The email of the sign-in and the push tokens of the browsers | Until the user deletes the account. A deletion clears the email and deletes the tokens (T-55). The registration record keeps the email for 180 days. |
| The traces of the model calls: the prompts and the raw answers, masked | 30 days after the call, and at once with the account ([PD20](pd-20-model-traces.md)). A nightly job deletes the older traces. |
| The log of the opens of a trace: the session code, the number of the turn, the moderator and the time | No end: it holds no text of a person ([PD20](pd-20-model-traces.md)). After the moderator deletes the account, a row shows "a deleted account". |
| The counts of the analytics events of each day (T-66) | No end: they hold counts and no person. A job counts the last three days again each night. |
| The text that the models got, at DeepSeek and Google | Under their terms: DeepSeek keeps it in China with no stated end, and Google keeps it 55 days to find abuse. Each week, the Grievance Officer asks both to delete the text of the accounts that were deleted that week ([PD21](pd-21-legal-texts.md)). |
| Backups | See PD13 |


## Rationale

- A visitor who does not sign in leaves little behind.
- Twelve months of events show a full rental season.
- A whole month goes with one quick drop of its table. One more month of events is a small cost.
- A selfie is biometric data. PD8 keeps only the result.
- Ten minutes of Cloudflare copies keep the photos fast.

## Alternatives rejected

- **Visitors for 7 days, and events for 6 months.** A visitor who thinks about a move for two weeks loses the chat. Six months cannot show a full season.
- **A daily delete of the events older than 12 months.** It is exact, but each delete leaves dead rows that the database must clean.
- **A purge of the Cloudflare copies at each photo delete.** It needs a Cloudflare token in the API and more code, only to remove the last 10 minutes.
- **No cache rule.** Cloudflare keeps its copy for 2 hours by default, and a browser can keep one longer. A deleted photo, or a photo of a deleted account, shows too long.

## Consequences

- A visitor who comes back after 31 days starts a new chat.

## Revisit when

- A DPDP rule or a lawyer needs a different period.

## Sources

- The F-13 grill ([#105](https://github.com/magentawood/roomsie/issues/105))
- [ADR 0012](0012-analytics-event-store.md), [PD8](pd-08-verification.md), [PD13](pd-13-databases-and-backups.md)
