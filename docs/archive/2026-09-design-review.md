# For the designer — decisions we are about to lock

> **Archived 2026-10-03.** The deadlines of this review passed on 30 September. The records that it fed link to it as a source. This page is history.

**Date:** 2026-09-25 · **Updated:** 2026-09-26, launch moved to Mon 12 Oct · **For:** the person who owns design · **From:** engineering

---

## Why you are reading this

- We build for a fortnight before your designs arrive.
- Approximately 80 of the 115 engineering hours do not need a picture to start: the database, the sign-in, the AI and the matching.
- We made the behaviour decisions in that work.
- In ten days, some of these decisions will cost the launch date.
- This document does not ask you to approve visuals. It asks you to confirm, change or defer **behaviour**.

Why: [PD12](../decisions/pd-12-team-plan.md)

---

## How to answer

For each numbered item, write one of these words:

| Word | Meaning |
|---|---|
| **OK** | Build it as the item tells. |
| **CHANGE** | Tell us the new behaviour. On the same day, we tell you what it costs. |
| **LATER** | You want a different behaviour, but not before launch. |

- You do not have to answer all of the items at one time.
- Answer them in the sequence of their deadlines.

---

## What it costs to change something

| | Meaning |
|---|---|
| 🟢 **Free** | Change it at all times. No work uses it. Styling, colour, copy, spacing, icons, card layout and imagery are always free. |
| 🟡 **Costly** | A change after its build date costs approximately one or two days of rework. |
| 🔴 **Structural** | Other work is on top of it. After its date, a change means that we must remove other work to keep 12 October. |

---

## Deadlines, in order

| By | What to decide | Note |
|---|---|---|
| **Now** | §1 The conversation's questions, and §6.3 the launch look | |
| **Sun 27 Sep** | §2 What we store about a person | We commit the schema on Sunday night. |
| **Tue 29 Sep** | §3 How the assistant behaves | |
| **Wed 30 Sep** | §4 How results appear and update | |
| **Wed 30 Sep** | §5 Mobile — **not resolved at this time** | The largest open question in the product. |
| **Wed 30 Sep** | Designs D-02, D-03, D-04 finished | Five people start to build screens on Thursday 1 October. |

Why: [PD12](../decisions/pd-12-team-plan.md)

---

# §1 · The conversation's questions — 🔴 structural, needed now

The database, the AI extraction, the matching and the profile screens all read from one shared definition of *what we ask a person*.

**1.1 — The form has only these fields.** Intent, areas, budget, move date, room type, and nine lifestyle answers: smoking, alcohol, guests, pets, hours, tidiness, at home, daytime and kitchen. The form has no other fields. 🔴
- To add a flow: if you tell us before Sunday, it costs an hour. After Sunday, it costs a day and a half.

**1.2 — Intent is one of the four cards from the prototype:** "a flat and flatmates", "just a flat", "just a flatmate" and "I'm renting out a flat". 🔴
- **This item is in conflict with a settled decision, and we need your answer first.**
- Decision PD0: v0 is flatmate matching only, with no property listings.
- Two of the four cards, *just a flat* and *I'm renting out a flat*, are about property.
- **Tell us which cards ship on 12 October.**

**1.3 — The first three turns are chips, not typed text:** intent, area and budget. 🟡

**1.4 — Budget is bands, not a slider:** below 15k, 15–20k, 20–25k and above 25k. 🟡

**1.5 — Areas are multi-select.** The top five or six areas show as chips. A "somewhere else" chip opens a search. 🟡

**1.6 — The user can answer each question with "unclear."** 🟢

**1.7 — Typed text is better than taps.** 🟡

**1.8 — We never offer some preferences as chips.** If a user speaks about community or religion, we record it and filter on it. We never suggest it, never ask about it, and never infer it from a name, a diet or an area. PD3c settles this. 🔒

Why: [PD0](../decisions/pd-00-v0-scope.md), [PD3c](../decisions/pd-03c-exclusionary-preferences.md), [PD6c](../decisions/pd-06c-interface-holes.md), [PD7](../decisions/pd-07-models.md)

---

# §2 · What we store about a person — 🔴 structural, by Sun 27 Sep

**2.1 — A profile holds:** name, age, work, intent, budget, areas, move date, and the nine lifestyle answers. 🔴

**2.2 — Each lifestyle answer has the mark "prefer" or "dealbreaker."** A dealbreaker removes people from the results. A preference changes only the rank. 🔴
- If you think that people must rank preferences, or give them a weight on a scale, tell us today.

**2.3 — A maximum of four photos for each person.** Today, a change to six is free. In October, it is a day of work. 🟡

**2.4 — We store anonymous sessions and the text that people type.** We delete the typed messages with the account. 🟡
- **Open:** should the chat tell users this at the start?

**2.5 — Reports, blocks and a waitlist are first-class**, not add-ons. 🟢

**2.6 — The assistant keeps notes about each person.** The observer changes what people say into notes, for example "partner stays over most nights". Each note holds the exact words that the person used. 🔴
- **Can people see and correct these notes, and where?** On the profile, in the chat, or nowhere at launch?
- This decision gives the shape of the profile screens (D-03). We need it by Wed 30 Sep.

Why: [ADR 0001](../decisions/0001-rent-infrastructure.md), [PD6b](../decisions/pd-06b-login-gate-and-search.md)

---

# §3 · How the assistant behaves — 🟡 by Tue 29 Sep

**3.1 — It answers questions about housing, and does not refuse them.** 🟡
- First, it answers from the roomsie articles, and it gives the name of the article.
- If the articles do not have the answer, a signed-in person gets an answer from a web search. A visitor gets a simple answer with a caveat.
- It never answers questions about law, tax, area safety or claims about a person from the web. For these, it uses articles only, or it uses a hand-off.
- **Open:** should an answer from a web search look different from our answers?

**3.2 — Five typed turns before we ask you to sign in.** Chip taps are free, and they do not count. 🟡

**3.3 — The sign-in wall never appears before the results appear.** 🔴

**3.4 — The results stay in view behind the sign-in wall.** The wall is not a page that stops you. 🟡

**3.5 — When the money is low, the chat changes to chips only.** It does not stop. 🟢

**3.6 — Manual filter changes are silent in the chat.** The assistant speaks only when your tap contradicts something that you said before. 🟡

**3.7 — Off-topic messages get one scripted line.** This reply costs no model call, and we log the message. You write the words of the reply. 🟢

Why: [PD6c](../decisions/pd-06c-interface-holes.md), [PD9](../decisions/pd-09-pre-login-limits.md), [PD10](../decisions/pd-10-scope-bands.md)

---

# §4 · How results appear and update — 🟡 by Wed 30 Sep

- Launch builds 4.1 to 4.4.
- `docs/launch-plan.md` moved 4.5 to 4.7 to v1. If you mark them LATER, it costs nothing.

**4.1 — The results panel appears when intent, area and budget have values.** 🔴

**4.2 — The match score stays hidden until we know sufficient information.** We show results quickly and honestly. 🟡

**4.3 — The panel header changes when we learn more.** In v0, each card is a person, never a listing (PD0). You choose the words. 🟢

**4.4 — The panel updates when the form changes, not after each turn.** 🟡

**4.5 — More results and fewer results have different behaviour.** More results come as a banner that the user can tap. Fewer results apply immediately, tell what went, and give an undo. **v1, not launch.** 🟡

**4.6 — No card moves while you scroll.** Updates wait in a queue and apply when the user stops. **v1, not launch.** 🟡

**4.7 — We never silently remove a card that you saved.** We mark it with the reason. **v1, not launch.** 🟢

Why: [PD6c](../decisions/pd-06c-interface-holes.md)

---

# §5 · Mobile — 🔴 unresolved, and the biggest risk

- The full product is a split view, with the chat on one side and the results on the other. That needs approximately 900 pixels.
- **Mumbai is a mobile-first market.**
- On 20 September, we wrote down three options. We did not fully choose one.
- Engineering chose a provisional pattern so that it can start (below).
- The launch plan moved the bottom sheet to v1.

| Option | How it works |
|---|---|
| **Bottom sheet** | The chat fills the screen. The results are in a sheet that you pull up. A pill shows the live count. |
| **Tabs** | Chat and Results are two tabs, with a badge. |
| **Inline cards** | The results appear in the chat as card carousels. |

**What engineering assumed, so that it can start:**

- The chat fills the screen.
- When the results are available, the chat becomes a bar at the bottom, approximately 25% of the height. The listings fill the space above it.
- When you tap the input, the chat increases to approximately 60%.
- When you send, the chat becomes small again.

**One rule that we want to keep for all options:** never change the size while a person types or reads.

**This pattern is provisional.** Work on it is in progress. Decide by 30 September.

Why: [PD6a](../decisions/pd-06a-mobile-split-view.md)

---

# §6 · Three open questions outside the flow

**6.1 — The empty state.** There is no skip. The options are: make the area larger, relax a dealbreaker, or offer to send the user a notification. **Undesigned. 🔴**

**6.2 — The landing page.** It comes from the Figma design (D-04). The landing page will be live and public. 🟡

**6.3 — The launch look.** Settled on 2 October: the launch look comes from the Figma designs, not the V3 prototype ([PD12](../decisions/pd-12-team-plan.md)). ✅

Why: [PD1](../decisions/pd-01-audience.md), [PD5](../decisions/pd-05-team-and-budget.md), [PD6c](../decisions/pd-06c-interface-holes.md)

---

## What you never have to ask us about

These items are always free:

Colours · type · spacing · icons · imagery · copy and tone · card layout ·
button placement · animation · empty-state illustrations · the visual design
of each screen.

**The general rule:** if it changes how something *looks*, it is free. If it
changes what we *ask*, what we *store*, or *when something appears*, it is on the
list above.

---

## What we need back

1. Read §1, §5 and §6.3 first.
2. Mark each item OK / CHANGE / LATER.
3. For each item that you mark CHANGE, we tell you the real cost on the same day. We also tell you what work it moves out.

Why: [PD12](../decisions/pd-12-team-plan.md)
