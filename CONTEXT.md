# roomsie — working context

Read this first. It is the running state of the planning session, kept current
so that anyone (or any agent) picking the repo up knows where things stand
without replaying the whole transcript.

**Last updated:** 2026-09-26 · **Owner:** Yash Mangal · **Org:** magentawood

---

## What roomsie is

An AI-native platform for finding flats and flatmates. Instead of putting a
search box in front of a user and making them filter a list, an assistant
interviews them — conversationally — to understand what they actually need,
then consults and recommends. Only once the assistant has enough signal does it
start surfacing matches. Browsing exists, but it is downstream of the
conversation rather than the front door.

The assistant has to handle every intent in the market, not just one:

- someone looking for a whole flat,
- someone looking for a room in an already-occupied flat,
- someone who **has** a flat and is looking for flatmates,
- and the combinations in between.

## Where this came from

roomsie is a pivot. The previous product, **femmeflats**, was a women-only,
swipe-stack discovery app — dating-app mechanics applied to shared living. Its
PRD is in `docs/source/femmeflats-PRD-deprecated.md` and is **deprecated**: do
not cite it as a requirement source. It is kept for history and because three
architecture decisions were argued from claims it made.

The **technical base does not change.** Fifteen accepted ADRs and a full
architecture record carry over unchanged. They are vendored in
`docs/source/decisions/` and `docs/source/tech-base.html`.

A clickable wireframe for the pre-pivot product is at
`docs/source/roomsie-prototype-V3.html`, kept as context for what UI already
exists to keep, cut or rework.

---

## Decisions taken in this session

| # | Decision | Value | Consequence |
|---|---|---|---|
| D1 | Audience | **Open to all genders** | Drops the femmeflats women-only wedge. Gender verification is no longer a launch blocker. Larger market, harder differentiation, more direct competition. |
| D2 | Launch market | **Mumbai** | Matches existing infrastructure region (`ap-south-1` / `bom` / `bom1`). Highest rents and most acute flatshare need; broker-dominated supply. |

## Open decisions

| # | Question | Status |
|---|---|---|
| D0 | v0 scope | **Flatmate matching only.** No property listings as separate objects; someone with a spare room is a person card. Moves the broker work out of v0 and makes cold start a one-sided problem. |
| D3 | Where listing supply comes from at launch | **Deferred pending broker interviews.** Working hypothesis: brokers list free, roomsie charges for a qualified introduction. See `docs/research/supply-and-broker-model.md`. To be validated by calling Mumbai brokers. |
| D3a | Flatmate matching design | **Active track.** Being worked in parallel, because it is substantially independent of D3. |
| D3b | What the AI interview adds over the chip filters | **Settled: both.** It surfaces what chips cannot capture, and it consults and pushes back. A structured form runs alongside the whole chat session; contradictions are confirmed with the user rather than silently overwritten. |
| D3c | Exclusionary preferences | **Settled: record what the user states,** including community and religion, and filter on it. Mitigations retained: never infer, never suggest, keep them out of any learned ranking, filter server-side. See `docs/ai-agent-design.md` section 4.1. |
| D3d | Whether a published listing may carry identity restrictions in visible text | **Open.** Separated from D3c because an advertisement is a different position from a private filter. |
| D4 | Monetisation model and pricing | Pending, follows D3 |
| D5 | Team and budget | **Settled: 5 engineers at 2 hours a day, 2 marketing, 1 designer.** Self-funded. See `docs/cost-and-team.md`. |
| D12 | Team plan | **Settled, re-cut on 2026-09-25 because there are no designs yet.** Five engineering lanes: P1 Platform, P2 Assistant, P3 Data and trust, P4 Content and moderation, P5 Accounts and connections. Phase A (24–30 Sep) is all 80 design-free hours; Phase B (1–5 Oct) is all 35 hours of screens. Designs D-02 to D-04 are due by end of 30 September. Every task keeps one owner, and nobody's list waits on another person after Phase A. Design, marketing and founder keep roles. See `docs/how-to-work.md`, `docs/team-plan.md` and `docs/design-review.md`. |
| D11 | Launch | **Target 7 October 2026, fallback 9 October.** Scope is protected, time slips. Go or no-go decided on 5 October. About 72 to 140 person-hours available against 250 to 350 for the full v0. Cut to roughly 130 hours: chip flow plus one extraction call, results panel, profiles, and a mutual-accept contact reveal instead of in-app chat. v0 free. **Public launch**, which adds about 15 hours for report and block, account deletion, a waitlist outside the launch areas, monitoring and legal pages. New total about 130 hours with no margin. **Scheduled in D12 as 115 build hours against 120 available for five engineers, plus a bug-fix day on 6 October.** See `docs/launch-plan.md`. |
| D6c | The five holes in the interface design | **Four closed, one provisional.** The panel updates on form change rather than on chat turn. Widening arrives as a banner, narrowing applies but says what went. One form, two views, with a complete conflict rule. See `docs/interface-shape.md`. |
| D6 | Interface shape | **Settled for desktop.** Landing page, then a full-screen chat with no skip, then a side-by-side chat and listings view after 2 to 3 inputs. Listings update live. Minimal manual filters. See `docs/interface-shape.md`. |
| D6a | Mobile pattern for the split view | **Provisional.** Chat fills the screen, then shrinks to a bottom bar at 25% when listings appear, expanding to 60% on tap. Same mechanics as desktop. UI not final. |
| D6b | Where the login gate sits, and search | **Settled.** Login is needed only to see a listing's details and to contact anyone. Chat, split view and browsing are public. Area and filter pages are indexed and open the split view with filters applied and the form pre-filled. Blog lives at `roomsie.com/blog`. See `docs/seo-with-gated-products.md`. |
| D10 | What the assistant will discuss | **Five bands.** Adjacent questions are always answered, tiered by risk: general ones fall through to model knowledge with a hedge, consequential ones (law, tax, area safety, claims about a listing) are corpus-only and handed off rather than refused. Out of scope gets a one-line scripted redirect with no model call. Adversarial is scripted and logged. Sensitive is never redirected. Corpus to be seeded with ~30 articles before launch. See `docs/scope-policy.md`. |
| D9 | Abuse and cost limits on the pre-login chat | **Settled: both a turn cap and rate limits.** Five free-text turns, chip taps not counted, and the wall cannot appear before results have rendered. Listings stay visible when the chat gates. At the daily spend ceiling the assistant degrades to the zero-cost chip flow rather than failing. See `docs/pre-login-limits.md`. |
| D7a | Agent architecture | **Proposed: a router with small specialist handlers,** not multi-agent and not one big model. Two forms: a filter form driving SQL, and a structured profile form where every observation must quote the user. RAG only for consulting questions, over your own corpus, using Postgres full-text search rather than a vector store. See `docs/agent-architecture.md`. |
| D7 | Models | **Settled: DeepSeek V4.1 Flash for every role, Gemini Flash-Lite as fallback.** Sarvam dropped. Residency constraint dropped. Cost is register matching, mitigated at prompt level and measured in the eval. Marathi is the real language risk, not Hinglish. See `docs/model-selection.md` and `docs/research/hinglish-model-report.md`. |
| D8 | Verification | **Settled with one change.** Blurred cards for users who opt into verified-only, with mutual verification required, which makes the blur the conversion prompt. Blur must be server-side. **The manual Aadhaar upload route is dropped:** collecting Aadhaar copies is an offence and UIDAI is banning it. DigiLocker through a registered KYC provider is primary, with a non-Aadhaar government ID as the manual fallback. See `docs/verification.md`. |

---

## Product record

**`docs/product-base.html` is the one-page record of every product decision,** in the same format as `docs/source/tech-base.html`. Open it in a browser. Keep it in step with the tables above.

## Team plan

**Each person's list, in order, is in `docs/how-to-work.md`.** Every task with its done-when list is in `docs/team-plan.md`. Both follow `docs/team-plan.json`, which is the one place the plan is edited. Every task is mirrored as a GitHub issue, but the issues still carry the original `vertical:V1`–`V5` labels and milestones until they are relabelled.

**For the designer:** `docs/design-review.md` lists every behaviour engineering is building on, to confirm, change or defer.

**To see it visually,** open this repo as an Obsidian vault. Start at `docs/plan/roomsie launch.md`, then open the graph view or `docs/plan/Launch timeline.canvas`. Rebuild with `python3 tools/build-obsidian-plan.py` after editing `docs/team-plan.json`. That also regenerates `docs/team-plan.md`.

| Checkpoint | Date |
|---|---|
| CP0 Kickoff | Fri 25 Sep |
| CP1 Foundation | Mon 28 Sep |
| CP2 Core loop live | Thu 1 Oct |
| CP3 Feature freeze and go/no-go | Mon 5 Oct, 8 pm |
| CP4 Launch | Wed 7 Oct, fallback Fri 9 Oct |
| CP5 First-week review | Wed 14 Oct |

## Ready to start now

| Who | What | Blocked by |
|---|---|---|
| Marketing | Call Mumbai brokers to test the free-listing, paid-introduction model | Nothing |
| Marketing | Write the 30 corpus articles, `docs/content/corpus-plan.md` | Nothing |
| Designer | Resolve the V3 prototype palette against ADR 0011's Untitled UI pipeline | Nothing, and it blocks frontend work |
| Tech | Work the lanes in `docs/how-to-work.md` | Nothing |

---

## Deferred

| Item | State |
|---|---|
| The 10-section master launch document | **Deferred on 2026-09-23.** Every decision it needs is settled in the tables above. |
| The elevator pitch | Open. "Your agentic broker" proposed. Recommendation: use it as the investor and press line, and find a plainer line for users, because "broker" implies fees to renters and v0 has no property. |

## Deliverables for this session

A single unified master launch document, covering, in order:

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

Each is finalised interactively, one point at a time, before being written.

---

## Carried-over technical constraints that the AI pivot stresses

The existing stack was designed for a deterministic swipe app. An LLM agent
layer collides with it in specific places, and the technical document has to
resolve each:

- **No queue or message broker.** Background work runs in-process on one Fly
  machine. Multi-turn agent loops have nowhere durable to live.
- **No vector store.** ADR 0001 forbids proprietary extensions on the critical
  path, so adopting `pgvector` needs an explicit amendment.
- **No streaming.** The API boundary is contract-first: Zod parses every byte
  in, and a generated OpenAPI document is the source of truth for all clients.
  Token streaming does not fit that shape.
- **Realtime is capped.** Supabase Realtime `broadcast` only, 500 concurrent
  connections on Pro, then $10 per additional 1,000.
- **No inference vendor, key class, prompt-versioning or eval story** exists,
  and no line in the ~$50–80/month budget for one.
- **Data-residency posture is hostile to third-party inference.** ADR 0012
  rejected a vendor partly to avoid shipping a behavioural stream out; ADR 0014
  mandates PII scrubbing. Sending conversation content to an external model
  needs a decision that engages that reasoning directly.

Sanctioned hooks that help: ADR 0004 explicitly allows a separate ML service
called from the API; ADR 0012 already designates the analytics store as a
training corpus; ADR 0014's `reportError` wrapper is the documented precedent
for hiding a swappable vendor behind one internal module.

---

## Repo layout

The top level is fixed by ADR 0003 and ADR 0010. Inside `apps/` is a proposal
mapped to the tasks that build it. T-02 creates it, and whoever owns T-02 may
adjust names inside an app without asking. Anything marked with a task code
does not exist yet.

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
│   │   ├── components/         UI in the V3 prototype's look             ADR 0011 exception
│   │   └── lib/                API client typed from packages/contract, Firebase sign-in, reportError
│   └── api/                    Fastify · Zod · Drizzle → Fly.io Mumbai
│       ├── src/
│       │   ├── server.ts
│       │   ├── plugins/        auth (verifies the Firebase JWT), rate limits,
│       │   │                   invite gate, error reporting              T-05 T-21 T-33 T-07
│       │   ├── routes/         chat, matches, profiles, photos, connections,
│       │   │                   reports, account, waitlist, events        T-14 T-16 T-18a T-19 T-20 T-24
│       │   ├── assistant/      model wrapper, extractor, reply writer,
│       │   │                   scope rules, turn cap and spend ceiling   T-11 T-12 T-13 T-21
│       │   ├── match/          the match query                           T-14
│       │   └── db/             Drizzle schema and client                 T-06
│       ├── drizzle/            generated SQL migrations                  ADR 0006
│       ├── eval/               eval sentences and the runner             M-03 T-27
│       ├── Dockerfile
│       └── fly.toml                                                      T-04
├── packages/
│   ├── contract/               Zod: Form A, every API route, analytics
│   │                           events. OpenAPI is generated from it      T-08 · ADR 0004 0012
│   └── config/                 shared tsconfig and ESLint                ADR 0010 0013
├── docs/
│   ├── how-to-work.md          each person's list, in order, and the code index
│   ├── design-review.md        behaviour decisions for the designer
│   ├── product-base.html       the product record
│   ├── team-plan.json          the plan's data. Edit this, then run the builder
│   ├── team-plan.md            generated from team-plan.json
│   ├── plan/                   the Obsidian view, generated
│   ├── *.md                    decision notes: interface, agent, models, scope, limits, SEO, verification
│   ├── research/ · content/    market research and the article corpus plan
│   └── source/                 vendored inputs: ADRs, tech base, V3 prototype, deprecated PRD
├── tools/
│   └── build-obsidian-plan.py  rebuilds docs/plan/, .obsidian/graph.json and docs/team-plan.md
├── .github/workflows/ci.yml    typecheck, lint, build, secret scan       T-03
├── .obsidian/                  vault settings; the graph shows docs/plan
├── package.json · pnpm-workspace.yaml · turbo.json                       T-02 · ADR 0010
├── CLAUDE.md                   agent entry point
└── CONTEXT.md                  this file
```

**Deliberately not in v0:** a mobile app (the auth path already allows one), a
separate analytics database (ADR 0012 exception: one events table for now), the
router, observer and advisor (v1), and a vector store (matching is a SQL query).

## Conventions

- Update the decision tables above whenever something is settled. The tables,
  not the transcript, are the citable record.
- **Remote Control stays off.**
- **Never push to `main`.** Every change reaches the repo as a pull request.
- **Write in simple, crisp English.** Short sentences. Plain words. This
  applies to every document in this repo.
- Repo is **private**. Its history still holds the old session transcript, which
  contains personal data.

---

## What the V3 prototype already establishes

`docs/source/roomsie-prototype-V3.html` is a 23-surface clickable desktop
prototype, and it is considerably further along than the deprecated PRD. It
already carries the roomsie name, is already Mumbai-only, and has already
abandoned the swipe stack. Treat it, not the PRD, as the pre-pivot baseline.

**Things it settles that the pivot should probably keep:**

- **Grid, not stack.** Both flats and flatmates render in one responsive card
  grid with a sticky filter rail. No swiping anywhere.
- **The three-state chip.** Sixteen lifestyle chips across nine axes. One tap
  means prefer, two means dealbreaker, three turns it off. A failed dealbreaker
  hides the item entirely and is surfaced as "N hidden by your dealbreakers".
- **The nine-axis lifestyle vocabulary** — kitchen, smoking, alcohol, guests,
  pets, hours, tidiness, at-home vibe, daytime presence. Each is used three
  ways: as a fact about you, as a want with a weight, and as a filter.
- **Intent as the first question.** Four cards: a flat and flatmates, just a
  flat, just a flatmate, renting out a flat. This maps exactly onto the intents
  the AI interview has to disambiguate.
- **Lazy registration.** Nothing is asked up front. Auth, phone and face check
  are triggered by the first message or the first publish, not by signup.
- **Match score** = 100 with no preferences set, otherwise 70 plus 30 times the
  fraction of preferences hit.
- **Design language** — warm cream and paper, pink `#FF87AC` primary, yellow
  `#FBDF8E` secondary, Bricolage Grotesque display over Plus Jakarta Sans body,
  light-first with full dark mode.

**Things the all-genders decision (D1) invalidates in it:** every women-only
string, the "For women. By women" hero, the "Only women see this" reassurance
in the post wizard, and the safety argument those carry. Replacing them needs a
new trust story, which the product scope section has to supply.

**Things it leaves unbuilt** that matter to planning: no OTP screen, no working
message composer in an existing chat, no photo upload, no persistence, no
reporting or blocking, no notifications, no settings, no search, no map, and
the privacy visibility toggles do nothing. The listing description is collected
and then discarded.

Note the tension with the design-system ADR: the prototype's palette and fonts
are not Untitled UI, and ADR 0011 makes Figma the single source of truth with a
generated `theme.css`. Whether the prototype's look becomes the design system,
or gets rebuilt inside Untitled UI, is an unresolved question.
