# Verification and the blurred card

**Date:** 2026-09-22 · **Status:** design accepted, one part must change
**Decision:** PD8

## The v0 scope decision

- **v0 is flatmate matching only.** It has no property listing objects.
- A person with a spare room is a person card, not a listing.

Results:

- The broker work (PD3 and PD4) moves out of v0. It stays blocked on the calls. No work waits on it.
- The post-a-listing wizard from the V3 prototype is out of v0.
- The SEO area pages continue to work.
- Cold start is easier.

Why: [PD0](decisions/pd-00-v0-scope.md)

## The design as proposed

1. Cards blur the photo of users who chose "only verified people can see my
   profile".
2. To see these users, **each** party must have verification.
3. Two routes to verification: DigiLocker (Aadhaar and a selfie), or a manual
   upload of a selfie and an Aadhaar photo or PDF that the team examines.

**Points 1 and 2 are good. The manual route in point 3 must change.**

## Why the mutual rule is the strongest part

- **Use the blur as the conversion prompt, not only as protection.**
- **Plan for cold start.** At launch, a verified user who selects the setting is invisible to almost all users.
- Guard 1: at launch, the verified-only setting is **off**. Offer it when the verified pool is sufficiently large to hide in.
- Guard 2: always show the **count** of hidden matches, also on blurred cards.

Why: [PD8](decisions/pd-08-verification.md)

## The blur must happen on the server

- At upload time, make a different blurred asset and serve its URL.
- Do not give the address of the initial image to a viewer without permission.

Why: [PD8](decisions/pd-08-verification.md), [ADR 0005](decisions/0005-managed-platform-split.md)

## The manual Aadhaar route: do not build it

**The law restricts the collection and storage of Aadhaar photocopies, and
UIDAI will ban them.**

- Unlicensed private entities are **not permitted to collect or keep copies of
  an Aadhaar card**. This is an offence in the Aadhaar Act 2016 (penalties in
  sections 29(2), 29(3), 29(4) and 37).
- UIDAI **approved a rule: a private entity must register with UIDAI before it
  verifies Aadhaar**. Then it must use approved methods, **not physical or
  digital copies**: offline QR check, API authentication, or the new Aadhaar
  app.
- If the law permits a copy, you must mask the first eight digits.
- The manual route puts the most sensitive identity data in India into the storage of a seven-person startup.

Why: [PD8](decisions/pd-08-verification.md)

### What to do instead

**Primary route: DigiLocker, through an established KYC provider.**

- After OTP authentication by the user, DigiLocker returns a signed Aadhaar XML.
- You at no time hold the document.

**Do not connect to DigiLocker directly.**

- A direct connection needs registration with MeitY as a document requester.
- Buy the API from a registered provider, such as Surepass, AuthBridge, Sandbox or IDfy.
- Four part-time engineers should not use a month on this.

**Fallback route: a government ID that is not Aadhaar**, for example a
passport, driving licence or voter ID. A person compares the selfie to the ID photo.

**What you store, in all cases:**

| Store | Do not store |
|---|---|
| Verified true or false | The document image |
| Method used | The full Aadhaar number |
| Timestamp | More of the Aadhaar XML than necessary |
| Name as returned | |
| Last 4 digits at most, and only if we store a value | |

- Delete the document after the check.
- For verification selfies, ADR 0005 requires a different non-public bucket, short retention, and signed-URL access only.
- Identity documents need the same rule or a stronger rule.

Why: [PD8](decisions/pd-08-verification.md)

## The operational load nobody has costed

| Question | Needs an answer before launch |
|---|---|
| Who reviews? | One named person, with a backup |
| How fast? | An SLA. People will not wait more than 24 hours. |
| What happens at backlog? | A queue that users can see. Users know their position in it. |
| Who can see submitted documents? | Named accounts only, with an audit log of all views |
| What about rejections? | A fast, polite appeal path |

- **Budget for incorrect rejections.** The appeal must be fast, and a person must answer it.
- DigiLocker is instant and needs no person.

Why: [PD8](decisions/pd-08-verification.md)

## Two badges or one

- **Show one badge.**
- **Record the route internally.** The manual route is the route to monitor for fraud.

Why: [PD8](decisions/pd-08-verification.md)

## What "verified" gates in v0

| Action | Requirement |
|---|---|
| Browse, chat with the assistant, see results | Nothing |
| See unblurred photos of verified-only users | Verified |
| Appear to verified-only users | Verified |
| Message someone | Phone, at minimum |
| Be discoverable at all | Phone |

Listing and broker verification are out of v0 and come back with PD3.

## Sources

- [UIDAI to ban Aadhaar photocopying and regulate private-sector verification](https://www.biometricupdate.com/202512/india-to-ban-aadhaar-photocopying-as-uidai-moves-to-regulate-private-sector-verification)
- [UIDAI caution on sharing Aadhaar photocopies](https://www.pib.gov.in/PressReleasePage.aspx?PRID=1828797&reg=48&lang=2)
- [Aadhaar and DPDPA compliance together](https://law.asia/aadhaar-dpdpa-compliance/)
- [Masked Aadhaar, first eight digits hidden](https://www.uidai.gov.in/en/283-faqs/aadhaar-online-services/e-aadhaar/1887-what-is-masked-aadhaar.html)
- [DigiLocker Aadhaar verification via a KYC provider](https://authbridge.com/checks/aadhaar-verification-via-digilocker/)
- [India Stack for startups: DigiLocker needs MeitY integration](https://www.incorpx.io/blog/india-stack-startups-upi-account-aggregator)
