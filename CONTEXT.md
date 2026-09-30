# roomsie — working context

Read this file first. It gives the current state of the planning session.

**Last updated:** 2026-09-26 · **Owner:** Yash Mangal · **Org:** magentawood

> [!note]- Why
> We keep this file current. Thus, a person or an agent that starts work on the repo knows the status. They do not have to read the full transcript again.

---

## What roomsie is

roomsie is an AI-native platform to find flats and flatmates.

- No search box and no list to filter. An assistant interviews the user in a conversation to learn the real needs of the user.
- Then the assistant consults and recommends.
- The assistant shows matches only when it has sufficient signal.
- Browsing exists, but it comes after the conversation. It is not the front door.

The assistant must handle all the intents in the market, not only one:

- a person who looks for a full flat
- a person who looks for a room in an already-occupied flat
- a person who **has** a flat and looks for flatmates
- the combinations between these intents.

## Where this came from

- roomsie is a pivot. The previous product was **femmeflats**.
- Its PRD is **deprecated**. Do not cite it as a requirement source.
- We deleted the PRD from the repo. It stays in git history for three architecture decisions: `git show 08ecb48:docs/source/femmeflats-PRD-deprecated.md`.
- We deleted the women-only "HerNest" PRD draft in the same way: `git show a3d135e:docs/source/PRD-DraftV1.pdf > PRD-DraftV1.pdf`.
- The **technical base does not change.** Fifteen accepted ADRs and a full architecture record stay with no change, in `docs/decisions/` and `docs/tech-base.md`.
- A clickable wireframe of the pre-pivot product is at `docs/source/roomsie-prototype-V3.html`. We keep it as context: it shows the UI that already exists, which we can keep, cut or rework.

> [!note]- Why
> - femmeflats was a women-only, swipe-stack discovery app. It applied dating-app mechanics to shared living.
> - Three architecture decisions used claims from the femmeflats PRD as their argument.

---

## Decisions taken in this session

Product decisions use the prefix **PD** (PD0 to PD13). We cite architecture decisions as **ADR-NNNN**, and they are in `docs/decisions/`. Task IDs keep their own prefixes (T-, D-, M-, F-, A-). Thus, `D-04` is a design task, never a decision.

| # | Decision | Value | Consequence |
|---|---|---|---|
| PD1 | Audience | **Open to all genders** | Gender verification is no longer a launch blocker. |
| PD2 | Launch market | **Mumbai** | Brokers control most of the supply. |

> [!note]- Why
> - PD1: roomsie drops the women-only wedge of femmeflats. The market is larger. But differentiation is harder, and there is more direct competition.
> - PD2: Mumbai agrees with the current infrastructure region (`ap-south-1` / `bom` / `bom1`). It has the highest rents and the most acute need for flatshares.

## Open decisions

| # | Question | Status |
|---|---|---|
| PD0 | v0 scope | **Flatmate matching only.** Property listings are not separate objects. A person with a spare room is a person card. |
| PD3 | Where listing supply comes from at launch | **Deferred until the broker interviews.** Working hypothesis: brokers list free, and roomsie charges for a qualified introduction. We will validate it with calls to Mumbai brokers. See `docs/research/supply-and-broker-model.md`. |
| PD3a | Flatmate matching design | **Active track.** The team works on it in parallel with PD3. |
| PD3b | What the AI interview adds over the chip filters | **Settled: both.** The interview finds what chips cannot capture. It also consults and challenges the user. A structured form runs next to the full chat session. The assistant confirms each contradiction with the user, and does not silently overwrite the value. |
| PD3c | Exclusionary preferences | **Settled: record what the user states,** including community and religion, and filter on it. Mitigations: never infer, never suggest, keep them out of all learned ranking, filter server-side. See [`docs/assistant-risks.md` section 4.1](docs/assistant-risks.md#41-exclusionary-preferences--decision-pd3c). |
| PD3d | Whether a published listing may carry identity restrictions in visible text | **Open.** Separate from PD3c. |
| PD4 | Monetisation model and pricing | Pending. It follows PD3. |
| PD5 | Team and budget | **Settled: 5 engineers at 2 hours a day, 2 marketing, 1 designer.** Self-funded. See `docs/cost-and-team.md`. |
| PD12 | Team plan | **Settled. Cut again on 2026-09-25.** Five engineering lanes: P1 Platform, P2 Assistant, P3 Data and trust, P4 Content and moderation, P5 Accounts and connections. Phase A (24–30 Sep): work that needs no design. Phase B (1–10 Oct): all 35 hours of screens, and the router, observer, advisor, analytics database and backups. 151 build hours against 170 available. Designs D-02 to D-04 due by the end of 30 September. Each task keeps one owner. After Phase A, the list of no person waits on another person. Design, marketing and founder keep their roles. See `docs/how-to-work.md`, `docs/team-plan.md` and `docs/design-review.md`. |
| PD11 | Launch | **Moved on 2026-09-26: target Monday 12 October, fallback Wednesday 14 October. Quality comes before the date.** The go/no-go list is the quality bar. If a check fails, the date moves by a small quantity. We do not ship something below the bar. Go or no-go: Saturday 10 October, 8 pm. v0 is free. **Public launch**: adds about 15 hours for report and block, account deletion, a waitlist outside the launch areas, monitoring and legal pages. See `docs/launch-plan.md`. |
| PD6c | The five holes in the interface design | **Four closed, one provisional.** The panel updates when the form changes, not on each chat turn. Widening shows as a banner. Narrowing applies, and it tells the user what it removed. One form, two views, with a complete conflict rule. See `docs/interface-shape.md`. |
| PD6 | Interface shape | **Settled for desktop.** Landing page, then a full-screen chat with no skip, then a side-by-side chat and listings view after 2 to 3 inputs. Listings update live. Minimal manual filters. See `docs/interface-shape.md`. |
| PD6a | Mobile pattern for the split view | **Provisional.** Chat fills the screen. When listings appear, the chat shrinks to a bottom bar at 25%. A tap expands it to 60%. Same mechanics as on desktop. The UI is not final. |
| PD6b | Where the login gate sits, and search | **Settled.** Log in only to see the details of a listing and to contact a person. Chat, split view and browsing are public. Area and filter pages are indexed. They open the split view with the filters applied and the form pre-filled. Blog at `roomsie.com/blog`. See `docs/seo-with-gated-products.md`. |
| PD10 | What the assistant will discuss | **Five bands.** The assistant always answers adjacent questions, in tiers by risk. General: model knowledge, with a hedge. Consequential (law, tax, area safety, claims about a listing): corpus only, handed off, not refused. Out of scope: a one-line scripted redirect with no model call. Adversarial: a scripted reply, and the system logs it. Sensitive: never a redirect. Before launch, we seed the corpus with ~30 articles. See `docs/scope-policy.md`. |
| PD9 | Abuse and cost limits on the pre-login chat | **Settled: both a turn cap and rate limits.** Five free-text turns. Chip taps do not count. The wall cannot appear before the results show. Listings stay visible when the chat gates. At the daily spend ceiling, the assistant degrades to the zero-cost chip flow, and does not fail. See `docs/pre-login-limits.md`. |
| PD7a | Agent architecture | **Settled on 2026-09-26, and all of it ships at launch: a router with small specialist handlers,** not multi-agent and not one large model. The router runs on DeepSeek Flash behind its own adapter. Jev gets a trial on the eval set when access arrives. The router also flags off-topic and adversarial messages. The advisor answers from our articles first. Then it uses the DeepSeek `web_search` tool, with the Gemini Google Search grounding as fallback. It does this **for general questions and signed-in users only**. Law, tax, area safety and claims about a person stay articles-only or handed off. Two forms: a filter form that drives SQL, and a structured profile form where each observation must quote the user. RAG only for consulting questions, on your own corpus, with Postgres full-text search, not a vector store. See `docs/agent-architecture.md`. |
| PD13 | Databases and backups | **Settled on 2026-09-26, as an exception.** The main and analytics databases are on two free Supabase accounts. The Supabase acceptable use policy discourages more accounts, and the free plan has no backups. Thus, a nightly dump of the two databases goes to R2. When we start to pay, the two projects move into one paid organisation. Connection details are only in environment settings. |
| PD7 | Models | **Settled: DeepSeek V4.1 Flash for every role, Gemini Flash-Lite as fallback.** We dropped Sarvam and the residency constraint. The cost is register matching: we mitigate it at the prompt level and measure it in the eval. Marathi is the real language risk, not Hinglish. See `docs/model-selection.md` and `docs/research/hinglish-model-report.md`. |
| PD8 | Verification | **Settled with one change.** Users who opt into verified-only see blurred cards, and verification must be mutual. The blur must be server-side. **The manual Aadhaar upload route is dropped.** Primary route: DigiLocker through a registered KYC provider. Manual fallback: a non-Aadhaar government ID. See `docs/verification.md`. |

> [!note]- Why
> - PD0 moves the broker work out of v0. It also makes cold start a one-sided problem.
> - PD3a: the matching design is mostly independent of PD3.
> - PD3d is separate from PD3c, because an advertisement is a different position from a private filter.
> - PD12: we cut the plan again because there are no designs at this time.
> - PD11: the move gets back the router, the observer and the advisor for launch. It also gets back analytics in its own database, and nightly backups.
> - PD11 history: the first target was 7 October, fallback 9 October, and go or no-go on 5 October. About 72 to 140 person-hours were available against 250 to 350 for the full v0.
> - PD11 history: we cut v0 to approximately 130 hours. The cut v0 had the chip flow plus one extraction call, the results panel and profiles. It had a mutual-accept contact reveal in place of in-app chat.
> - PD11 history: with the public launch, the new total was about 130 hours, with no margin. PD12 scheduled it as 115 build hours against 120 available for five engineers, plus a bug-fix day on 6 October.
> - PD13: the move to one paid organisation is a transfer, not a code change.
> - PD8: the blur is the conversion prompt.
> - PD8: it is an offence to collect Aadhaar copies, and UIDAI is banning it.

---

## Product record

- **`docs/product-base.md` is the one-page record of all product decisions,** in the same format as `docs/tech-base.md`. Keep it in step with the tables above.
- **The Markdown is the source for each doc that has a browser version:** tech-base, product-base, how-to-work, build-journal and design-review.
- `tools/render-docs.py` writes each `.html` from its `.md`. Edit the `.md`, then run the script.
- `--check` fails if an `.html` is out of date.
- The script needs `pip3 install -r tools/requirements.txt`.

## Team plan

- **The list of each person, in order, is in `docs/how-to-work.md`.**
- `docs/team-plan.md` has all the tasks, each with its done-when list.
- The two files come from `docs/team-plan.json`. This file is the one place where you edit the plan.
- Each task has a mirror GitHub issue. At this time, the issues have the initial `vertical:V1`–`V5` labels and milestones, until we relabel them.
- **For the designer:** `docs/design-review.md` lists all the behaviours that engineering builds on. The designer confirms, changes or defers each one.
- **To see it visually,** open this repo as an Obsidian vault. Start at `docs/plan/roomsie launch.md`. Then open the graph view or `docs/plan/Launch timeline.canvas`.
- After you edit `docs/team-plan.json`, rebuild with `python3 tools/build-obsidian-plan.py`. This also makes `docs/team-plan.md` again.

| Checkpoint | Date |
|---|---|
| CP0 Kickoff | Fri 25 Sep |
| CP1 Foundation | Mon 28 Sep |
| CP2 Core loop live | Thu 1 Oct |
| CP3 Feature freeze and go/no-go | Sat 10 Oct, 8 pm |
| CP4 Launch | Mon 12 Oct, fallback Wed 14 Oct |
| CP5 First-week review | Mon 19 Oct |

## Ready to start now

| Who | What | Blocked by |
|---|---|---|
| Marketing | Call Mumbai brokers to test the model of free listings and paid introductions | Nothing |
| Marketing | Write the 30 corpus articles, `docs/content/corpus-plan.md` | Nothing |
| Designer | Resolve the V3 prototype palette against the Untitled UI pipeline of ADR 0011 | Nothing. This task blocks frontend work. |
| Tech | Do the work in the lanes in `docs/how-to-work.md` | Nothing |

---

## Deferred

| Item | State |
|---|---|
| The 10-section master launch document | **Deferred on 2026-09-23.** |
| The elevator pitch | Open. Proposal: "Your agentic broker". Recommendation: use it as the line for investors and press. Find a plainer line for users. |

> [!note]- Why
> - The tables above settle all the decisions that the master launch document needs.
> - "Broker" implies fees to renters, and v0 has no property.

## Deliverables for this session

One unified master launch document, with these sections in this order:

1. Executive summary and vision
2. Market and customer analysis
3. Business objectives and success metrics
4. Product scope and features
5. Technical and operational readiness
6. Go-to-market and marketing strategy
7. Sales and customer support enablement
8. Quality assurance and testing
9. Launch execution and governance
10. Post-launch evaluation and next steps

We finalise each section interactively, one point at a time, before we write it.

---

## Carried-over technical constraints that the AI pivot stresses

An LLM agent layer conflicts with the current stack in the places below. The technical document must resolve each conflict:

- **No queue or message broker.** Background work runs in the process on one Fly machine. Multi-turn agent loops have no durable place to live.
- **No vector store.** ADR 0001 forbids proprietary extensions on the critical path. Thus, `pgvector` needs an explicit amendment before we adopt it.
- **No streaming.** The API boundary is contract-first. Zod parses each byte in, and a generated OpenAPI document is the source of truth for all clients. Token streaming does not fit that shape.
- **Realtime has a cap.** Supabase Realtime `broadcast` only: 500 concurrent connections on Pro, then $10 for each 1,000 more.
- **No inference vendor, key class, prompt-versioning or eval story** exists. The ~$50–80/month budget has no line for one.
- **Data-residency posture is hostile to third-party inference.** ADR 0014 mandates PII scrubbing. Before we send conversation content to an external model, we need a decision that directly engages that reasoning.

These sanctioned hooks help:

- ADR 0004 explicitly allows an ML service outside the API, which the API calls.
- ADR 0012 already designates the analytics store as a training corpus.
- The `reportError` wrapper of ADR 0014 is the documented precedent to put a swappable vendor behind one internal module.

> [!note]- Why
> - We designed the current stack for a deterministic swipe app.
> - ADR 0012 rejected a vendor. One reason was to not send a behavioural stream out.

---

## Repo layout

ADR 0003 and ADR 0010 fix the top level. The contents of `apps/` are a proposal, mapped to the tasks that build them. T-02 creates them. The owner of T-02 can adjust names in an app, and does not have to ask. Each item with a task code does not exist yet.

```
roomsie/
├── apps/
│   ├── web/                    Next 16 · React 19 · Tailwind v4 · TanStack Query → Vercel, bom1
│   │   ├── app/                routes
│   │   │   ├── (public)/       landing, privacy, terms, grievance        T-23a T-23b
│   │   │   ├── chat/           full-screen chat, then split view, chips  T-10 T-09
│   │   │   ├── people/[id]/    person detail and connect                 T-18b
│   │   │   ├── profile/        create and edit, photos                   T-16
│   │   │   └── waitlist/       launch areas and waitlist                 T-22
│   │   ├── components/         prototype look, theme tokens only         ADR 0011 exception · T-23a
│   │   └── lib/                API client typed from packages/contract, Firebase sign-in
│   └── api/                    Fastify · Zod · Drizzle → Fly.io Mumbai
│       ├── src/
│       │   ├── server.ts       mounts every module under /v1             T-02
│       │   ├── plugins/        auth check, rate limits, invite gate      T-05 T-21 T-33
│       │   ├── adapters/       the only place a vendor SDK is imported
│       │   │   ├── llm/        DeepSeek, then Gemini                     T-11
│       │   │   ├── auth/       Firebase token check                      T-05
│       │   │   ├── storage/    R2 presigned URLs                         T-16
│       │   │   └── analytics/  track(), into the analytics database      T-24 T-39
│       │   ├── assistant/      one entry point for every turn
│       │   │   ├── pipeline.ts router first, then the handlers it picks T-12 T-34
│       │   │   └── handlers/   extract, observe, advise, reply           T-12 T-36 T-38 T-13
│       │   ├── articles/       the advisor's articles, full-text search  T-37
│       │   ├── modules/        one folder per feature, each owning its tables
│       │   │   ├── chat/       stored turns, form state, turn cap,
│       │   │   │               spend ceiling                             T-06 T-17 T-21
│       │   │   ├── matching/   the match query                           T-14
│       │   │   ├── profiles/   profiles and photos                       T-16
│       │   │   ├── connections/ connect request, contact reveal          T-18a
│       │   │   ├── moderation/ report, block, suspend                    T-19
│       │   │   ├── account/    first sign-in, deletion                   T-05 T-20
│       │   │   └── waitlist/   launch areas and waitlist                 T-22
│       │   └── db/             Drizzle client; each module keeps its
│       │                       own schema file                           T-06
│       ├── drizzle/            generated SQL migrations                  ADR 0006
│       ├── eval/               eval sentences and the runner             M-03 T-27
│       ├── Dockerfile
│       └── fly.toml                                                      T-04
├── packages/
│   ├── contract/               Zod: Form A, every API route, analytics
│   │                           events. OpenAPI is generated from it      T-08 · ADR 0004 0012
│   └── config/                 shared tsconfig and ESLint, and reportError()  ADR 0010 0013 · T-07
├── docs/
│   ├── how-to-work.md          each person's list, in order, and the code index
│   ├── design-review.md        behaviour decisions for the designer
│   ├── extensibility.md        every known future change, and the seam that absorbs it
│   ├── product-base.md         the product record (.html generated)
│   ├── tech-base.md            the technical record (.html generated)
│   ├── decisions/              the ADRs, 0001 to 0015
│   ├── team-plan.json          the plan's data. Edit this, then run the builder
│   ├── team-plan.md            generated from team-plan.json
│   ├── plan/                   the Obsidian view, generated
│   ├── *.md                    decision notes: interface, agent, models, scope, limits, SEO, verification
│   ├── research/ · content/    market research and the article corpus plan
│   └── source/                 vendored inputs: the V3 prototype
├── tools/
│   ├── build-obsidian-plan.py  rebuilds docs/plan/, .obsidian/graph.json and docs/team-plan.md
│   ├── render-docs.py          writes each docs .html from its .md
│   └── sync-issues.py          makes the GitHub issues match the plan
├── .github/workflows/ci.yml    typecheck, lint, build, secret scan       T-03
├── .obsidian/                  vault settings; the graph shows docs/plan
├── package.json · pnpm-workspace.yaml · turbo.json                       T-02 · ADR 0010
├── CLAUDE.md                   agent entry point
└── CONTEXT.md                  this file
```

- A vendor swap changes one folder in `adapters/`.
- A new feature is a new folder in `modules/`.
- The v1 assistant handlers go into `handlers/`.
- For each future change, `docs/extensibility.md` gives where it goes and what must be correct today.
- Not in v0: a mobile app. It has a prepared place next to `apps/web`.
- We do not plan a vector store at all.
- Nightly backups to R2 run from `.github/workflows/` (T-40).

> [!note]- Why
> - We made the layout to absorb change, not to redraw it.
> - `docs/extensibility.md` lists all the future changes that we know about.
> - No vector store: matching is a SQL query, and the corpus fits Postgres full-text search.

## Conventions

- **Before you add a vendor or a feature, read `docs/extensibility.md`.** Nothing changes shape.
- Each time we settle a decision, update the decision tables above.
- **Remote Control stays off.**
- **Never push to `main`.** All changes go into the repo through a pull request.
- **Write all Markdown in STE (ASD-STE100 Simplified Technical English), with the ste-writing skill.** Use short sentences and plain words. This applies to all the documents in this repo.
- The repo is **private**. Its history still holds the previous session transcript, and this transcript contains personal data.

> [!note]- Why
> - Vendors go behind `adapters/`, and features go in `modules/`.
> - The tables are the citable record, not the transcript.

---

## What the V3 prototype already establishes

`docs/source/roomsie-prototype-V3.html` is a 23-surface clickable desktop prototype. Use it, not the PRD, as the pre-pivot baseline.

**Items that it settles:**

- **Grid, not stack.** Flats and flatmates show in one responsive card grid with a sticky filter rail. There is no swipe anywhere.
- **The three-state chip.** Sixteen lifestyle chips on nine axes. One tap means prefer, two taps mean dealbreaker, and three taps turn it off.
- If an item fails a dealbreaker, the grid hides it fully. The grid shows the count as "N hidden by your dealbreakers".
- **The nine-axis lifestyle vocabulary**: kitchen, smoking, alcohol, guests, pets, hours, tidiness, at-home vibe, daytime presence. Each axis has three uses: a fact about you, a want with a weight, and a filter.
- **Intent as the first question.** Four cards: a flat and flatmates, only a flat, only a flatmate, renting out a flat.
- **Lazy registration.** The prototype asks nothing at the start. The first message or the first publish starts auth, phone and face check. Signup does not start them.
- **Match score** = 100 with no preferences set. If the user sets preferences, the score is 70 plus 30 times the fraction of preferences hit.
- **Design language**: warm cream and paper, pink `#FF87AC` primary, yellow `#FBDF8E` secondary, Bricolage Grotesque for display and Plus Jakarta Sans for body. Light-first, with full dark mode.

**Items that the all-genders decision (PD1) makes invalid in it:**

- all the women-only strings
- the "For women. By women" hero
- the "Only women see this" reassurance in the post wizard.

To replace them, roomsie needs a new trust story. The product scope section must supply this story.

**Items that it does not build** and that are important to the plan:

- no OTP screen
- no message composer that works in a chat that exists
- no photo upload
- no persistence
- no report or block function
- no notifications
- no settings
- no search
- no map
- the privacy visibility toggles do nothing.

The prototype collects the listing description, and then discards it.

The prototype and the design-system ADR do not agree:

- The palette and fonts of the prototype are not Untitled UI.
- ADR 0011 makes Figma the single source of truth, with a generated `theme.css`.
- Not resolved: does the look of the prototype become the design system, or do we rebuild it in Untitled UI?

> [!note]- Why
> - The V3 prototype is much more complete than the deprecated PRD. It already carries the roomsie name, it is already Mumbai-only, and it already abandoned the swipe stack.
> - The pivot should probably keep the items that the prototype settles.
> - The four intent cards map exactly onto the intents that the AI interview must disambiguate.
> - PD1 also makes invalid the safety argument that the women-only items carry.
