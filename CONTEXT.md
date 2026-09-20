# roomsie — working context

Read this first. It is the running state of the planning session, kept current
so that anyone (or any agent) picking the repo up knows where things stand
without replaying the whole transcript.

**Last updated:** 2026-09-19 · **Owner:** Yash Mangal · **Org:** magentawood

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
| D3 | Where listing supply comes from at launch | **Deferred pending broker interviews.** Working hypothesis: brokers list free, roomsie charges for a qualified introduction. See `docs/research/supply-and-broker-model.md`. To be validated by calling Mumbai brokers. |
| D3a | Flatmate matching design | **Active track.** Being worked in parallel, because it is substantially independent of D3. |
| D3b | What the AI interview adds over the chip filters | **Settled: both.** It surfaces what chips cannot capture, and it consults and pushes back. A structured form runs alongside the whole chat session; contradictions are confirmed with the user rather than silently overwritten. |
| D3c | Exclusionary preferences | **Settled: record what the user states,** including community and religion, and filter on it. Mitigations retained: never infer, never suggest, keep them out of any learned ranking, filter server-side. See `docs/ai-agent-design.md` section 4.1. |
| D3d | Whether a published listing may carry identity restrictions in visible text | **Open.** Separated from D3c because an advertisement is a different position from a private filter. |
| D4 | Monetisation model and pricing | Pending, follows D3 |
| D5 | Team and budget | **Settled: 4 tech, 2 marketing, 1 designer.** Self-funded, keep spend low and quality high. Hours per person still unknown, which is what blocks the timeline. See `docs/cost-and-team.md`. |
| D6c | The five holes in the interface design | **Four closed, one provisional.** The panel updates on form change rather than on chat turn. Widening arrives as a banner, narrowing applies but says what went. One form, two views, with a complete conflict rule. See `docs/interface-shape.md`. |
| D6 | Interface shape | **Settled for desktop.** Landing page, then a full-screen chat with no skip, then a side-by-side chat and listings view after 2 to 3 inputs. Listings update live. Minimal manual filters. See `docs/interface-shape.md`. |
| D6a | Mobile pattern for the split view | **Provisional.** Chat fills the screen, then shrinks to a bottom bar at 25% when listings appear, expanding to 60% on tap. Same mechanics as desktop. UI not final. |
| D6b | Where the login gate sits, and search | **Settled.** Login is needed only to see a listing's details and to contact anyone. Chat, split view and browsing are public. Area and filter pages are indexed and open the split view with filters applied and the form pre-filled. Blog lives at `roomsie.com/blog`. See `docs/seo-with-gated-products.md`. |
| D9 | Abuse and cost limits on the pre-login chat | **Open.** The interview now runs before login, so anyone can spend the inference budget. |
| D7a | Agent architecture | **Proposed: a router with small specialist handlers,** not multi-agent and not one big model. Two forms: a filter form driving SQL, and a structured profile form where every observation must quote the user. RAG only for consulting questions, over your own corpus, using Postgres full-text search rather than a vector store. See `docs/agent-architecture.md`. |
| D7 | Model vendor and data residency | **Residency constraint dropped:** inference may run anywhere. Choice pending an eval. Lean is DeepSeek V4.1 Flash or Gemini Flash-Lite for extraction, and **Sarvam for the composer**, because register matching is its strength and latency rules it out of the interaction loop. Marathi is the real language risk, not Hinglish. See `docs/model-selection.md` and `docs/research/hinglish-model-report.md`. |
| D8 | Verification and trust-and-safety stance | Pending |

---

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

```
roomsie/
├── CONTEXT.md              this file — running state
├── CLAUDE.md               agent entry point
├── docs/
│   ├── source/             vendored inputs (deprecated PRD, ADRs, tech base, prototype)
│   └── …                   the master launch document, as it is written
├── session/
│   ├── SESSION_ID          the Claude Code session id
│   ├── README.md           how to resume the session on your machine
│   └── transcript/         the conversation itself
└── tools/
    ├── resume-session.sh   install the session locally
    └── sync-session.sh     save session progress back to the repo
```

## Conventions

- The session is part of the deliverable. Run `./tools/sync-session.sh` and
  commit `session/transcript/session.jsonl` alongside any document change.
- Update the decision tables above whenever something is settled. The tables,
  not the transcript, are the citable record.
- **Remote Control stays off.** Session sharing is file-based, through this
  repo, and nothing else.
- **Write in simple, crisp English.** Short sentences. Plain words. This
  applies to every document in this repo.
- Repo is **private**. The transcript contains personal data.

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
