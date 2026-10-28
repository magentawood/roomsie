# PD11 — Public launch on 8 November

**Status:** Settled. The date moved on 2026-09-26. Changed on 2026-10-27. The date moved to 8 November on 2026-10-28 (T-33). · **Date:** 2026-09-26 · **Deciders:** Yash

## Context

- On 23 September, about 72 to 140 person-hours were available, against 250 to 350 for the full v0.
- We had to change the date, the scope, or the meaning of "launch". The first plan cut the scope: the router, the observer, the advisor and the isolated analytics database.

## Decision

**In one line:** The public launch is on Sunday 8 November 2026 (IST), and the go/no-go list is the quality bar.

- **Target: Sunday 8 November 2026, IST. Quality comes before the date.** Until then, the invite gate of T-33 lets in only the invited emails and the moderators. It opens by itself at the opening time that a moderator sets.
- **The go/no-go list is the quality bar.** If a check fails, the date moves by a small quantity. We do not ship something below the bar.
- **The fallback date, the go/no-go day and the bug-fix day move with the launch.** F-10 sets them.
- **It is a public launch, not a closed beta.** This adds about 15 hours: report and block, account deletion, a waitlist, alerts and legal pages.
- **v0 is free.** PD4 moves to v1.

| Ships at the launch | After launch |
|---|---|
| Chat with chips, the router, extraction, the observer, the reply writer | Blurred cards |
| The advisor: articles first, web search after sign-in | SEO area pages |
| Results panel, profiles with photos, listings | Live-update banners and undo |
| Message requests and in-app messages ([PD17](pd-17-connect-and-contact.md)), ID verification ([PD8](pd-08-verification.md)) | Mobile bottom sheet, DigiLocker |
| Report, block, deletion, waitlist, legal pages | — |
| Results queried again when the form changes, responsive mobile | — |
| Analytics in its own database, nightly backups (PD13) | — |

Engineering go/no-go checks (from `team-plan.md`):

1. In production, on a phone and a laptop, a person goes from the chat to a message request and an accepted chat (PD17).
2. Report, block and account deletion work.
3. The abuse test trips the limits. The spend ceiling falls back to chips.
4. No open P1 bug.
5. The legal pages are live. There is a named moderator.
6. A record of eval results exists. No-go if extraction gets fewer than 7 in 10 slots correct, or fills slots on vague sentences and does not mark them unclear.
7. The router flags off-topic messages with no model call. The observer rejects each observation with no user quote. The advisor never answers law, tax or safety from the web.
8. Last night's backup exists. A restore worked one or more times.

Seeding (checked on the bug-fix day): a minimum of 150 profiles across Mumbai. Marketing seeds the F-06 areas first. Do not move the date.

Superseded (2026-10-27): a minimum of 40 profiles in each of three launch areas, and a launch in the other two if one fails. Each Mumbai area is live (PD2).

- The seeding form collects the full profile of PD16.
- Marketing also seeds listings from owners, PG operators and brokers. The founders set the number of listings.

## Rationale

- **The move gets back the router, the observer and the advisor for launch.** It also gets back analytics in its own database, and nightly backups.
- On the go/no-go evening, the remaining work is clear. A date that you announce and then miss costs more than a second date announced at the start.
- A public launch needs items that a closed beta can omit. Strangers see contact details, so there must be a way out. The DPDP Act requires account deletion, a clear data notice and a named grievance contact. There is one API machine and an open chat, so you must know first.
- A visitor who sees an empty panel leaves. For a place outside Mumbai, the waitlist makes an empty result into a demand signal, and tells marketing where to open next.
- **Cold start is the real risk, not code.** A matching product with no people shows an empty panel on day one. Thus, marketing seeds a few area groups first (F-06).
- v0 is free because there is nothing to charge for.
- SEO area pages need data that does not exist. We do not abandon a cut item. Each has a slot in v1.
- A card with an unanswered dealbreaker ranks below the full matches ([PD3a](pd-03a-flatmate-matching.md)). Thus, a thin seeded profile sinks in the results.

## Consequences

- Capacity: 170 person-hours (5 × 2h × 17 days), 151 build hours, 19 spare, none before the designs arrive (PD12).
- If the team is late, the launch moves to the fallback date. The scope stays the same.
- If a checkpoint is more than a day late, decide on that checkpoint call if the fallback date becomes the plan.
- **Still open (deferred): the master launch document.** All its inputs are settled.
- Marketing seeds profiles, publishes the first ten corpus articles, and makes the broker calls. They make the broker calls at this time, because the answers take time.

Superseded (2026-10-24): in-app chat and DigiLocker verification were cut. [PD14](pd-14-v0-is-the-figma-designs.md) brings them into v0, and [PD8](pd-08-verification.md) moves DigiLocker to v1. **Open:** blurred cards were cut because they need verification. The founders decide if they ship at launch.

Superseded (2026-10-28): target 12 October, fallback 14 October, go/no-go 10 October, bug-fix day 11 October. Superseded: target 7 October, fallback 9 October, go/no-go Monday 5 October (decided 2026-09-23). Superseded: the cut v0 of about 130 hours, scheduled as 115 build hours against 120 available, with a bug-fix day on 6 October. That plan had no margin.

The 23 September plan gave a reason for each cut:

- Router: the client routes chips. Free text goes to one extraction call. One line in the reply prompt handles off-topic text.
- Form B: filters need only Form A.
- Advisor and RAG: we had not written the corpus.

The archived launch plan keeps the initial reasoning as the record of the reason for each cut.

## Sources

- [CONTEXT.md](../../CONTEXT.md)
- [product-base.md §16](../product-base.md)
- [launch-plan.md](../archive/2026-09-launch-plan.md)
- [team-plan.md](../team-plan.md)
- [how-to-work.md](../how-to-work.md)
- [extensibility.md](../extensibility.md)
