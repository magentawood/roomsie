# PD8 — Verification: DigiLocker, not Aadhaar copies

**Status:** Settled with one change · **Date:** 2026-09-22 · **Deciders:** Yash

## Context

The proposed design: blurred cards for verified-only users, verification for
**each** party, and two routes. The routes were DigiLocker, or a manual upload
of a selfie and an Aadhaar photo or PDF. The manual route must change.

## Decision

**In one line:** Verification uses DigiLocker through a registered KYC provider, with a non-Aadhaar government ID as the manual fallback, and we store the result, never the document.

- **Verified-only and mutual.** Users who opt into verified-only show as
  blurred cards. Only verified users see them.
- **The blur is server-side.** At upload, make a different blurred asset and
  serve its URL. Never give the address of the initial image to a viewer
  without permission.
- **We drop the manual Aadhaar upload route.**
- **Primary route: DigiLocker through a registered KYC provider**, such as
  Surepass, AuthBridge, Sandbox or IDfy.
- **Manual fallback: a non-Aadhaar government ID** (passport, driving licence
  or voter ID). A person compares the selfie to the ID photo.
- **Store the result, never the document:**

| Store | Do not store |
|---|---|
| Verified, yes or no | The document image |
| Method used | The full Aadhaar number |
| Timestamp | More of the Aadhaar XML than necessary |
| Name as returned | |
| Last 4 digits at most, only if we store a value | |

- Delete the document after the check.
- **Show one badge. Record the route internally.**
- Guard 1: at launch, the verified-only setting is **off**.
- Guard 2: always show the **count** of hidden matches.

## Rationale

- **The blur is the conversion prompt**, not only protection. The mutual rule
  makes verification grow itself: each blurred card is a reason to verify. "3
  of your 4 matches are verified only" converts better than a settings page.
- **Without a count**, a blurred card is only an absence.
- **Guard 1:** at launch, almost no users have verification. Offer the setting
  when the verified pool is sufficiently large to hide in.
- **A CSS blur gives no protection.** Anyone can read the initial image in the
  network tab. This is the most frequent error in this feature. The blurred
  copy is one more object with a different access rule. The server blur
  agrees with ADR 0005: short-lived signed URLs
  after an authorisation check.
- **The law restricts Aadhaar copies.** Under the Aadhaar Act 2016
  (sections 29(2), 29(3), 29(4) and 37), unlicensed private entities must not
  collect or keep Aadhaar copies. It is an offence. UIDAI approved a rule: a
  private entity must register before it verifies Aadhaar. It must use
  approved methods, **not physical or digital copies**. UIDAI will ban
  photocopy collection.
- **Do not accept the breach risk.** The manual route puts the most sensitive
  identity data in India into the storage of a small startup.
- **DigiLocker gives a verified assertion.** After OTP authentication, it
  returns a signed Aadhaar XML, and we never hold the document. Approximately
  4,313 agencies have the document-requester status.
- **Buy, do not build.** A direct connection needs MeitY registration. Four
  part-time engineers should not spend a month on it.
- **The fallback avoids the legal problem.** The Aadhaar Act restrictions do
  not apply to the fallback IDs.
- **DigiLocker first, not optional.** It is instant and needs no person.
  Manual review is a job, not a feature. At a hundred signups a day, it takes
  most of the morning of one person.
- **One badge.** Two levels cause confusion and make the lower level look
  not truly verified. But monitor the manual route for fraud: a person who
  compares a selfie to a licence gives an opinion that a forger can deceive.

## Consequences

Manual review needs answers before launch:

- One named reviewer, with a backup.
- An SLA. People will not wait more than 24 hours.
- A queue that users can see, with their position.
- Named accounts only see documents, with an audit log.
- A fast, polite appeal that a person answers. Budget for incorrect
  rejections: "your face does not agree with your ID" feels like an
  accusation.

Also:

- Selfies and identity documents go to a different non-public bucket, with
  short retention and signed-URL access only (ADR 0005, or stronger).
- In v0, browse, chat and results need nothing. A message needs a phone
  number, at minimum. Listing and broker verification come back with PD3.
- **Verification and blurred cards are not in the 12 October launch. They ship
  in v1.** Onboarding with a KYC provider takes more than two weeks.

## Revisit when

- The verified pool is sufficiently large for the verified-only setting.
- Open, and belongs with PD8: we removed women-only (PD1). Is a gender
  preference from the interview (PD3c) sufficient for the trust story? We
  removed a safety story, but the safety problem stays.

## Sources

- [CONTEXT.md](../../CONTEXT.md), PD8 row and its Why callout
- [product-base.md](../product-base.md), section 13
- [verification.md](../verification.md)
- [launch-plan.md](../archive/2026-09-launch-plan.md), "What moves to after launch"
- [assistant-risks.md](../assistant-risks.md), section 4.1
