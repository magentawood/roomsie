# Launch plan: 12 October 2026

**Date:** 2026-09-23 · **Updated:** 2026-09-26 · **Status:** proposed · **Decision:** PD11

**Update, 26 September:**

- The launch moved from 7 October to **Monday 12 October**. The fallback is **Wednesday 14 October**.
- These cut items are in the launch again:
  - the router
  - Form B and the observer
  - the advisor: articles first, then web search for signed-in users only
  - a separate analytics database.
- We added nightly backups (PD13).
- **Quality comes before the date:** if a go/no-go check fails, the date moves a small quantity. We do not ship something below that quality.
- The text below is the initial reasoning, dated 23 September.
- The schedule is at this time in `docs/team-plan.json`, `docs/team-plan.md` and `docs/how-to-work.md`.

> [!note]- Why
> - The two databases are on free Supabase accounts. Thus, we added nightly backups.
> - The initial reasoning stays as the record of the reason for each cut.

---

## The honest arithmetic

| | |
|---|---|
| Days to launch | 14 |
| Weekdays | 10, or 9 without Gandhi Jayanti on 2 October |
| People | 4 to 5, at 2 hours a day |
| **Available** | **72 to 140 person-hours** |

- Nothing has a scaffold at this time. There is no repo for the app.
- There is no schema other than the `users` sketch.
- The design token pipeline in ADR 0011 is blocked.
- **The v0 that this repo designs does not fit.** The full router, two forms, RAG advisor, verification, SEO area pages and in-app messaging need approximately 250 to 350 person-hours.
- That is two to four times the available hours.
- This plan keeps the date and cuts the scope.

> [!note]- Why
> We must change one of three things: the date, the scope, or the meaning of "launch".

---

## What ships on 7 October

We ship the smallest product that proves the idea: **a person talks to the
assistant, sees real flatmate matches, and can connect with one.**

| #   | Item                                                                  | Rough hours   |
| --- | --------------------------------------------------------------------- | ------------- |
| 1   | Monorepo scaffold, deploy to Vercel, Fly and Supabase in Mumbai       | 10            |
| 2   | Google sign-in through Firebase                                       | 6             |
| 3   | Schema: users, profiles, anonymous form state, connection requests    | 8             |
| 4   | Landing page, ported from the V3 prototype                            | 6             |
| 5   | Chat UI with the scripted chip flow for intent, area, budget          | 14            |
| 6   | One extraction call and one reply call, DeepSeek with Gemini fallback | 14            |
| 7   | Split view: the results panel queries again when the form changes     | 12            |
| 8   | Profile create and edit, photo upload directly to R2                  | 10            |
| 9   | Person detail, connect request, contact shown only on mutual accept        | 8             |
| 10  | Five-turn cap, rate limits, daily spend ceiling                       | 5             |
| 11  | Fifty-utterance eval set in English, Hinglish, Marathi, run by hand   | 4             |
| 12  | Error tracking and basic logging                                      | 3             |
| 13  | QA and bug buffer                                                     | 15            |
|     | **Total**                                                             | **about 115** |
|     |                                                                       |               |

- That total is in the range only if the team works on most days and no surprise occurs.
- There is no slack.
- Think that all estimates are optimistic.

---

## What moves to after launch

| Cut | At launch | Comes back |
|---|---|---|
| **In-app messaging** | A mutual-accept contact reveal replaces it. | v1 |
| Router as a separate model | — | **Back in for launch, 26 Sep** |
| Form B, the profile observer | Log all free-text turns at this time, so that we can backfill Form B. | **Back in for launch, 26 Sep** |
| Advisor and RAG | — | **Back in for launch, 26 Sep** |
| DigiLocker verification | — | v1 |
| Blurred verified-only cards | — | v1 |
| SEO area pages | The blog goes live as an alternative. | v1 |
| Live-update rules beyond the basics | Query again when the form changes. Do not make the banners and direction rules. | v1 |
| Mobile bottom sheet | Use only a responsive layout. | v1 |
| Separate analytics database | Log key events to one table in the primary database. | **Back in for launch, 26 Sep** |

- Each cut has a slot in v1.
- The design documents stay as they are.

> [!note]- Why
> - **We do not abandon an item on this list.**
> - In-app messaging: realtime chat is the largest build item. People in Mumbai use WhatsApp at this time.
> - DigiLocker verification: onboarding with a KYC provider takes more than two weeks.
> - Blurred verified-only cards: these need verification.
> - SEO area pages: these need data that does not exist at this time.

> [!note]- History
> - Router: the client routes chips. Free text goes to one extraction call. One line in the reply prompt handles off-topic text.
> - Form B: filters need only Form A.
> - Advisor and RAG: we have not written the corpus. Adjacent questions get a hedged general answer. Consequential questions go to a hand-off.
> - The advisor came back with web search after sign-in.

---

## Three conflicts with the architecture decisions

`AGENTS.md` says: do not argue ADRs again, but flag the conflict. We flag these
conflicts here. For each conflict, we propose an exception with a time limit.

| ADR | Conflict | Proposal |
|---|---|---|
| ADR 0011 | The design token pipeline is blocked. | Copy the prototype styles directly for launch. Then build again on the token pipeline in v1. The designer must approve this. |
| ADR 0012 | The separate analytics instance | Use one events table in the primary database for launch. Migrate when the volume justifies a second project. |
| ADR 0014 | Self-hosted GlitchTip | Use the free tier of Sentry for two weeks, behind the same `reportError` wrapper. |

When the app repo exists, each conflict needs a one-line amendment in
`docs/decisions/`.

> [!note]- Why
> - The palette of the prototype is not Untitled UI.
> - With the `reportError` wrapper, a move to a different tool in the future is only a DSN change.

---

## What marketing does in these two weeks

**The real launch risk is cold start, not the code.**

1. **Seed profiles before launch.** Get 150 to 200 real people in two or three neighbourhoods, not all of Mumbai.
2. **Publish the first ten corpus articles** at `roomsie.com/blog`.
3. **Make the broker calls.** They give information for v1, not v0.

> [!note]- Why
> - A matching product with no people in it shows an empty panel on day one.
> - Many people in Powai is better than a small number of people in all areas.
> - Make the broker calls at this time, because the answers take time.

---

## Decided: the fallback is time, not scope

- **Target 7 October. Fallback 9 October.** Decided 2026-09-23.
- If the team is late, the date moves by two days and the scope stays complete.
- The two added weekdays, 8 and 9 October, add approximately 16 to 20 person-hours.
- **Go or no-go on Monday 5 October.** Decide that evening, not on the 7th.
- **9 October is the last slip.** If the team cannot launch on that date, do not move the date again.
- Then cut scope in this sequence: use templates for the replies, then remove photos for a week.

> [!note]- Why
> - On 5 October, the remaining work is clear.
> - A date that you announce and then miss has a high cost. It costs more than the second date announced at the start.

## Decided: public launch

**7 October is a public launch, not a closed beta.** Decided 2026-09-23.
All of these items are necessary:

| # | Item | Rough hours | Why it cannot wait |
|---|---|---|---|
| 14 | Report and block on all persons, with manual suspend | 4 | — |
| 15 | Account deletion | 3 | The DPDP Act requires it. |
| 16 | Launch areas plus a waitlist for all other areas | 4 | — |
| 17 | Uptime monitor and spend alerts | 2 | — |
| 18 | Privacy policy, terms, grievance contact pages | 2 | These are the legal minimum for a public service that holds personal data. |
| | **Added** | **about 15** | |

**New total: about 130 person-hours, against 72 to 140 available.**
That fits only if 5 people work on most days, weekends included, and no problem
occurs.

> [!note]- Why
> - A public launch needs items that a closed beta can omit.
> - Item 14: strangers see the contact details. There must be a way out.
> - Item 16: a public visitor from Thane who sees an empty panel leaves and does not come back.
> - Item 17: there is one Fly machine and an open chat. You must know first.
> - There is no margin.

### Launch areas, stated publicly

- Do not launch "in Mumbai".
- Launch "in Powai, Andheri and Bandra", or in the three areas that have the most seeded profiles.
- A visitor from a covered area sees a full panel.
- A visitor from a different area joins a waitlist for that area.

> [!note]- Why
> - The waitlist makes an empty result into a demand signal.
> - It also tells marketing where to seed next.

### Work that is not engineering hours

- **Privacy policy and terms.** The founders write the draft. If at all possible, a lawyer does a check of the draft.
- The DPDP Act requires a clear notice of the data that we collect and why. It also requires a named grievance contact.
- **Moderation.** From launch, one person examines reported profiles each day. Name that person at this time.
- **Seeding.** Get 150 to 200 real profiles in the launch areas before 7 October.

## Assumptions

- **v0 is free.** There is no monetisation in two weeks. PD4 moves to v1.

> [!note]- Why
> There is nothing to charge for.
