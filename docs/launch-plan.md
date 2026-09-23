# Launch plan: 7 October 2026

**Date:** 2026-09-23 · **Status:** proposed · **Decision:** D11

---

## The honest arithmetic

| | |
|---|---|
| Days to launch | 14 |
| Weekdays | 10, or 9 without Gandhi Jayanti on 2 October |
| People | 4 to 5, at 2 hours a day |
| **Available** | **72 to 140 person-hours** |

Nothing is scaffolded yet. There is no repo for the app, no schema beyond the
`users` sketch, and the design token pipeline in ADR 0011 is blocked.

**The v0 designed in this repo does not fit.** The full router, two forms, RAG
advisor, verification, SEO area pages and in-app messaging is roughly 250 to 350
person-hours. That is two to four times what exists.

So one of three things has to give: the date, the scope, or the meaning of
"launch". This plan keeps the date and cuts the scope.

---

## What ships on 7 October

The smallest thing that proves the idea: **a person talks to the assistant, sees
real flatmate matches, and can connect with one.**

| # | Item | Rough hours |
|---|---|---|
| 1 | Monorepo scaffold, deploy to Vercel, Fly and Supabase in Mumbai | 10 |
| 2 | Google sign-in through Firebase | 6 |
| 3 | Schema: users, profiles, anonymous form state, connection requests | 8 |
| 4 | Landing page, ported from the V3 prototype | 6 |
| 5 | Chat UI with the scripted chip flow for intent, area, budget | 14 |
| 6 | One extraction call and one reply call, DeepSeek with Gemini fallback | 14 |
| 7 | Split view: results panel re-queried when the form changes | 12 |
| 8 | Profile create and edit, photo upload straight to R2 | 10 |
| 9 | Person detail, connect request, contact revealed on mutual accept | 8 |
| 10 | Five-turn cap, rate limits, daily spend ceiling | 5 |
| 11 | Fifty-utterance eval set in English, Hinglish, Marathi, run by hand | 4 |
| 12 | Error tracking and basic logging | 3 |
| 13 | QA and bug buffer | 15 |
| | **Total** | **about 115** |

That sits inside the range only if the team works most days and nothing
surprises anyone. There is no slack. Treat every estimate as optimistic.

---

## What moves to after launch

| Cut | Why it can wait | Comes back |
|---|---|---|
| **In-app messaging** | Replaced by a mutual-accept contact reveal. Realtime chat is the single biggest build item. Mumbai already lives on WhatsApp. | v1 |
| Router as a separate model | Chips are routed by the client. Free text goes to one extraction call. Off-topic is a line in the reply prompt. | v1 |
| Form B, the profile observer | Filtering needs Form A only. Log every free-text turn now so Form B can be backfilled. | v1 |
| Advisor and RAG | The corpus is not written yet anyway. Adjacent questions get a hedged general answer. Consequential ones hand off. | v1, once 10 articles exist |
| DigiLocker verification | KYC provider onboarding takes longer than two weeks. | v1 |
| Blurred verified-only cards | Depends on verification. | v1 |
| SEO area pages | Need data that does not exist yet. Blog goes live instead. | v1 |
| Live-update rules beyond the basics | Re-query on form change. Skip the banners and direction rules. | v1 |
| Mobile bottom sheet | Responsive layout only. | v1 |
| Separate analytics database | Log key events to one table in the main database. | v1 |

**Nothing on this list is abandoned.** Every cut has a slot in v1 and the design
docs stay as written.

---

## Three conflicts with the architecture decisions

`AGENTS.md` says do not re-argue ADRs, flag the conflict. These are flagged, with
a proposed time-boxed exception for each.

1. **ADR 0011, the design token pipeline, is blocked** and the prototype's
   palette is not Untitled UI. Proposal: port the prototype styling directly for
   launch and rebuild on the token pipeline in v1. Needs the designer's sign-off.
2. **ADR 0012, the separate analytics instance.** Proposal: one events table in
   the main database for launch, migrate when volume justifies a second project.
3. **ADR 0014, self-hosted GlitchTip.** Proposal: Sentry's free tier for two
   weeks, behind the same `reportError` wrapper, so moving later is a DSN change.

Each needs a one-line amendment in `docs/decisions/` once the app repo exists.

---

## What marketing does in these two weeks

**Cold start is the real launch risk, not the code.** A matching product with no
people in it shows an empty panel on day one.

1. **Seed profiles before launch.** Target 150 to 200 real people in two or three
   neighbourhoods, not all of Mumbai. Density in Powai beats thin coverage
   everywhere.
2. **Publish the first ten corpus articles** at `roomsie.com/blog`.
3. **Make the broker calls.** They inform v1, not v0, but the answers take time.

---

## Decided: the fallback is time, not scope

**Target 7 October. Fallback 9 October.** If the team falls behind, the date
slips by two days and the scope stays whole. Decided 2026-09-23.

The two extra weekdays, 8 and 9 October, add roughly 16 to 20 person-hours.

**Go or no-go on Monday 5 October.** Decide that evening, not on the 7th. By
then the remaining work is visible, and announcing a date you then miss costs
more than announcing the later one at the start.

**9 October is the last slip.** If the team is not ready by then, cut scope in
this order rather than move the date again: template the replies, then drop
photos for a week.

## Decided: public launch

**7 October is a public launch, not a closed beta.** Decided 2026-09-23.

A public launch needs things a closed beta could skip. None are optional.

| # | Item | Rough hours | Why it cannot wait |
|---|---|---|---|
| 14 | Report and block on every person, with manual suspend | 4 | Contact details are revealed to strangers. There must be a way out. |
| 15 | Account deletion | 3 | Required under the DPDP Act. |
| 16 | Launch areas plus a waitlist for everywhere else | 4 | A public visitor from Thane seeing an empty panel leaves for good. |
| 17 | Uptime monitor and spend alerts | 2 | One Fly machine and an open chat. You need to know first. |
| 18 | Privacy policy, terms, grievance contact pages | 2 | Legal minimum for a public service handling personal data. |
| | **Added** | **about 15** | |

**New total: about 130 person-hours, against 72 to 140 available.**

That fits only if 5 people work most days, weekends included, and nothing goes
wrong. There is no margin.

### Launch areas, stated publicly

Do not launch "in Mumbai". Launch "in Powai, Andheri and Bandra", or whichever
three have the most seeded profiles.

A visitor from a covered area sees a full panel. A visitor from anywhere else
joins a waitlist for their area. That turns an empty result into a demand signal
and tells marketing where to seed next.

### Work that is not engineering hours

- **Privacy policy and terms.** Drafted by the founders, reviewed by a lawyer if
  at all possible. The DPDP Act requires a clear notice of what is collected and
  why, and a named grievance contact.
- **Moderation.** Someone checks reported profiles every day from launch. Name
  that person now.
- **Seeding.** 150 to 200 real profiles in the launch areas before 7 October.

## Assumptions

- **v0 is free.** There is no monetisation in two weeks and nothing to charge for.
  D4 moves to v1.
