# PD8 — Verification: an ID check in v0, DigiLocker in v1, never Aadhaar copies

**Status:** Settled with one change. Changed on 2026-10-26. · **Date:** 2026-09-22 · **Deciders:** Yash; the v0 route and the listing gate: n3rxv, for the founders

## Context

The proposed design: blurred cards for verified-only users, verification for
**each** party, and two routes. The routes were DigiLocker, or a manual upload
of a selfie and an Aadhaar photo or PDF. The manual route must change.

## Decision

**In one line:** In v0, a person compares a selfie with a non-Aadhaar government ID; DigiLocker comes in v1; we store the result, never the document.

- **Verified-only and mutual.** Users who opt into verified-only show as
  blurred cards. Only verified users see them.
- **The blur is server-side.** At upload, make a different blurred asset and
  serve its URL. Never give the address of the initial image to a viewer
  without permission.
- **We drop the manual Aadhaar upload route.** We never accept an Aadhaar copy.
- **v0 route: a non-Aadhaar government ID** (passport, driving licence, voter
  ID or PAN card) and a selfie. A named reviewer compares the selfie to the ID
  photo.
- **A listing goes live at once.** The Verified pill shows after the reviewer
  approves. The review does not hold the listing.
- **v1 route: DigiLocker**, through a registered KYC provider (such as
  Surepass, AuthBridge, Sandbox or IDfy) or as a direct requester, **and
  Aadhaar through the signed QR of the Aadhaar app**, after roomsie registers
  with UIDAI as an offline verification entity (OVSE). We keep no copy. The v0
  route stays as the fallback.
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
- **Gender (F-13, PC-30).** A profile has a required gender: Male, Female or
  Non-binary. The filters are in PD3a.
- **The trust story replaces women-only.** No contact before an accept, no phone
  numbers (PD17), report and block, a 4-hour safety response (PD18), and the
  DigiLocker badge.

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
- **No vendor in v0.** A KYC provider costs a few rupees for each check, and
  a provider must be picked. A direct requester pays no platform charge (the
  June 2025 terms), but needs an approval with no published time and a
  yearly audit by a CERT-In empanelled auditor. The invite-only launch (T-33)
  keeps the review queue small.
- **The listing does not wait.** A new lister who waits a day for a review can
  leave. The pill, not the listing, waits for the review.
- **The v0 route avoids the legal problem.** The Aadhaar Act restrictions do
  not apply to these IDs.
- **The PAN card is on the list.** Many students and first-job movers have no
  passport or driving licence, but a bank account needs a PAN.
- **DigiLocker in v1.** It is instant and needs no person. Manual review is a
  job, not a feature. At a hundred signups a day, it takes most of the morning
  of one person.
- **One badge.** Two levels cause confusion and make the lower level look
  not truly verified. But monitor the manual route for fraud: a person who
  compares a selfie to a licence gives an opinion that a forger can deceive.
- **Gender.** The designs ask for it, and a woman can keep her search
  women-only. The trust story does not depend on one feature.

## Alternatives rejected

- **DigiLocker through a KYC provider in v0.** A cost for each check, and a
  provider to pick before launch.
- **A direct DigiLocker connection in v0.** The approval has no published time,
  and the yearly audit is a cost.
- **The listing waits for the review.** A new lister can wait up to 24 hours.
- **Only brokers and PGs wait.** Anyone can pick "owner" to skip the wait.
- **An Aadhaar upload in v0.** The Aadhaar Act forbids copies.
- **The Aadhaar app QR in v0.** The UIDAI approval takes weeks, and it needs a
  registered company.
- **An optional gender, with "Prefer not to say".** A "Women only" search fills
  with unknowns.
- **A women-only mode.** PD1 removed women-only.

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
  signed-URL access only (ADR 0005, or stronger). The selfie goes right after
  the check (PD19).
- In v0, browse, chat and results need nothing. A message needs sign-in.
- Listing and broker verification are in v0, by the manual route. DigiLocker
  and blurred cards wait (PD11).
- A live listing can have no Verified pill. The cards and the detail show the
  pill only after the review.

## Revisit when

- v1 starts: DigiLocker through a provider, or as a direct requester, and the
  OVSE registration for the Aadhaar app QR. Both need a registered company.
- The verified pool is sufficiently large for the verified-only setting.
- Reports show that the trust story does not keep women safe enough.

## Sources

- [CONTEXT.md](../../CONTEXT.md), PD8 row and its Why callout
- [product-base.md](../product-base.md), section 13
- [verification.md](../verification.md)
- [launch-plan.md](../archive/2026-09-launch-plan.md), "What moves to after launch"
- [assistant-risks.md](../assistant-risks.md), section 4.1
- [DigiLocker terms of use for requesters, June 2025](https://cf-media.api-setu.in/resources/DigiLocker-Terms-of-User-Requester-june-2025.pdf)
