# Verification and the blurred card

**Date:** 2026-09-22 · **Status:** design accepted, one part must change
**Decision:** PD8

---

## The v0 scope decision

**v0 is flatmate matching only.** No property listings as separate objects. A
person with a spare room is a person card, not a listing.

Consequences:

- The broker work, PD3 and PD4, moves out of v0. It stays blocked on the calls
  and nothing waits on it.
- The post-a-listing wizard from the V3 prototype is out of v0.
- The SEO area pages still work, because they run on people data.
- Cold start gets easier. One side of a marketplace, not two.

---

## The design as proposed

1. Cards show a blurred photo for users who chose "only verified people can see
   my profile".
2. To see them, **both** parties must be verified.
3. Two routes to verification:
   - DigiLocker, giving Aadhaar plus a selfie
   - Manual upload of a selfie and a photo or PDF of the Aadhaar, reviewed by
     the team

**Points 1 and 2 are good. Point 3's manual route has to change.**

---

## Why the mutual rule is the strongest part

It makes verification self-reinforcing. You cannot see verified-only people
unless you are verified yourself, so every blurred card is a reason to verify.

**Use the blur as the conversion prompt, not just as protection.** "3 of your 4
matches are verified only. Verify to see them." That converts far better than a
settings page nobody visits.

**The cold-start problem to plan for.** At launch almost nobody is verified, so
a verified user who opts in becomes invisible to nearly everyone. Two guards:

- Default the setting **off** at launch, and offer it once the verified pool is
  large enough to be worth hiding behind.
- Always show the **count** of hidden matches even when the cards are blurred.
  A blurred card the viewer cannot count is just an absence.

---

## The blur must happen on the server

**If the original image reaches the browser and CSS blurs it, there is no
protection.** Anyone can read it out of the network tab. This is the most
common way this feature is got wrong.

Generate a separate blurred asset at upload time. Serve that URL. The original
is never addressable to a viewer who is not allowed it.

This fits ADR 0005, which already says images go straight to R2 and are served
through short-lived signed URLs after an authorisation check. The blurred copy
is just another object with a different access rule.

---

## The manual Aadhaar route: do not build it

**Collecting and storing Aadhaar photocopies is restricted now and is being
banned.**

The facts:

- Unlicensed private entities are **not permitted to collect or keep copies of
  an Aadhaar card**. It is an offence under the Aadhaar Act 2016, with
  penalties under sections 29(2), 29(3), 29(4) and 37.
- UIDAI has **approved a rule requiring any private entity that wants to verify
  Aadhaar to register with UIDAI first**, and then to use approved methods:
  offline QR check, API authentication, or the forthcoming Aadhaar app,
  **instead of collecting physical or digital copies**.
- UIDAI is moving to **forbid private entities from collecting and storing
  Aadhaar photocopies** outright.
- Where a copy is permissible at all, the first eight digits must be masked.

"Upload a photo or PDF of your Aadhaar and we will check it by hand" is
precisely the practice being removed. It also concentrates the most sensitive
identity data in India inside a seven-person startup's storage, which is a
breach you do not want to be responsible for.

### What to do instead

**Primary route: DigiLocker, through an established KYC provider.**

DigiLocker returns a signed Aadhaar XML after the user authenticates with an
OTP. You get a verified assertion. You never hold the document.

**Do not integrate DigiLocker directly.** It needs registration with MeitY as a
document requester, and around 4,313 agencies hold that status. Providers such
as Surepass, AuthBridge, Sandbox and IDfy are already registered and sell the
API. Buy it. This is not where four part-time engineers should spend a month.

**Fallback route: any government ID that is not Aadhaar.**

Passport, driving licence, voter ID. None carries the Aadhaar Act restrictions.
A human compares the selfie to the photo on the ID, which is the same check you
wanted, without the legal problem.

**What you store, in every case:**

| Store | Do not store |
|---|---|
| Verified true or false | The document image |
| Method used | The full Aadhaar number |
| Timestamp | The Aadhaar XML beyond what is needed |
| Name as returned | |
| Last 4 digits, if anything | |

Delete the document once the check is done. ADR 0005 already requires
verification selfies to sit in a separate non-public bucket with short
retention and signed-URL access only. Identity documents need the same rule or
stronger.

---

## The operational load nobody has costed

Manual review is a job, not a feature.

| Question | Needs an answer before launch |
|---|---|
| Who reviews? | One named person, with a backup |
| How fast? | An SLA. 24 hours is the most people will wait. |
| What happens at backlog? | Queue visible, and users told where they are in it |
| Who can see submitted documents? | Named accounts only, with an audit log of every view |
| What about rejections? | A fast, gracious appeal path |

**Budget for false rejections.** A real person told their face does not match
their ID experiences it as an accusation. The appeal has to be quick and it has
to be answered by a human.

**Manual review does not scale.** At a hundred signups a day it is most of
someone's morning. The DigiLocker route is instant and unattended, which is the
real reason to make it primary rather than optional.

---

## Two badges or one

DigiLocker gives a cryptographically signed government assertion. A human
comparing a selfie to a driving licence gives a judgment call, and it is
forgeable.

**Show one badge.** Two tiers of verified are confusing and imply the lower one
is not really verified, which undermines the whole mechanism.

**Track the difference internally.** If fraud appears, you will want to know
which route it came through, and the manual route is the one to watch.

---

## What "verified" gates in v0

Given v0 is flatmate matching only:

| Action | Requirement |
|---|---|
| Browse, chat with the assistant, see results | Nothing |
| See unblurred photos of verified-only users | Verified |
| Appear to verified-only users | Verified |
| Message someone | Phone, at minimum |
| Be discoverable at all | Phone |

Listing and broker verification are out of v0 and come back with PD3.

---

## Sources

- [UIDAI to ban Aadhaar photocopying and regulate private-sector verification](https://www.biometricupdate.com/202512/india-to-ban-aadhaar-photocopying-as-uidai-moves-to-regulate-private-sector-verification)
- [UIDAI caution on sharing Aadhaar photocopies](https://www.pib.gov.in/PressReleasePage.aspx?PRID=1828797&reg=48&lang=2)
- [Aadhaar and DPDPA compliance together](https://law.asia/aadhaar-dpdpa-compliance/)
- [Masked Aadhaar, first eight digits hidden](https://www.uidai.gov.in/en/283-faqs/aadhaar-online-services/e-aadhaar/1887-what-is-masked-aadhaar.html)
- [DigiLocker Aadhaar verification via a KYC provider](https://authbridge.com/checks/aadhaar-verification-via-digilocker/)
- [India Stack for startups: DigiLocker needs MeitY integration](https://www.incorpx.io/blog/india-stack-startups-upi-account-aggregator)
