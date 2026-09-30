# What roomsie does, and *why*

*Product record · v0.1*

Every product decision from the planning session, from audience to launch plan. Each one records what we chose and what it costs, so nothing has to be re-argued from memory.

Sept 2026 · Mumbai · v0 flatmates only · Launch 12 Oct · 5 devs × 2h/day

### The ledger

roomsie is the AI-native pivot of femmeflats. An assistant interviews you, then shows people who fit. The technical base in `tech-base.html` carries over unchanged. This page records the product on top of it.

### Product

| # | Decision | Summary | Status |
|---|---|---|---|
| 01 | [Open to all genders](#01--open-to-all-genders-pd1) | The women-only wedge is dropped | Settled |
| 02 | [Mumbai first](#02--mumbai-first-pd2) | Three neighbourhoods, same region as the stack | Settled |
| 03 | [v0 is flatmate matching only](#03--v0-is-flatmate-matching-only-pd0) | No property listings yet | Settled |
| 04 | [The interview earns its place](#04--the-interview-earns-its-place-pd3b) | It surfaces what chips can't, and pushes back | Settled |
| 05 | [Record stated preferences](#05--record-stated-preferences-pd3c) | Never infer, never suggest | Settled |

### Experience

| # | Decision | Summary | Status |
|---|---|---|---|
| 06 | [Interview first, then split view](#06--interview-first-then-split-view-pd6--pd6a) | Chat and results side by side | Settled |
| 07 | [The panel follows the form](#07--the-panel-follows-the-form-pd6c) | Not the chat turn | Settled |
| 08 | [Login gates details and contact only](#08--login-gates-details-and-contact-only-pd6b) | Everything else is public and indexable | Settled |

### Assistant

| # | Decision | Summary | Status |
|---|---|---|---|
| 09 | [A router, not an agent swarm](#09--a-router-not-an-agent-swarm-pd7a) | All four handlers ship at launch | Settled |
| 10 | [DeepSeek, with Gemini behind it](#10--deepseek-with-gemini-behind-it-pd7) | Chosen on Hinglish, not price | Settled |
| 11 | [Five scope bands](#11--five-scope-bands-pd10) | Always answer something | Settled |
| 12 | [Five turns before sign-in](#12--five-turns-before-sign-in-pd9) | Plus rate limits and a spend ceiling | Settled |

### Trust & business

| # | Decision | Summary | Status |
|---|---|---|---|
| 13 | [DigiLocker, not Aadhaar copies](#13--digilocker-not-aadhaar-copies-pd8) | The blur is the prompt to verify | Settled |
| 14 | [Brokers pay for introductions](#14--brokers-pay-for-introductions-pd3--pd4) | Waiting on broker calls | Testing |
| 15 | [A small, self-funded team](#15--a-small-self-funded-team-pd5) | About ₹1–2 per interview | Settled |

### Launch

| # | Decision | Summary | Status |
|---|---|---|---|
| 16 | [Public launch, 12 October](#16--public-launch-12-october-pd11) | Fallback 14 October | Settled |
| 17 | [Five lanes, two phases](#17--five-lanes-two-phases-pd12) | Design-free work first, screens once designs land | Settled |

---

## 01 · Open to all genders (PD1)

**Decision:** roomsie is for everyone. The women-only promise from femmeflats is dropped.

A market twice the size, an easier cold start, and gender verification is no longer a launch blocker.

> [!warning] What it costs
>
> The safety story went with it. The safety problem did not. Gender preferences now arrive through the interview, and the trust story has to be rebuilt. Every women-only line in the V3 prototype comes out.

---

## 02 · Mumbai first (PD2)

**Decision:** Launch in Mumbai, in the three neighbourhoods with the most seeded profiles. Not the whole city.

Same region as the stack: `ap-south-1`, `bom`, `bom1`. Highest rents and the sharpest flatshare need.

**Density beats coverage.** A visitor from a launch area sees a full panel. Anyone else joins a waitlist for their area, which tells marketing where to seed next.

---

## 03 · v0 is flatmate matching only (PD0)

**Decision:** No property listings in v0. Someone with a spare room is a person card.

| In v0 | After v0 |
|---|---|
| Flatmate matching, including people with a room to share | Property listings, brokers, payments |

This moves supply, brokers and money out of v0. Cold start becomes a one-sided problem.

---

## 04 · The interview earns its place (PD3b)

**Decision:** The assistant does two things chips can't. It surfaces what people never tick a box for, and it pushes back.

“My ex basically lived there.” “Six dealbreakers are hiding 90% of Powai.”

> [!danger] The form is the source of truth, not the model
>
> A structured form runs alongside the whole chat. Every slot records whether the user stated it or the model inferred it. An inferred value never fills a slot silently, and a contradiction is confirmed with the user, never overwritten.
>
> Confidence is the empty slot, not a number the model reports about itself.

---

## 05 · Record stated preferences (PD3c)

**Decision:** If a user states a preference, including community or religion, roomsie records it and filters on it.

India has no general law against discrimination in private housing, and the DPDP Act has no sensitive-data class. The exposure is press, not court.

| Guardrail kept | Why |
|---|---|
| Never infer | Not from a name, diet, area or festival. Serving a preference is not manufacturing one. |
| Never suggest | Recorded when raised. Never offered as a chip or a question. |
| Out of any learned ranking | A stated filter is the user's choice. A learned weight is the system's. |
| Filter server-side | Nobody is told they were excluded. |

> [!warning] Still open
>
> Whether a published listing may carry identity restrictions in its visible text. An advert is a different position from a private filter.

---

## 06 · Interview first, then split view (PD6 · PD6a)

**Decision:** The landing page leads into a full-screen chat with no skip. After two or three answers, it splits into chat and results.

1. **Step 1** Landing
   Hero and story. “Start looking” opens the chat.
1. **Step 2** Full-screen chat
   Chips for intent, area and budget. Typing works too.
1. **Step 3** Split view
   Chat beside live results, with a few manual filters.

> [!note] Mobile is provisional
>
> The chat fills the screen, then shrinks to a bar at about 25% when results appear, and expands to about 60% on tap. It never resizes while the user is typing.

---

## 07 · The panel follows the form (PD6c)

**Decision:** Results update when a form value or weight changes, not on every chat turn.

First results come after intent, area and budget. The match score stays hidden until lifestyle answers exist.

> [!note] For 12 October, only the basics
>
> At launch the panel re-queries when the form changes. The banners, undo and scroll rules below come in v1.

| Change | What the panel does |
|---|---|
| More results | A banner: “12 more matches. Show them.” |
| Fewer results | Applies, says what went, offers undo |
| New order | Only on refresh. Never while scrolling. |
| A saved card fails | Never removed. Marked with the reason. |

### One form, two views

| Conflict | Rule |
|---|---|
| Chat against earlier chat | Ask which to keep |
| Manual filter against chat | The filter wins. The assistant notes it once. |
| Inference against anything | Never wins. Proposed instead. |

---

## 08 · Login gates details and contact only (PD6b)

**Decision:** Chat, results and browsing are public. Login is needed only to open someone's details or contact them.

Area and filter pages are indexed. They open the split view with filters applied and the form pre-filled. The blog lives at `roomsie.com/blog`, not on a subdomain.

> [!danger] Listing pages were never the SEO asset
>
> They are thin, they churn, and they expire in 30 days. Area pages built on aggregate data rank, and nobody else has that data.

---

## 09 · A router, not an agent swarm (PD7a)

**Decision:** A cheap router sends each turn to the smallest handler that can serve it. Most turns never reach an expensive model.

- **0** Model calls for a chip tap
- **8–12** Calls per completed interview
- **1** Expensive handler: the reply writer

| Handler | Job |
|---|---|
| Extractor | Free text into Form A, the filters. Limited to enums. |
| Observer | Into Form B, the profile. Every observation quotes the user. |
| Advisor | Consulting questions, from roomsie's own articles first, with Postgres full-text search and no vector store. Then a web search for general questions, after sign-in only. |
| Reply writer | Reads the forms and the last two turns, never the whole transcript. |

> [!danger] Hallucination is removed by structure
>
> Extraction can only pick an enum. A profile fact must point at the user's words. Results come from SQL, never from prose.

All four ship on 12 October. The router runs on DeepSeek Flash behind its own adapter, and Jev gets a trial on the eval set once access arrives. Every typed message is stored, so the observer can learn from all of them.

---

## 10 · DeepSeek, with Gemini behind it (PD7)

**Decision:** DeepSeek V4.1 Flash runs every role. Gemini Flash-Lite takes over on failure or invalid output. Sarvam is dropped.

Web search is not on by default. The advisor turns on DeepSeek's `web_search` tool, which only its Anthropic-compatible endpoint offers, and falls back to Gemini's Google Search grounding.

Chosen on how well each model reads Hinglish, not on price. At this volume the price gap is noise.

- **₹1–2** Per completed interview
- **6.87%** Hinglish drop from English, the smallest Indic gap
- **9.63%** Marathi drop, among the largest

> [!warning] Marathi is the real language risk, not Hinglish
>
> Small models almost never say “I don't know”, so every enum carries an `unclear` option, and abstention is measured in the eval. Without Sarvam, a Hinglish speaker may get English back. That's handled in the prompt and measured.

---

## 11 · Five scope bands (PD10)

**Decision:** The assistant always answers something. How much it may say depends on how costly a wrong answer is.

| Band | Handling |
|---|---|
| Core | The interview |
| Adjacent, general | Articles first, then a web search for signed-in users. Visitors get general knowledge, clearly hedged |
| Adjacent, consequential | Law, tax, area safety, claims about a person. Articles only, otherwise handed off. Never improvised. |
| Out of scope | One scripted line, no model call. Counts toward the turn cap. |
| Adversarial | Scripted and logged |
| Sensitive | Never redirected |

The corpus starts as 30 articles, written by people from real interviews before launch. Every question the corpus can't answer becomes the next article.

---

## 12 · Five turns before sign-in (PD9)

**Decision:** Anonymous visitors get five typed turns. Chip taps don't count, and the sign-in wall never appears before results do.

- Results stay visible behind the wall.
- Rate limits per device and per network.
- At the daily spend ceiling, the chat falls back to chips only, which cost nothing. No error page.
- An alert fires at 70% of the ceiling.

---

## 13 · DigiLocker, not Aadhaar copies (PD8)

**Decision:** Verification goes through DigiLocker, bought from a registered KYC provider. The fallback is a passport, driving licence or voter ID, reviewed by a person.

People can choose to be seen only by verified users. Their photos appear blurred to everyone else, so the blur itself prompts people to verify. The blur is made on the server.

> [!tip] Dropped: manual Aadhaar upload
>
> Private companies may not collect or keep Aadhaar copies under the Aadhaar Act 2016, sections 29 and 37, and UIDAI is banning photocopy collection outright. roomsie stores the result, never the document.

Verification is not in the 12 October launch. It ships in v1.

---

## 14 · Brokers pay for introductions (PD3 · PD4)

**Working hypothesis:** Brokers list for free and pay only when the assistant sends them an interviewed, matched seeker. Users never pay to search.

- **₹803 Cr** NoBroker FY24 revenue, 99% from subscriptions
- **₹411 Cr** NoBroker FY24 loss

**Incumbents sell search, so they get paid when nobody moves.** Duplicate listings come from the market's structure: owners give the same flat to several brokers, and India has no shared listing service. roomsie would merge duplicates into one card, with brokers competing behind it for the introduction.

> [!warning] Unproven
>
> This waits on marketing's broker calls, and it is out of v0.

---

## 15 · A small, self-funded team (PD5)

- **5** Engineers, 2 hours a day
- **2 + 1** Marketing and design
- **₹1–2** Model cost per interview

The cost risk is someone abusing the open chat, not the cost per interview. There's no vector store, because matching is a database query, not a document search.

---

## 16 · Public launch, 12 October (PD11)

**Decision:** Public launch on Mon 12 Oct. If the team falls behind, launch moves to Wed 14 Oct and the scope stays the same.

Go or no-go is decided on Sat 10 Oct at 8 pm. The launch moved from 7 October on 26 September, to bring the router, observer and advisor into launch.

- **170** Person-hours available, 5 × 2h × 17 days
- **151** Build hours in the plan
- **19** Spare, none of it before designs land

| Ships 12 Oct | After launch |
|---|---|
| Chat with chips, the router, extraction, the observer and the reply writer | In-app messaging |
| The advisor: articles first, web search after sign-in | — |
| Results panel, profiles with photos | — |
| Contact revealed when both accept | Verification, blurred cards |
| Report, block, account deletion, waitlist, legal pages | SEO area pages |
| Results re-queried when the form changes, responsive mobile | Live-update banners and undo, mobile bottom sheet |
| Analytics in its own database, nightly backups | — |

> [!danger] Cold start is the real risk, not code
>
> At least 150 seeded profiles, with 40 or more in each launch area. If one area falls short, launch in the other two rather than move the date.

---

## 17 · Five lanes, two phases (PD12)

**Decision:** There are no designs yet, so the work runs in two phases. All design-free work lands first, and every screen is built once designs exist.

Every task still has one owner, start to finish. Design, marketing and the founder keep their roles.

| Lane | Owns | Hours |
|---|---|---|
| P1 Platform | Code base, sign-in, deploy, errors, alerts, invite gate. Then profiles, the waitlist, the analytics database and backups. | 34 |
| P2 Assistant | Form contract, models, extraction, replies, the router, limits, eval | 30 |
| P3 Data & trust | Database and match query. Then the results panel, person screens and the advisor. | 34 |
| P4 Content & moderation | Landing, legal pages, report and block, deletion. Then Form B and the observer. | 25 |
| P5 Accounts & connections | Eval sentences, CI, events, chat carry-over, connect API. Then the chat screen and its chips. | 28 |

| Phase | Dates | What happens |
|---|---|---|
| A · Design-free | Thu 24 → Wed 30 Sep | Monorepo, database, sign-in, assistant, matching, moderation |
| B · Screens and the assistant | Thu 1 → Sat 10 Oct | Every screen, built from finished designs, plus the router, observer, advisor, analytics database and backups |

> [!warning] The one hard deadline
>
> Designs D-02, D-03 and D-04 must be finished by the end of Wednesday 30 September. Phase A has no slack, so every day a design slips is a day the launch slips.

| Checkpoint | Date |
|---|---|
| CP0 Kickoff | Fri 25 Sep |
| CP1 Foundation | Mon 28 Sep |
| CP2 Core loop live | Thu 1 Oct |
| CP3 Freeze and go/no-go | Sat 10 Oct, 8 pm |
| CP4 Launch | Mon 12 Oct, fallback Wed 14 Oct |
| CP5 First-week review | Mon 19 Oct |

55 tasks are tracked as GitHub issues. Each person's list, in order, is in `docs/how-to-work.md`. Every task's done-when list is in `docs/team-plan.md`. The graph and timeline are in `docs/plan/`, for Obsidian.

---

## → · Still open

| Question | State |
|---|---|
| Brokers and monetisation | **[Testing]** Waiting on broker calls |
| Identity text in a published listing | **[Open]** Separate from private filters |
| Elevator pitch | **[Open]** “Your agentic broker” for investors. A plainer line for users. |
| Which intent cards ship in v0 | **[Open]** Two of the prototype's four cards are about property, which PD0 keeps out of v0 |
| Designs D-02 to D-04 | **[Due]** End of Wed 30 Sep. The launch date depends on it. |
| Mobile split-view UI | **[Provisional]** The mechanics are settled, the look isn't |
| Design system | **[Exception]** Prototype look for launch, Untitled UI later (ADR 0011) |
| Router model | **[Testing]** DeepSeek at launch. Trial Jev on the eval set once access arrives |
| Two Supabase accounts | **[Exception]** Main and analytics databases on two free accounts. Both move into one paid organisation when we start paying. No backups on free, so a nightly dump goes to R2 |
| Master launch document | **[Deferred]** Every input is settled |

---

## § · Where the detail lives

| Topic | File |
|---|---|
| Running decision record | CONTEXT.md |
| Assistant risks and guardrails | docs/ai-agent-design.md |
| Router and two forms | docs/agent-architecture.md |
| Models and the Hinglish report | docs/model-selection.md |
| Interface rules | docs/interface-shape.md |
| Login gate and search | docs/seo-with-gated-products.md |
| Scope bands | docs/scope-policy.md |
| Pre-login limits | docs/pre-login-limits.md |
| Verification | docs/verification.md |
| Brokers and supply | docs/research/supply-and-broker-model.md |
| Launch scope | docs/launch-plan.md |
| Who does what, in order | docs/how-to-work.md |
| Decisions for the designer | docs/design-review.md |
| Every task and its done-when list | docs/team-plan.md |
| How the architecture absorbs change | docs/extensibility.md |
| Technical base | docs/tech-base.html |

roomsie · Product record v0.1 · September 2026 · Private
