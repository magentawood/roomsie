# For the designer — decisions we are about to lock

**Date:** 2026-09-25 · **Updated:** 2026-09-26, launch now Mon 12 Oct · **For:** whoever owns design · **From:** engineering

---

## Why you are reading this

We are building for a fortnight before your designs arrive. Roughly 80 of the
115 engineering hours don't need a picture to start — the database, the sign-in,
the AI, the matching.

**But "doesn't need a design" is not the same as "no design decisions in it."**

Every one of those tasks quietly assumes something about how the product
behaves: how many questions the assistant asks, what a profile contains, when
results appear, what happens on a phone. We have already made those calls,
because we had to in order to start. They are written down below.

If you disagree with one, **the cost of changing it depends entirely on when
you tell us.** Today most of them are free. In ten days some of them are the
launch date.

This document is not asking you to approve visuals. It is asking you to
confirm, change, or defer **behaviour**, so we don't build a fortnight of the
wrong thing.

---

## How to answer

Against each numbered item, write one of:

- **OK** — build it as described.
- **CHANGE** — and say what to. We will tell you same day what it costs.
- **LATER** — you want it different eventually, but not before launch.

You do not need to answer all of them at once. Answer them in deadline order;
the table below is sorted that way.

---

## What it costs to change something

| | Meaning |
|---|---|
| 🟢 **Free** | Change whenever. Nothing is built on it. Styling, colour, copy, spacing, icons, card layout, imagery — all free, always. |
| 🟡 **Costly** | Roughly a day or two of rework if you change it after its build date. Annoying, survivable. |
| 🔴 **Structural** | Other work is stacked on top. Changing it after its date means dropping something else to keep 12 October. |

---

## Deadlines, in order

| By | What must be settled | Why |
|---|---|---|
| **Now** | §1 The conversation's questions, and §6.3 the launch look | The contract is the first thing built, and the styling decision gates every design. |
| **Sun 27 Sep** | §2 What we store about a person | The schema is committed Sunday night. Migrations after that are painful. |
| **Tue 29 Sep** | §3 How the assistant behaves | The reply writer is built Wed–Thu. |
| **Wed 30 Sep** | §4 How results appear and update | The match query and results panel start Thursday. |
| **Wed 30 Sep** | §5 Mobile — **still unresolved** | The biggest open question in the product. |
| **Wed 30 Sep** | Designs D-02, D-03, D-04 finished | Five people start building screens on Thursday 1 October. |

---

# §1 · The conversation's questions — 🔴 structural, needed now

This is the single most expensive thing on the list. Everything — the database,
the AI extraction, the matching, the profile screens — reads from one shared
definition of *what we ask a person*. Add or remove a question later and all
four change together.

**1.1 — The form has exactly these fields.** Intent, areas, budget, move date,
room type, and nine lifestyle answers: smoking, alcohol, guests, pets, hours,
tidiness, at home, daytime and kitchen. Nothing else. 🔴

> **If you add a flow** — say, "do you have pets?" as its own step — it is not
> one new question. It is a migration, a contract change, a re-tuned extraction
> prompt and a new filter. **Tell us before Sunday and it's an hour. After, it's
> a day and a half.**

**1.2 — Intent is one of the prototype's four cards:** a flat and flatmates,
just a flat, just a flatmate, or I'm renting out a flat. 🔴

> **This clashes with a settled decision, and it needs you first.** Decision PD0
> says v0 is flatmate matching only, with no property listings. Two of the four
> cards — *just a flat* and *I'm renting out a flat* — are about property. Either
> they are hidden for launch, or they lead somewhere that does not exist yet.
> **Tell us which cards ship on 12 October.**

**1.3 — The first three turns are chips, not typing.** Intent, area and budget
are closed questions, so we show tappable options. 🟡

**1.4 — Budget is bands, not a slider.** Under 15k, 15–20k, 20–25k, above 25k.
Chosen because bands are faster on a phone. 🟡

**1.5 — Areas are multi-select**, showing the top five or six as chips plus
"somewhere else" which opens a search. 🟡

**1.6 — Every question can be answered "unclear."** The assistant is allowed
not to know. 🟢

**1.7 — Typing beats tapping.** Someone who types "2bhk in Powai under 25k from
October" fills four fields at once and skips ahead. The chips are a floor, not
a cage. 🟡

**1.8 — Some preferences are never offered as chips.** If someone raises
community or religion, we record it and filter on it. We never suggest it, never
ask about it, and never infer it from a name, a diet or an area. This is
settled (PD3c), so it is not up for review, but it limits what the chips may
show. 🔒

---

# §2 · What we store about a person — 🔴 structural, by Sun 27 Sep

The database is committed Sunday night. It is the hardest thing on this list to
change afterwards, because real data starts landing in it the following week.

**2.1 — A profile holds:** name, age, work, intent, budget, areas, move date,
and the nine lifestyle answers. 🔴

**2.2 — Each lifestyle answer is marked "prefer" or "dealbreaker."** A
dealbreaker filters people out; a preference only affects ranking. 🔴

> This is a product decision wearing a database costume. If you think people
> should rank preferences instead, or weight them on a scale, say so now.

**2.3 — Up to four photos per person.** 🟡

> Four is a guess. Six is free to change today, and a day of work in October.

**2.4 — We store anonymous sessions and what people type**, so someone can chat
before signing up and keep that conversation when they do. The typed messages
are kept, and deleted with the account. Should the chat say so up front? 🟡

**2.5 — Reports, blocks and a waitlist are first-class**, not bolted on. 🟢

**2.6 — The assistant keeps notes about each person.** The observer turns what
people say into notes, like "partner stays over most nights", and every note
carries the person's exact words. **Can people see and correct these notes, and
where?** On the profile, in the chat, or nowhere at launch? This shapes the
profile screens (D-03), so it's needed by Wed 30 Sep. 🔴

---

# §3 · How the assistant behaves — 🟡 by Tue 29 Sep

**3.1 — It answers housing questions rather than refusing.** Ask it what
semi-furnished usually includes, or what a deposit normally runs to. It answers
from roomsie's own articles first, naming the article. If they don't cover it,
a signed-in person gets an answer from a web search, and a visitor gets a plain
hedged answer. Law, tax, area safety and claims about a person are never
answered from the web: articles only, or handed off. Should a web-searched
answer look different from one of ours? 🟡

**3.2 — Five typed turns before we ask you to sign in.** Chip taps are free and
don't count. 🟡

**3.3 — The sign-in wall never appears before results have.** You always see
something you want before we ask who you are. 🔴

**3.4 — Results stay visible behind the sign-in wall.** It is not a blocking
page. 🟡

**3.5 — When money runs short, the chat drops to chips only** rather than going
down. 🟢

**3.6 — Manual filter edits are silent in the chat.** If you tap a filter, the
assistant doesn't narrate it — otherwise the conversation becomes a log of
taps. It speaks only when your tap contradicts something you said earlier. 🟡

**3.7 — Off-topic messages get one scripted line.** "Write my essay" gets a
polite fixed reply, costs no model call and is logged. The wording is yours. 🟢

---

# §4 · How results appear and update — 🟡 by Wed 30 Sep

Launch builds 4.1 to 4.4. The rest were cut to v1 in `docs/launch-plan.md`, so
marking them LATER costs nothing.

**4.1 — The results panel appears once intent, area and budget are filled** —
about three turns in. 🔴

**4.2 — The match score stays hidden until we know enough.** Filtering needs
area and budget. Ranking on compatibility needs the lifestyle answers, which
take much longer. We show results early and honestly, and withhold the score
until it means something. 🟡

**4.3 — The panel header changes as we learn more:** "Everything in Mumbai" →
"Powai" → "Powai, under ₹20,000" → match scores appear. In v0 every card is a
person, never a listing (PD0), so the exact words are yours. 🟢

**4.4 — The panel updates when the form changes, not when a turn happens.** A
ten-turn conversation might redraw the panel three times. 🟡

**4.5 — Widening and narrowing behave differently.** More results arrive as a
tappable banner. Fewer results apply immediately but say what went, with undo.
**v1, not launch.** 🟡

**4.6 — Nothing reorders while you scroll.** Updates queue and apply when idle.
**v1, not launch.** 🟡

**4.7 — A card you saved is never silently removed** — it gets marked with the
reason instead. **v1, not launch.** 🟢

---

# §5 · Mobile — 🔴 unresolved, and the biggest risk

**This is the one we most need you for.**

The whole product is a split view: chat on one side, results on the other. That
needs about 900 pixels. **Mumbai is a mobile-first market.** At 400px there is
no second panel, so the central idea has to work some other way.

Three options were written down on 20 September. None was chosen outright:
engineering picked a provisional pattern so it could start (below), and the
launch plan has already cut the bottom sheet to v1.

| Option | How it works | Trade |
|---|---|---|
| **Bottom sheet** | Chat fills the screen. Results sit in a sheet you drag up, with a pill showing the live count. | Extra component, but one product. |
| **Tabs** | Chat and Results as two tabs, with a badge. | Cheapest to build. Loses the live feedback, which is the entire point. |
| **Inline cards** | Results appear inside the chat as card carousels. | Most natural on mobile. Hard to compare options, which property search needs. |

**What engineering assumed, so it could start:** chat fills the screen; when
results are ready the chat shrinks to a bar at the bottom, about 25% of the
height, listings fill the space above; tapping the input expands the chat to
about 60% so you can read back. It shrinks again on send.

**One rule we would like to keep whatever you choose:** never resize while
someone is typing or reading.

**This is provisional and we expect you to overrule it.** But it is currently
being built. Decide by 30 September.

---

# §6 · Three open questions outside the flow

**6.1 — The empty state.** There is no skip, so if a search returns nothing the
user has answered a full interview for zero results. That is the worst moment
in the product and it currently has no design. Options: widen the area, relax a
dealbreaker, or offer to notify them. **Undesigned. 🔴**

**6.2 — The landing page** is being ported from the V3 prototype, which was
built for femmeflats — a women-only swipe app we have since pivoted away from.
It will be live and public. If you want a different landing page, the port is
four hours of work we could spend elsewhere. 🟡

**6.3 — Launch uses the V3 prototype's look, not Untitled UI.** ADR 0011 says
to build on the Untitled UI token pipeline, but that pipeline is blocked and
the prototype's palette doesn't match it. The launch plan proposes porting the
prototype's styling for 12 October and rebuilding on the pipeline in v1. **This
needs your sign-off, and it is D-01, due on day one.** 🔴

---

## What you never have to ask us about

Change these whenever you like, before or after launch, and nothing breaks:

Colours · type · spacing · icons · imagery · copy and tone · card layout ·
button placement · animation · empty-state illustrations · the visual design
of any screen.

**The rule of thumb:** if it changes how something *looks*, it's free. If it
changes what we *ask*, *store*, or *when something appears*, it's on the list
above.

---

## What we need back

1. Read §1, §5 and §6.3 first. Those three are worth more than the rest combined.
2. Mark every item OK / CHANGE / LATER.
3. For anything marked CHANGE, we'll come back the same day with the real cost
   and what it displaces.

The build is already running. Every day this sits unread, more of it turns from
🟢 into 🔴.
