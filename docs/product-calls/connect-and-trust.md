# Product calls: connect, trust and safety

**Task:** F-13 · **Status:** open · **Updated:** 2026-10-24

## How to run this session

- Ask in rounds. A round holds each question with settled prerequisites. Ask one question at a time.
- Write each answer in the named record. Then delete the question from this file.
- The moderator (F-08) and the privacy drafter (F-07) must attend.

## Round 1

### PC-05 · What contact is revealed, and how we collect it
❓ After a mutual accept, what contact does each person see? Where do we collect it, and do we verify it?
- **Today:** T-18a says "both people see the number" (`docs/team-plan.json`). No table has a phone field (`apps/api/src/db/schema.ts`). Sign-in is Google only, and phone OTP waits (`docs/decisions/0005-managed-platform-split.md:13`). Go/no-go check 1 needs "sees a number".
- **Options:** a) a typed mobile number, not verified b) phone OTP at launch c) the Google email d) a WhatsApp link.
- **Blocks:** T-06, T-16a, T-16b, T-18a, T-18b, F-05, F-07, M-06.
- **Record:** a new PD record for connect and contact.
➡️ **Recommended:** a) and d), with OTP in v1. [PD8](../decisions/pd-08-verification.md) needs "a phone number, at minimum", and Mumbai uses WhatsApp ([PD11](../decisions/pd-11-launch.md)). Also correct "phone-verified" in [PD3c](../decisions/pd-03c-exclusionary-preferences.md).

### PC-08 · Retention windows
❓ How long do we keep anonymous sessions, their typed turns, Form B notes, raw events and the DigiLocker selfie?
- **Today:** `anonymous_sessions.expiresAt` has no rule (`apps/api/src/db/schema.ts`). T-39 has no period (`docs/team-plan.json`). Backups keep 14 days.
- **Options:** a) sessions 30 days, events 12 months b) 7 days and 6 months c) until account deletion.
- **Blocks:** F-07, T-39, T-46, PC-27.
- **Record:** [ADR-0012](../decisions/0012-analytics-event-store.md) for events. A new PD record for the rest.
➡️ **Recommended:** a). Account chats and Form B stay until deletion. ADR-0012 requires "a defined retention window". Delete the selfie after the check: [PD8](../decisions/pd-08-verification.md) keeps the result, never the document.

### PC-12 · Accept DeepSeek's data terms for user text
❓ Do DeepSeek's retention and training terms let us send interview text? What does the privacy notice say about the transfer out of India?
- **Today:** nobody examined the terms, which PD7 requires first (`docs/decisions/pd-07-models.md:125`).
- **Options:** a) accept and disclose b) send user text only to the Gemini fallback c) remove personal details first.
- **Blocks:** F-07, user traffic through T-11.
- **Record:** [PD7](../decisions/pd-07-models.md).
➡️ **Recommended:** a), if the F-07 drafter finds that the API terms exclude training and support deletion.

### PC-14 · Moderation rules
❓ Which report reasons does a user see? When do we suspend a person, and how fast do we respond?
- **Today:** `reports.reason` is free text (`apps/api/src/db/schema.ts`). F-08 requires these rules (`docs/team-plan.json`).
- **Options:** a) fixed reasons, 24 hours b) free text only c) fixed reasons, 4 hours for safety reports.
- **Blocks:** F-08, T-19, go/no-go check 5.
- **Record:** a new PD record for moderation.
➡️ **Recommended:** c). Reasons: fake profile, broker or spam, harassment, discriminatory text, age below 18, other. Hide a profile on a safety report, or on reports from two people. Then review it.

### PC-46 · A guest and "Say hi"
❓ Can a guest see a person card and tap "Say hi"?
- **Today:** [PD6b](../decisions/pd-06b-login-gate-and-search.md) puts a person behind sign-in. The flatmate card of the designs shows "Say hi" to a guest.
- **Options:** a) a guest sees the card, and "Say hi" opens sign-in b) sign-in before a card opens.
- **Blocks:** T-18b, T-43.
- **Record:** [PD6b](../decisions/pd-06b-login-gate-and-search.md).
➡️ **Recommended:** b). The card shows the photos, age and job of a person.

## Round 2

### PC-22 · How people get notified
❓ How does a person learn of a connect request, an accept or a waitlist opening?
- **Today:** no channel. The designs have "Email alerts".
- **Options:** a) email b) WhatsApp c) SMS d) web push e) nothing.
- **Blocks:** T-18a, T-18b, T-22a, PC-35, PC-36.
- **Record:** the PD record for connect and contact.
➡️ **Recommended:** a). Google sign-in gives each user a verified email. WhatsApp and SMS need sender approval.

### PC-27 · Tell users at chat start that we store typed text
❓ Before the first typed message, does the chat say that we store it?
- **Today:** PD6b settles storage. F-07 puts the notice in the policy only (`docs/team-plan.json`).
- **Options:** a) one fixed line above the composer, with a privacy link b) the policy only.
- **Blocks:** T-10, T-13.
- **Record:** [PD6b](../decisions/pd-06b-login-gate-and-search.md).
➡️ **Recommended:** a). PD11 says the DPDP Act requires "a clear data notice". People type before sign-in.

### PC-30 · Gender: field, preference filter, trust story
❓ Does a profile hold gender, and can a stated preference filter on it? What replaces the women-only trust story?
- **Today:** PD3c records gender preferences, but no profile has gender (`apps/api/src/db/schema.ts`). [PD1](../decisions/pd-01-audience.md) and PD8 keep the trust story open.
- **The designs:** a required gender field, the must-haves "Women only" and "Men only" (public), and "Who can move in" on a listing.
- **Options:** a) an optional field that a stated preference filters b) no field, record only c) a women-only mode.
- **Blocks:** T-06, T-08, T-14, T-16a, T-16b, M-06, D-04, PC-39.
- **Record:** [PD8](../decisions/pd-08-verification.md), "Revisit when".
➡️ **Recommended:** a), with "prefer not to say". The trust story: mutual accept before contact, report, block and a named moderator. DigiLocker verification is in v0 ([PD14](../decisions/pd-14-v0-is-the-figma-designs.md)).

### PC-31 · Community/religion: how a stated filter works without asking
❓ How does a stated community filter act on candidates that we do not ask?
- **Today:** [PD15](../decisions/pd-15-form-a-contract.md) removes the community question.
- **Options:** a) filter only on what candidates stated unasked b) record and log only.
- **Blocks:** T-08, T-12, T-14, T-36, M-06.
- **Record:** [PD3c](../decisions/pd-03c-exclusionary-preferences.md), Consequences.
➡️ **Recommended:** a). A candidate who stated nothing stays in the results. This obeys PD3c mitigations 1, 2 and 4.

### PC-34 · The age declaration at sign-in
❓ [PD16](../decisions/pd-16-profiles.md) makes age required, 18 or more. Do we also ask for a declaration at sign-in?
- **Options:** a) a declaration b) the required age only.
- **Blocks:** T-05, T-16a, F-07.
- **Record:** [PD16](../decisions/pd-16-profiles.md).
➡️ **Recommended:** a). Until DigiLocker, a stated age is the only check.

### PC-37 · Identity text in profile free text (PD3d in v0)
❓ If a profile has free text, can it say "Hindus only" or "girls only"?
- **Today:** a profile has a bio, and a listing has a description. [PD3d](../decisions/pd-03d-listing-identity-restrictions.md) leaves free text to this call.
- **Options:** a) allow it b) forbid it in the terms, and remove it on report c) a model check.
- **Blocks:** T-16a, T-16b, F-07.
- **Record:** [PD3d](../decisions/pd-03d-listing-identity-restrictions.md).
➡️ **Recommended:** b). The PD3c filter serves the user privately. Public text adds only the press risk.

## Round 3

### PC-35 · Connect rules
❓ Is 10 new requests a day correct? Do requests expire? After a decline, can the sender ask again? Can a request hold a note?
- **Today:** 10 a day (`docs/team-plan.json`). One open request in each direction. Statuses: `pending`, `accepted`, `declined`, `withdrawn` (`apps/api/src/db/schema.ts`).
- **Options:** a) 10 a day, 14-day expiry, no request after a decline b) 5 a day, no expiry c) retry after 30 days.
- **Blocks:** T-18a, T-18b, PC-41.
- **Record:** the PD record for connect and contact.
➡️ **Recommended:** a), with no note. A decline stops all pressure.

## Round 4

### PC-41 · Response to fake interviews that harvest contacts
❓ What stops a person, for example a broker, from the collection of contacts with fake interviews and requests?
- **Today:** "no response yet" (`docs/assistant-risks.md:70`). Only the daily cap exists.
- **Options:** a) the cap only b) a sender needs a visible card ([PD16](../decisions/pd-16-profiles.md)) c) moderator review of heavy senders d) phone OTP.
- **Blocks:** T-18a, T-19.
- **Record:** the PD record for connect and contact.
➡️ **Recommended:** b) and c). A number shows only after an accept, so a harvester needs accepts. "Broker or spam" is a report reason (PC-14).
