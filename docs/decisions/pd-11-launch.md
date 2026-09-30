# PD11 — Public launch on 12 October

**Status:** Settled. The date moved on 2026-09-26. · **Date:** 2026-09-26 · **Deciders:** Yash

## Context

- On 23 September, about 72 to 140 person-hours were available, against 250 to 350 for the full v0.
- We had to change the date, the scope, or the meaning of "launch". The first plan cut the scope: the router, the observer, the advisor and the isolated analytics database.

## Decision

**In one line:** The public launch is on Monday 12 October, with Wednesday 14 October as the fallback, and the go/no-go list is the quality bar.

- **Target: Monday 12 October. Fallback: Wednesday 14 October. Quality comes before the date.**
- **The go/no-go list is the quality bar.** If a check fails, the date moves by a small quantity. We do not ship something below the bar.
- **Go or no-go: Saturday 10 October, 8 pm.** Sunday 11 October is a bug-fix day.
- **It is a public launch, not a closed beta.** This adds about 15 hours: report and block, account deletion, a waitlist, alerts and legal pages.
- **v0 is free.** PD4 moves to v1.
- Launch in named areas, for example "Powai, Andheri and Bandra".

| Ships 12 Oct | After launch |
|---|---|
| Chat with chips, the router, extraction, the observer, the reply writer | In-app chat |
| The advisor: articles first, web search after sign-in | Verification, blurred cards |
| Results panel, profiles with photos | SEO area pages |
| Contact shown when the two people accept | Live-update banners and undo, mobile bottom sheet |
| Report, block, deletion, waitlist, legal pages | — |
| Results queried again when the form changes, responsive mobile | — |
| Analytics in its own database, nightly backups (PD13) | — |

Engineering go/no-go checks (from `team-plan.md`):

1. In production, on a phone and a laptop, a person goes from chat to connect and sees a number.
2. Report, block and account deletion work.
3. The abuse test trips the limits. The spend ceiling falls back to chips.
4. No open P1 bug.
5. The legal pages are live. There is a named moderator.
6. A record of eval results exists. No-go if extraction gets fewer than 7 in 10 slots correct, or fills slots on vague sentences and does not mark them unclear.
7. The router flags off-topic messages with no model call. The observer rejects each observation with no user quote. The advisor never answers law, tax or safety from the web.
8. Last night's backup exists. A restore worked one or more times.

Seeding (checked Sunday 11 October): a minimum of 150 profiles, with a minimum of 40 in each launch area. If one area fails, launch in the other two. Do not move the date.

## Rationale

- **The move gets back the router, the observer and the advisor for launch.** It also gets back analytics in its own database, and nightly backups.
- On the go/no-go evening, the remaining work is clear. A date that you announce and then miss costs more than a second date announced at the start.
- A public launch needs items that a closed beta can omit. Strangers see contact details, so there must be a way out. The DPDP Act requires account deletion, a clear data notice and a named grievance contact. There is one Fly machine and an open chat, so you must know first.
- A visitor who sees an empty panel leaves. The waitlist makes an empty result into a demand signal, and tells marketing where to seed next.
- **Cold start is the real risk, not code.** A matching product with no people shows an empty panel on day one. Many people in Powai is better than a small number in all areas.
- v0 is free because there is nothing to charge for.
- In-app chat stays cut: realtime chat is the largest build item, and people in Mumbai use WhatsApp. DigiLocker onboarding takes more than two weeks. Blurred cards need verification. SEO area pages need data that does not exist. We do not abandon a cut item. Each has a slot in v1.

## Consequences

- Capacity: 170 person-hours (5 × 2h × 17 days), 151 build hours, 19 spare, none before the designs arrive (PD12).
- If the team is late, the launch moves to 14 October. The scope stays the same.
- If a checkpoint is more than a day late, decide on that checkpoint call if 14 October becomes the plan.
- **Still open (deferred): the master launch document.** All its inputs are settled.
- Marketing seeds profiles, publishes the first ten corpus articles, and makes the broker calls. They make the broker calls at this time, because the answers take time.

Superseded: target 7 October, fallback 9 October, go/no-go Monday 5 October (decided 2026-09-23). Superseded: the cut v0 of about 130 hours, scheduled as 115 build hours against 120 available, with a bug-fix day on 6 October. That plan had no margin.

The 23 September plan gave a reason for each cut:

- Router: the client routes chips. Free text goes to one extraction call. One line in the reply prompt handles off-topic text.
- Form B: filters need only Form A.
- Advisor and RAG: we had not written the corpus.

`launch-plan.md` keeps the initial reasoning as the record of the reason for each cut.

## Sources

- [CONTEXT.md](../../CONTEXT.md)
- [product-base.md §16](../product-base.md)
- [launch-plan.md](../launch-plan.md)
- [team-plan.md](../team-plan.md)
- [how-to-work.md](../how-to-work.md)
- [extensibility.md](../extensibility.md)
