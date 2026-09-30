# What roomsie does, and *why*

*Product record · v0.1*

This record gives all the product decisions from the planning session, from the audience to the launch plan. For each decision, it gives our choice and its cost. Thus, nobody has to argue a decision again from memory.

Sept 2026 · Mumbai · v0 flatmates only · Launch 12 Oct · 5 devs × 2h/day

### The ledger

roomsie is the AI-native pivot of femmeflats. An assistant interviews you. Then it shows the people that fit. The technical base in `tech-base.html` stays with no change. This page records the product on that base.

### Product

| # | Decision | Summary | Status |
|---|---|---|---|
| 01 | [Open to all genders](#01--open-to-all-genders-pd1) | We removed the women-only wedge | Settled |
| 02 | [Mumbai first](#02--mumbai-first-pd2) | Three neighbourhoods, in the same region as the stack | Settled |
| 03 | [v0 is flatmate matching only](#03--v0-is-flatmate-matching-only-pd0) | No property listings at this time | Settled |
| 04 | [The interview earns its place](#04--the-interview-earns-its-place-pd3b) | It finds what chips cannot find, and it disagrees with the user | Settled |
| 05 | [Record stated preferences](#05--record-stated-preferences-pd3c) | Never infer, never suggest | Settled |

### Experience

| # | Decision | Summary | Status |
|---|---|---|---|
| 06 | [Interview first, then split view](#06--interview-first-then-split-view-pd6--pd6a) | The chat and the results are adjacent | Settled |
| 07 | [The panel follows the form](#07--the-panel-follows-the-form-pd6c) | Not the chat turn | Settled |
| 08 | [Login gates details and contact only](#08--login-gates-details-and-contact-only-pd6b) | All other pages are public and search engines can index them | Settled |

### Assistant

| # | Decision | Summary | Status |
|---|---|---|---|
| 09 | [A router, not an agent swarm](#09--a-router-not-an-agent-swarm-pd7a) | All four handlers ship at launch | Settled |
| 10 | [DeepSeek, with Gemini behind it](#10--deepseek-with-gemini-behind-it-pd7) | We chose it for Hinglish, not for price | Settled |
| 11 | [Five scope bands](#11--five-scope-bands-pd10) | Always give an answer | Settled |
| 12 | [Five turns before sign-in](#12--five-turns-before-sign-in-pd9) | Also rate limits and a spend ceiling | Settled |

### Trust & business

| # | Decision | Summary | Status |
|---|---|---|---|
| 13 | [DigiLocker, not Aadhaar copies](#13--digilocker-not-aadhaar-copies-pd8) | The blur tells people to verify | Settled |
| 14 | [Brokers pay for introductions](#14--brokers-pay-for-introductions-pd3--pd4) | We wait for the broker calls | Testing |
| 15 | [A small, self-funded team](#15--a-small-self-funded-team-pd5) | Approximately ₹1–2 for each interview | Settled |

### Launch

| # | Decision | Summary | Status |
|---|---|---|---|
| 16 | [Public launch, 12 October](#16--public-launch-12-october-pd11) | Fallback 14 October | Settled |
| 17 | [Five lanes, two phases](#17--five-lanes-two-phases-pd12) | First the work that needs no design, then the screens when the designs are available | Settled |

---

## 01 · Open to all genders (PD1)

**Decision:** roomsie is for all people. We removed the women-only promise from femmeflats.

The market is two times larger, and the cold start is easier. Also, gender verification no longer stops the launch.

> [!warning] What it costs
>
> We lost the safety story. But the safety problem did not go away. Gender preferences now come through the interview, and we must make the trust story again. We remove all women-only lines from the V3 prototype.

---

## 02 · Mumbai first (PD2)

**Decision:** Launch in Mumbai, in the three neighbourhoods that have the most seeded profiles. Do not launch in all of the city.

The region is the same as the stack: `ap-south-1`, `bom`, `bom1`. Mumbai has the highest rents and the largest need for flatshares.

**Density is more important than coverage.** A visitor from a launch area sees a full panel. All other visitors join a waitlist for their area. The waitlist tells marketing where to seed next.

---

## 03 · v0 is flatmate matching only (PD0)

**Decision:** v0 has no property listings. A person with a spare room is a person card.

| In v0 | After v0 |
|---|---|
| Flatmate matching, which includes people with a room to share | Property listings, brokers, payments |

This removes supply, brokers and money from v0. Thus, the cold start is a problem on one side only.

---

## 04 · The interview earns its place (PD3b)

**Decision:** The assistant does two things that chips cannot do. It finds what people never tick a box for. It also disagrees with the user.

“My ex basically lived there.” “Six dealbreakers are hiding 90% of Powai.”

> [!danger] The form is the source of truth, not the model
>
> A structured form runs in parallel with all of the chat. For each slot, the form records if the user stated the value or the model inferred it. An inferred value never fills a slot silently. If a value contradicts an earlier value, the assistant confirms it with the user. It never overwrites the earlier value.
>
> Confidence is the empty slot. It is not a number that the model reports about itself.

---

## 05 · Record stated preferences (PD3c)

**Decision:** If a user states a preference, which includes community or religion, roomsie records it and filters on it.

India has no general law against discrimination in private housing. The DPDP Act has no sensitive-data class. Thus, the risk comes from the press, not from a court.

| Guardrail kept | Why |
|---|---|
| Never infer | Not from a name, a diet, an area or a festival. To serve a preference is not to make one. |
| Never suggest | We record it only when the user gives it. We never offer it as a chip or a question. |
| Out of any learned ranking | A stated filter is the choice of the user. A learned weight is the choice of the system. |
| Filter server-side | Nobody is told that they were excluded. |

> [!warning] Still open
>
> We do not know yet if a published listing can have identity restrictions in its visible text. An advert is a different position from a private filter.

---

## 06 · Interview first, then split view (PD6 · PD6a)

**Decision:** The landing page goes to a full-screen chat, and the user cannot skip it. After two or three answers, the screen divides into the chat and the results.

1. **Step 1** Landing
   The hero and the story. “Start looking” opens the chat.
1. **Step 2** Full-screen chat
   Chips for intent, area and budget. The user can also type.
1. **Step 3** Split view
   The chat is adjacent to the live results, with some manual filters.

> [!note] Mobile is provisional
>
> The chat fills the screen. When results appear, the chat becomes a bar of approximately 25% of the screen. On a tap, it expands to approximately 60%. It never changes size while the user types.

---

## 07 · The panel follows the form (PD6c)

**Decision:** The results change when a form value or a weight changes. They do not change on each chat turn.

The first results come after intent, area and budget. The match score stays hidden until the user gives lifestyle answers.

> [!note] For 12 October, only the basics
>
> At launch, the panel queries again when the form changes. The banners, the undo and the scroll rules below come in v1.

| Change | What the panel does |
|---|---|
| More results | A banner: “12 more matches. Show them.” |
| Fewer results | It applies the change, tells what went, and offers undo |
| New order | Only on refresh. Never during a scroll. |
| A saved card fails | Never removed. It shows the reason. |

### One form, two views

| Conflict | Rule |
|---|---|
| Chat against earlier chat | Ask which one to keep |
| Manual filter against chat | The filter wins. The assistant tells the user one time. |
| Inference against anything | It never wins. The assistant proposes it. |

---

## 08 · Login gates details and contact only (PD6b)

**Decision:** The chat, the results and browsing are public. A user must log in only to open the details of a person or to contact a person.

Search engines index the area pages and the filter pages. These pages open the split view with the filters applied and the form filled in advance. The blog is at `roomsie.com/blog`, not on a subdomain.

> [!danger] Listing pages were never the SEO asset
>
> They have little content, they change frequently, and they expire in 30 days. Area pages made from aggregate data get a high rank, and no other company has that data.

---

## 09 · A router, not an agent swarm (PD7a)

**Decision:** A cheap router sends each turn to the smallest handler that can serve it. Most turns never get to an expensive model.

- **0** Model calls for a chip tap
- **8–12** Calls for each completed interview
- **1** Expensive handler: the reply writer

| Handler | Job |
|---|---|
| Extractor | Changes free text into Form A, the filters. It can give only enums. |
| Observer | Writes into Form B, the profile. Each observation quotes the user. |
| Advisor | Answers consulting questions. First it uses roomsie's own articles, with Postgres full-text search and no vector store. Then it uses a web search for general questions, only after sign-in. |
| Reply writer | Reads the forms and the last two turns. It never reads the full transcript. |

> [!danger] Hallucination is removed by structure
>
> Extraction can only select an enum. A profile fact must point to the words of the user. Results come from SQL, never from prose.

All four handlers ship on 12 October. The router runs on DeepSeek Flash behind its own adapter. When we get access to Jev, we will try Jev on the eval set. We store all typed messages, so the observer can learn from all of them.

---

## 10 · DeepSeek, with Gemini behind it (PD7)

**Decision:** DeepSeek V4.1 Flash runs all roles. If it fails or gives invalid output, Gemini Flash-Lite replaces it. We removed Sarvam.

Web search is off by default. The advisor turns on the DeepSeek `web_search` tool. Only the Anthropic-compatible endpoint of DeepSeek has this tool. The fallback is Google Search grounding in Gemini.

We chose the model for how correctly it reads Hinglish, not for its price. At this volume, the difference in price is too small to be important.

- **₹1–2** For each completed interview
- **6.87%** Hinglish drop from English, the smallest Indic gap
- **9.63%** Marathi drop, one of the largest

> [!warning] Marathi is the real language risk, not Hinglish
>
> Small models almost never say “I don't know”. Thus, each enum has an `unclear` option, and the eval measures abstention. Without Sarvam, a Hinglish speaker can get a reply in English. The prompt handles this, and we measure it.

---

## 11 · Five scope bands (PD10)

**Decision:** The assistant always gives an answer. The quantity that it can say depends on the cost of a wrong answer.

| Band | Handling |
|---|---|
| Core | The interview |
| Adjacent, general | Articles first, then a web search for signed-in users. Visitors get general knowledge, with a clear warning that it can be incorrect |
| Adjacent, consequential | Law, tax, area safety, claims about a person. Articles only. If no article applies, the assistant transfers the question. Never improvised. |
| Out of scope | One scripted line, no model call. It counts toward the turn cap. |
| Adversarial | Scripted and logged |
| Sensitive | Never redirected |

The corpus starts with 30 articles. People write them from real interviews before launch. When the corpus cannot answer a question, that question becomes the next article.

---

## 12 · Five turns before sign-in (PD9)

**Decision:** Anonymous visitors get five typed turns. Chip taps do not count. The sign-in wall never appears before the results.

- The user can see the results behind the wall.
- Rate limits apply for each device and for each network.
- At the daily spend ceiling, the chat changes to chips only, which have no cost. There is no error page.
- An alert starts at 70% of the ceiling.

---

## 13 · DigiLocker, not Aadhaar copies (PD8)

**Decision:** Verification goes through DigiLocker, which we buy from a registered KYC provider. The fallback is a passport, a driving licence or a voter ID, which a person reviews.

People can choose to let only verified users see them. All other users see blurred photos of them. Thus, the blur itself tells people to verify. The server makes the blur.

> [!tip] Dropped: manual Aadhaar upload
>
> Under the Aadhaar Act 2016, sections 29 and 37, private companies must not collect or keep Aadhaar copies. UIDAI is also banning all collection of photocopies. roomsie stores the result, never the document.

Verification is not in the 12 October launch. It ships in v1.

---

## 14 · Brokers pay for introductions (PD3 · PD4)

**Working hypothesis:** Brokers list for free. They pay only when the assistant sends them a seeker that it interviewed and matched. Users never pay to search.

- **₹803 Cr** NoBroker FY24 revenue, 99% from subscriptions
- **₹411 Cr** NoBroker FY24 loss

**Incumbents sell search, so they get money when nobody moves.** Duplicate listings come from the structure of the market. Owners give the same flat to many brokers, and India has no shared listing service. roomsie would merge duplicates into one card. Behind that card, the brokers would compete for the introduction.

> [!warning] Unproven
>
> This waits for the broker calls from marketing. It is not in v0.

---

## 15 · A small, self-funded team (PD5)

- **5** Engineers, 2 hours each day
- **2 + 1** Marketing and design
- **₹1–2** Model cost for each interview

The cost risk is a person who abuses the open chat, not the cost of each interview. There is no vector store, because matching is a database query, not a document search.

---

## 16 · Public launch, 12 October (PD11)

**Decision:** Public launch on Mon 12 Oct. If the team is late, the launch moves to Wed 14 Oct and the scope stays the same.

We make the go or no-go decision on Sat 10 Oct at 8 pm. On 26 September, we moved the launch from 7 October. The reason was to put the router, the observer and the advisor into the launch.

- **170** Person-hours available, 5 × 2h × 17 days
- **151** Build hours in the plan
- **19** Spare, none of it before the designs are available

| Ships 12 Oct | After launch |
|---|---|
| Chat with chips, the router, extraction, the observer and the reply writer | In-app messaging |
| The advisor: articles first, web search after sign-in | — |
| Results panel, profiles with photos | — |
| Contact shown when both people accept | Verification, blurred cards |
| Report, block, account deletion, waitlist, legal pages | SEO area pages |
| Results queried again when the form changes, responsive mobile | Live-update banners and undo, mobile bottom sheet |
| Analytics in its own database, nightly backups | — |

> [!danger] Cold start is the real risk, not code
>
> We need a minimum of 150 seeded profiles, with a minimum of 40 in each launch area. If one area does not have sufficient profiles, launch in the other two. Do not move the date.

---

## 17 · Five lanes, two phases (PD12)

**Decision:** There are no designs at this time, so the work has two phases. All the work that needs no design comes first. We build all screens when the designs are available.

Each task still has one owner from start to finish. Design, marketing and the founder keep their roles.

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
| B · Screens and the assistant | Thu 1 → Sat 10 Oct | All screens, made from finished designs. Also the router, the observer, the advisor, the analytics database and backups |

> [!warning] The one hard deadline
>
> Designs D-02, D-03 and D-04 must be complete by the end of Wednesday 30 September. Phase A has no slack. Thus, each day of delay to a design is one day of delay to the launch.

| Checkpoint | Date |
|---|---|
| CP0 Kickoff | Fri 25 Sep |
| CP1 Foundation | Mon 28 Sep |
| CP2 Core loop live | Thu 1 Oct |
| CP3 Freeze and go/no-go | Sat 10 Oct, 8 pm |
| CP4 Launch | Mon 12 Oct, fallback Wed 14 Oct |
| CP5 First-week review | Mon 19 Oct |

We track 55 tasks as GitHub issues. `docs/how-to-work.md` gives the list for each person, in order. `docs/team-plan.md` gives the done-when list for each task. `docs/plan/` has the graph and the timeline, for Obsidian.

---

## → · Still open

| Question | State |
|---|---|
| Brokers and monetisation | **[Testing]** We wait for the broker calls |
| Identity text in a published listing | **[Open]** Separate from private filters |
| Elevator pitch | **[Open]** “Your agentic broker” for investors. A more simple line for users. |
| Which intent cards ship in v0 | **[Open]** Two of the four cards in the prototype are about property. PD0 keeps property out of v0 |
| Designs D-02 to D-04 | **[Due]** End of Wed 30 Sep. The launch date depends on them. |
| Mobile split-view UI | **[Provisional]** The mechanics are settled. The appearance is not settled |
| Design system | **[Exception]** Prototype appearance for launch, Untitled UI later (ADR 0011) |
| Router model | **[Testing]** DeepSeek at launch. When we get access to Jev, try Jev on the eval set |
| Two Supabase accounts | **[Exception]** The main and analytics databases are on two free accounts. When we start to pay, both move into one paid organisation. The free accounts have no backups, so a nightly dump goes to R2 |
| Master launch document | **[Deferred]** All inputs are settled |

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
| Each task and its done-when list | docs/team-plan.md |
| How the architecture absorbs change | docs/extensibility.md |
| Technical base | docs/tech-base.html |

roomsie · Product record v0.1 · September 2026 · Private
