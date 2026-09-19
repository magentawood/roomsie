> ## ⚠️ DEPRECATED — do not use as a source of requirements
>
> **Status: deprecated as of 2026-09-14.** This document contains superseded
> rules and is kept only for history. It is **not** a reference for product or
> UI decisions, and agents must not cite it.
>
> Notably superseded: femmeflats is **light-first**, matching Untitled UI — not
> dark-first as written below. The brand palette, typography and gesture
> decisions here are also out of date.
>
> Architecture decisions live in `docs/decisions/`. Design system rules live in
> `design/` and `tooling/frontend-kit/`.

---

# femmeflat — Product Requirements Document

**Status:** ~~Draft v0.1~~ **DEPRECATED** · **Date:** 24 Aug 2026 · **Owner:** Yash Mangal

> A women-only platform for finding flatmates and flats. Dating-app discovery
> mechanics applied to shared living.

---

## 1. Problem & Positioning

Women looking for shared housing face two bad options: general listing sites
(Facebook groups, 99acres, NoBroker) where the counterparty is unknown and
unvetted, and word-of-mouth, which doesn't scale. Neither surfaces the thing
that actually determines whether a flatshare works — **lifestyle compatibility**.

femmeflat treats flatmate discovery the way dating apps treat partner
discovery: a rich preference profile, a ranked queue, and a low-friction
accept/reject gesture. Alongside it, a conventional listings marketplace for
flats, PGs and broker/owner inventory.

**What we are:** a compatibility-first, verified, women-only discovery platform
for flatmates and flats.

**What we are not:** a dating app, a general classifieds board, or a brokerage.

**Who we are for:** women aged ~20–35 — students, early-career professionals,
recent movers — searching in metro markets.

### 1.1 The two halves

| | Flatmate discovery | Property listings |
|---|---|---|
| Content | User profiles | Flats / PGs / rooms |
| Supply | Other users | Owners, brokers, PG operators |
| Interaction | Swipe (stack) | Grid + scroll |
| Outcome | Bookmark → chat | Enquiry → chat |

The asymmetry in interaction model is deliberate — see §7.

---

## 2. Naming & Brand

The product name is **femmeflat**. The Stitch design exports currently carry the
placeholder brand **"Velvet & Ember"** — this must be replaced throughout before
any external use.

The design language from `DESIGN.md` is adopted as-is:

- **Palette:** ink-black base (`#0F0F10`), Electric Rose primary (`#FF5169` /
  `#FFB2B6`), Solar Orange secondary, Amethyst tertiary
- **Type:** Manrope (display/body), JetBrains Mono (metadata labels, chips)
- **Style:** dark-first, glassmorphic, rounded (8px / 16px / 24px), neon-tinted
  shadows
- Light mode is a first-class alternative, not an afterthought (§9.3)

Hero copy candidates: *"Find your perfect ___"* rotating through
**flatmate · roomie · vibe · wanderer**.

---

## 3. Success Metrics

### 3.1 Instrumentation spec

This is the analytics backbone. Every card that reaches the top of the stack
emits a lifecycle, not a single event.

| Event | Definition | Why |
|---|---|---|
| `card_impression` | Card rendered at top of stack | Denominator for everything |
| `card_true_view` | Top-of-stack, tab focused, **≥ 1000ms** continuous | Filters out reflex-flicking; the real "was this considered" signal |
| `card_dwell` | Accumulated ms top-of-stack **and** document focused | Interest intensity. Pauses on blur/background |
| `card_deep_view` | Flipped to rapid-fire, opened full profile, **or** advanced past photo 1 | Distinguishes curiosity from decision |
| `card_decision` | `accept` \| `reject` \| `skip`, with `target_user_id`, dwell, deep-view flag, photo index reached | Who was accepted, who was rejected — the core training signal |

**Dwell must be focus-aware.** Use `visibilitychange` + `blur`/`focus` to pause
accumulation, or a backgrounded tab reports a 40-minute dwell.

**On write volume** — you flagged that constant notification increases disk I/O,
and it's a fair concern. Do not write per-event. Buffer events client-side and
flush:
1. on decision (the meaningful boundary),
2. every ~10s while active,
3. on `visibilitychange → hidden` via `navigator.sendBeacon`.

Write raw events append-only to an analytics store, not to the primary
transactional DB. Aggregate on read.

### 3.2 North-star and guardrails

- **North star:** conversations started per active searcher per week
- **Activation:** % of signups completing rapid-fire + reaching the stack
- **Quality:** accept rate (target a healthy 10–30% — >50% means the queue is
  undifferentiated, <5% means ranking is bad)
- **Retention:** D7 / D30 return rate
- **Guardrail:** reports per 1,000 messages; block rate

---

## 4. Authentication & Onboarding

### 4.1 Sign-in

Google Sign-In only for v1. One button serves both login and registration — the
OAuth response indicates whether the account already exists; new accounts fall
through to registration, existing accounts land in the app.

**Rationale:** zero typing, no password reset flow, trustworthy identity anchor.

**Consequence to plan for:** Google gives us no gender signal. See §4.4.

### 4.2 Guest browsing and the gate

Logged-out visitors can enter the app and browse in a limited mode. Gate on
whichever comes first:

- **5 profile cards swiped**, or
- **90 seconds** in the stack

Gating shows a soft wall: the next card is blurred behind a sign-in prompt.
Property listings stay browsable longer (they're the SEO surface) — gate the
**enquiry** action rather than the browsing.

### 4.3 Registration flow

Revised per the 19 Aug design notes: **quiz first, typing last.** The rapid-fire
is the most engaging part and the least effortful; front-loading it converts
better than front-loading a form. Named fields go at the end, when the user is
already invested.

**Step 1 — Rapid fire** (all tap/slider, zero typing, one question per screen
with a progress bar):

| # | Question | Input |
|---|---|---|
| 1 | Sleep cycle | Early bird ↔ Night owl (3-point) |
| 2 | Working hours | WFH / Office / Hybrid / Student / Shifts |
| 3 | Diet | Veg / Non-veg / Eggetarian / Vegan |
| 4 | Alcohol | Never / Socially / Regularly |
| 5 | Smoking | Never / Socially / Regularly |
| 6 | Fitness | Not my thing ↔ Gym daily |
| 7 | Social energy | Quiet home ↔ People over often |
| 8 | Party | Rarely ↔ Every weekend |
| 9 | Cleanliness | Relaxed ↔ Spotless |
| 10 | Music at home | Headphones ↔ Speakers on |
| 11 | Budget band | Slider, ₹ range |
| 12 | Home state / roots | Chip select |

**Step 2 — Search intent:** city + locality (chip/map select, not free text),
move-in timing, and *"I have a flat"* vs *"I'm looking for a flat"* — this flag
materially changes ranking.

**Step 3 — Identity** (the only typed screen): full name, DOB, phone.
- **Zodiac is derived from DOB** — never ask for it separately. Zero extra taps.
- Phone requires OTP verification and is **never displayed** to other users.

**Step 4 — Work/study:** company or college, via autocomplete against a seeded
list. Displayed as a trust signal.

**Step 5 — Profile photo:** optional but strongly nudged ("profiles with photos
get 4× more chats").

**Step 6 — Selfie verification:** optional here, with benefits stated explicitly
(verified badge, appear in others' queues, unlock chat). See §4.4.

**Step 7 — Profile preview:** "Here's how your profile looks" — the finished
card, flippable, with an edit affordance. Confirming lands the user in the
stack.

### 4.4 ⚠️ Gender verification — open gap

**This is the most important unresolved item in the spec.** The product's entire
promise is "women-only", but the flow as written has no mechanism that enforces
it: Google Sign-In carries no gender, and selfie verification is optional. As
specified, any man can complete registration and enter the queue.

Recommended resolution — **verification gates participation, not browsing**:

| Action | Unverified | Verified |
|---|---|---|
| Browse stack & listings | ✅ | ✅ |
| Appear in others' queues | ❌ | ✅ |
| Initiate a chat | ❌ | ✅ |
| Bookmark | ✅ | ✅ |

This keeps signup friction low while making the core promise real. Verification
= selfie with liveness check, auto-screened, with human review on the
low-confidence band and a clear appeals path. Budget for false rejections —
they will be experienced as a personal insult, so the appeal must be fast and
gracious.

---

## 5. Discovery — the profile stack

### 5.1 Queue model

Every (viewer, target) pair carries a status:

```
unseen → seen_undecided → { accepted | rejected }
```

**Rejection is soft.** A rejected profile moves to the end of the queue rather
than disappearing. **This needs a guard**: without one, users cycle the same
faces forever and the product feels broken. Recommended rule:

- Rejected profiles re-enter only after the unseen pool is exhausted
- Track `reject_count`; after **3** rejects, suppress for 90 days
- Never resurface within the same session

**Acceptance is one-sided bookmarking**, not a mutual match. Accepting adds the
profile to *Liked* and notifies no one in v1.

The main page offers segment filters: **New · Unviewed · Passed · All**.

### 5.2 Ranking

v1 is a heuristic score, not ML — there's no data yet:

```
score = 0.35 · location_overlap
      + 0.25 · budget_overlap
      + 0.25 · lifestyle_compatibility   (weighted rapid-fire distance)
      + 0.10 · recency_of_activity
      + 0.05 · profile_completeness
```

Weight deal-breakers (diet, smoking, sleep cycle) higher than soft preferences
(music, zodiac) inside `lifestyle_compatibility`. Once `card_decision` volume
accumulates, replace with a learned model.

### 5.3 Profile card — front

Full-bleed photo with a bottom gradient scrim carrying:

```
┌────────────────────────┐
│  [✓ Verified]          │  ← top-left chip
│                        │
│        (photo)         │
│                        │
│  ● ● ○ ○               │  ← photo dots
│  Sarah M.  ✓    24     │
│  📍 Bandra West        │
│  ₹18k–25k              │
└────────────────────────┘
```

Four data points, nothing more. Minimal by design.

### 5.4 ⚠️ Double-tap flip — feasibility analysis

You asked for a real assessment on both axes. Verdict: **the flip is worth
building; the double-tap trigger is not.**

**Technical — straightforward.** CSS `transform: rotateY(180deg)` with
`transform-style: preserve-3d` and `backface-visibility: hidden` is
GPU-composited and cheap. Not the problem.

**The problems are gestural, and there are four:**

1. **Double-tap already means "like".** Instagram trained a billion people that
   double-tap = love. In a swipe-to-accept context that expectation is at its
   strongest. Users will double-tap expecting to like and get a flip instead.
2. **It collides with your own photo-swipe.** The 19 Aug notes also want
   swipe-through-photos on the card. Horizontal swipe cannot mean both
   *reject* and *next photo*.
3. **Double-tap costs a 250–300ms delay** on every single tap, because you must
   wait to see whether a second tap arrives. Every tap interaction on the card
   feels laggy. It's also the browser's native zoom gesture — needs
   `touch-action: manipulation` to suppress.
4. **It's invisible and inaccessible.** No affordance signals it exists, and
   double-tap *is* the VoiceOver activation gesture — screen reader users
   cannot perform it at all.

**Recommended gesture map** — resolves every collision:

| Gesture | Action |
|---|---|
| Swipe left | Reject → end of queue |
| Swipe right | Accept → Liked |
| **Swipe up** | **Flip to rapid-fire back** |
| Tap left/right third | Previous / next photo |
| Double tap | Accept (matches Instagram muscle memory — optional, redundant) |
| Tap ⓘ button | Flip (visible affordance + a11y fallback) |

Swipe-up-for-detail is already learned behaviour from Tinder and Instagram
Stories, and it's discoverable via a small chevron hint.

**Layout — the density problem is real.** The back must not show all 12
rapid-fire attributes. On a ~340×520px card, twelve labelled chips is a wall of
text at 11px — cluttered and unreadable, exactly what you were worried about.

Comfortable capacity: **6–8 chips at two per row**, ~44px tall, 8px gaps.

So curate. Show the **6 attributes with the highest signal *relative to the
viewer***, split into agreement and friction:

```
┌────────────────────────┐
│  Sarah M., 24      ⓘ   │
│  Creative Director     │
│  ──────────────────    │
│  YOU BOTH              │
│  🌙 Night owl          │
│  🥗 Vegetarian         │
│  ✨ Spotless           │
│  ──────────────────    │
│  HEADS UP              │
│  🎉 Parties more       │
│  🚬 Smokes socially    │
│  ──────────────────    │
│  ₹18k–25k · Bandra     │
│  [   Message   ]       │
└────────────────────────┘
```

This is better product *and* it solves the density problem — surfacing
compatibility is more useful than dumping attributes, and it fits.

**One constraint:** the back face must match the front's height exactly.
Scrolling inside a flipped card re-collides with the swipe handler. Fixed height,
curated content, no scroll.

---

## 6. Liked / Bookmarked

Accepted profiles land here. Because acceptance is one-sided and chats are open,
this is a **shortlist**, not a match list — the copy should say so.

Recommended display: **2-column grid** of compact cards (photo, name, area,
budget, last-active dot). Grid over list because the photo is the primary recall
cue.

Per-card actions: message, unlike, view. Sort by recently added / last active /
compatibility. Include a *Passed* tab reading from the same store, so a
misfire is recoverable.

---

## 7. Property listings

### 7.1 Swipe vs. scroll — decision

**Grid + scroll for properties. Swipe stack for people.** Your reasoning holds:
property search is a hawkeye task — the user wants comparison across options,
which a one-at-a-time stack actively prevents. People search is an
evaluation task where sequential presentation and a dopamine loop genuinely
suit the GenZ audience you're targeting.

The 50/50 grid-vs-swipe experiment is **deferred** until there's enough traffic
to power it — correct call. Note the threshold explicitly: **~1,000 weekly
active searchers** before the split test is worth running.

### 7.2 Listing model

Supply from owners, brokers and PG operators. Each listing carries: photos,
rent, deposit, locality, room type (private/shared), furnishing, gender policy,
amenities, available-from, and current flatmate count.

**Listers must be verified separately from users.** A broker account entering a
women's safety platform is a risk vector — require business/ID verification and
badge listings by source (Owner · Broker · PG). Never mix lister accounts into
the people stack.

Grid supports filters: locality, rent range, room type, furnishing,
available-from, PG vs flat.

---

## 8. Chat

### 8.1 v1: open chat

Per the brief, chat is open to all verified users initially — no match gate.
Rationale is sound: a cold-start marketplace cannot afford a mutual-match
requirement, and open chat drives engagement.

Planned evolution: cap free chats per week, or gate chat on acceptance, once
liquidity allows.

### 8.2 ⚠️ Open chat is the platform's biggest safety risk

Open DMs on a women-only platform means any verified account can message any
other unsolicited. That is exactly the dynamic the product exists to escape, and
if it goes wrong it damages the brand fatally. Ship v1 with open chat as
planned, but **not without these**:

- **Message requests** — first message from a non-bookmarked user lands in a
  Requests tray, not the main inbox. Reply promotes to a real thread. This
  preserves open chat while removing the intrusion.
- **Rate limit** — max ~10 new conversations initiated per user per day
- **Block & report** on every surface, one tap, no confirmation friction
- **Auto-suspend** on report-rate threshold, pending review
- **No contact details in first message** — strip/flag phone numbers and
  handles until both parties have exchanged messages
- Verification required to initiate (§4.4)

Together these keep the engagement benefit and remove most of the abuse surface.

---

## 9. Navigation & shell

### 9.1 Primary nav

Four destinations. Bottom tab bar on mobile, top bar on web:

| | Destination |
|---|---|
| 🏠 | Home / stack |
| 🏢 | Properties |
| 🔖 | Liked |
| 💬 | Chats |

Profile/edit sits behind the avatar (top-right on web, in the hamburger on
mobile) rather than consuming a fifth tab.

### 9.2 Hamburger / settings

About us · Contact us · Safety centre · **Appearance (dark/light/system)** ·
Notification preferences · Blocked accounts · Privacy & terms · Delete account
· Log out

### 9.3 Filters

The stack needs a filter sheet: locality (multi), budget range, age range,
move-in window, has-flat vs looking, verified-only, and rapid-fire deal-breakers
(diet, smoking, sleep cycle). Applied filters show as removable chips above the
stack, with a live result count.

---

## 10. Landing page

### 10.1 Structure

1. **Hero** — dome/arc glow, headline, subtext, search
2. **Search bar + quick search** — per Image 2 (`Screenshot 2026-08-19 at
   8.13.06 PM`): centred glass pill, *"Where do you want to live?"*, geolocate
   icon, gradient Search button; beneath it `QUICK SEARCH:` in JetBrains Mono
   caps followed by four city links
3. **Verified matches** — 4-up grid on web, **horizontal carousel on mobile**
4. **What we are / what we're not** — two-column contrast block
5. **Who we're for** — persona cards
6. **How it works** — 3 steps
7. **Testimonials**
8. **FAQ** — accordion
9. **Footer** — privacy, terms, safety guide, support

### 10.2 Hero text — unified across breakpoints

Per your note, mobile and web carry the **same** hero. Both get the vertical
fade-in/fade-out word rotator:

```
        Find your sanctuary.
     Find your perfect ⟨flatmate⟩
                        ⟨roomie⟩
                        ⟨vibe⟩
                        ⟨wanderer⟩
```

Rotator spec: ~2.2s per word, 400ms cross-fade with a 12px vertical
translate, `prefers-reduced-motion` disables rotation and pins the first word.
Reserve a fixed-width container sized to the longest word so the line doesn't
reflow.

### 10.3 Open question — mobile reference

Your notes say the mobile version should follow **Image 2**, then say of
**Image 3** *"this looks better for mobile, just get rid of bottom nav."*
Those conflict, and neither image is on disk. Flagging for resolution.

---

## 11. Proposed additions

Components and mechanics that fit the model, offered for consideration:

- **Compatibility ring** — a small percentage arc on each card, computed from
  rapid-fire distance. Makes ranking legible and gives a reason to swipe right
  beyond the photo. High impact, low cost.
- **Deal-breaker pills** — let users mark 2 rapid-fire answers as
  non-negotiable; hard-filter the queue on them. Directly serves the "minimal
  typing, high signal" goal.
- **"Looking together" pairs** — two friends searching as a unit is extremely
  common in this market and no competitor handles it. Differentiator.
- **Move-in timeline chip** — "Needs a place by 1 Oct". Urgency alignment is a
  strong practical filter that lifestyle matching misses entirely.
- **Locality heat chips** — show how many active searchers per locality, so
  users search where there's supply.
- **Empty-stack state** — when the queue drains: widen radius, relax filters, or
  notify-me. This state *will* be hit constantly at launch and needs real design.
- **Safety centre** — a genuine content surface, not a footer link. It's the
  brand promise made concrete.
- **Profile strength meter** — nudges completion without a nagging modal.

---

## 12. Risks & open questions

| # | Item | Severity |
|---|---|---|
| 1 | **No gender verification enforcement** (§4.4) — the core promise is unenforced as specified | 🔴 Critical |
| 2 | **Open chat abuse surface** (§8.2) — mitigations required before launch | 🔴 Critical |
| 3 | **Cold start** — a discovery product with no users has nothing to discover. Needs a seeding strategy: launch one city, one campus/neighbourhood at a time | 🔴 Critical |
| 4 | Rejected-profile recycling without a cap makes the queue feel broken (§5.1) | 🟠 High |
| 5 | Photo-swipe vs. reject-swipe gesture collision (§5.4) | 🟠 High |
| 6 | Broker/PG accounts as a risk vector (§7.2) | 🟠 High |
| 7 | Selfie-verification false rejections need a fast, gracious appeal path | 🟡 Medium |
| 8 | Mobile landing reference conflict — Image 2 vs Image 3 (§10.3) | 🟡 Medium |
| 9 | Monetisation undefined. "Cap free chats later" implies a paid tier; the "after payment" design note implies the same. Needs a model | 🟡 Medium |
| 10 | Ghost-profile cleanup: 30 days is aggressive — flat searches run for weeks. Suggest deprioritise at 30d, hide at 60d, **never delete**; reactivate on login | 🟡 Medium |

### 12.1 ⚠️ Auto-posting profiles to Reddit/Facebook — do not build

The note proposes an agent that auto-posts profiles arriving on the platform to
Reddit and Facebook. **This should not ship in any form that involves real user
profiles.** Publishing a woman's photo, age, locality and budget to public
social platforms without per-post consent is a serious privacy and physical
safety harm, is irreconcilable with the product's own safety promise, likely
breaches Indian data protection obligations around purpose limitation, and
violates both platforms' automation policies.

The constructive version: auto-post **purpose-made marketing creative** —
anonymised aggregate signals ("37 women searching in Koramangala this week"),
listings the *lister* consented to syndicate, or original brand content. That
gets the growth benefit with none of the harm.

---

## 13. Scope

**v1 (launch):** Google auth · rapid-fire onboarding · selfie verification ·
profile stack with accept/reject · flip card · liked shortlist · open chat with
message requests · property grid with filters · landing page · light/dark ·
analytics instrumentation

**v1.1:** compatibility ring · deal-breaker pills · filters v2 · empty-stack
states · safety centre

**v2:** learned ranking · looking-together pairs · chat monetisation ·
grid-vs-swipe experiment for properties · notifications

---

## Appendix A — Source material

| Asset | Location | Notes |
|---|---|---|
| Design system | `~/Downloads/s1/DESIGN.md` | Identical across all 6 exports |
| Desktop discovery (search-led) | `~/Downloads/s1/` | |
| Desktop discovery (city tabs) | `~/Downloads/s2/` | dup: `(1)`, `(3)` |
| Mobile discovery | `~/Downloads/s3/` | dup: `(2)` |
| Image 2 — web search bar | `~/Desktop/Screenshot 2026-08-19 at 8.13.06 PM.png` | Confirmed reference |
| Image 1, Image 3 | Notion only | Not on disk |

Brand in all exports is the placeholder **"Velvet & Ember"** — replace with
**femmeflat**.
