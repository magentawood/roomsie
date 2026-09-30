# For the designer — decisions we are about to lock

**Date:** 2026-09-25 · **Updated:** 2026-09-26, launch moved to Mon 12 Oct · **For:** the person who owns design · **From:** engineering

---

## Why you are reading this

- We build for a fortnight before your designs arrive.
- Approximately 80 of the 115 engineering hours do not need a picture to start: the database, the sign-in, the AI and the matching.
- We made the behaviour decisions in that work.
- In ten days, some of these decisions will cost the launch date.
- This document does not ask you to approve visuals. It asks you to confirm, change or defer **behaviour**.

> [!note]- Why
> - "Does not need a design" is not the same as "has no design decisions in it."
> - Each task quietly assumes some behaviour of the product. Examples: how many questions the assistant asks, what a profile contains, when results appear, and what occurs on a phone.
> - We had to make those decisions to start. This document writes them down.
> - The cost to change a decision depends fully on when you tell us. Today, most of the decisions are free to change.
> - Thus, we do not build the incorrect thing for a fortnight.

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

> [!note]- Why
> The deadlines table below uses the sequence of the deadlines.

---

## What it costs to change something

| | Meaning |
|---|---|
| 🟢 **Free** | Change it at all times. No work uses it. Styling, colour, copy, spacing, icons, card layout and imagery are always free. |
| 🟡 **Costly** | A change after its build date costs approximately one or two days of rework. |
| 🔴 **Structural** | Other work is on top of it. After its date, a change means that we must remove other work to keep 12 October. |

> [!note]- Why
> A costly change causes problems, but we can survive it.

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

> [!note]- Why
> - §1: we build the contract first.
> - §6.3: the styling decision controls all designs.
> - §2: migrations after the schema commit are painful.
> - §3: we build the reply writer on Wed–Thu.
> - §4: work on the match query and the results panel starts on Thursday.

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

> [!note]- Why
> - §1 is the most expensive item on the list. If you add or remove a question after this, all four parts change together.
> - 1.1: A flow is not one new question. An example is "do you have pets?" as its own step. A flow is a migration, a contract change, a re-tuned extraction prompt and a new filter.
> - 1.2: Either we hide the two property cards for launch, or they go to a location that does not exist at this time.
> - 1.3: The answers are a closed set. Thus, we show options that the user can tap.
> - 1.4: Bands are faster on a phone.
> - 1.6: The assistant has permission to not know an answer.
> - 1.7: A user can type "2bhk in Powai under 25k from October". This fills four fields at one time and moves the user forward. The chips are the minimum, not a limit.
> - 1.8: This item is not open for review. But it limits what the chips can show.

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

> [!note]- Why
> - We commit the database on Sunday night. After that, it is the item on this list with the highest cost to change. Real data goes into it in the next week.
> - 2.2: This is a product decision in the costume of a database.
> - 2.3: Four is a guess.
> - 2.4: A user can chat before sign-up, and keep that conversation after sign-up. Thus, we keep the typed messages.

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

> [!note]- Why
> - 3.1: Example questions are what semi-furnished usually includes, or the usual amount of a deposit.
> - 3.3: You always see something that you want before we ask who you are.
> - 3.6: If the assistant told about each tap, the conversation would become a list of taps.
> - 3.7: Example: "Write my essay" gets a polite fixed reply.

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

> [!note]- Why
> - 4.1: This is after approximately three turns.
> - 4.2: The filter needs the area and the budget. The rank for compatibility needs the lifestyle answers, which take much more time to collect. We do not show the score until it has a meaning.
> - 4.3: Example: "Everything in Mumbai" → "Powai" → "Powai, under ₹20,000" → match scores appear.
> - 4.4: In a conversation of ten turns, the panel can change maybe three times.

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

> [!note]- Why
> - We need you for this item more than for all other items.
> - At 400px, there is no second panel. Thus, the central idea must work in a different way on mobile.
> - Bottom sheet: one more component, but one product.
> - Tabs: cheapest to build. It loses the live feedback, which is the full purpose.
> - Inline cards: most natural on mobile. It is not easy to compare options, and property search needs this.
> - At 60%, you can read back.
> - We expect that you will overrule the provisional pattern.

---

# §6 · Three open questions outside the flow

**6.1 — The empty state.** There is no skip. The options are: make the area larger, relax a dealbreaker, or offer to send the user a notification. **Undesigned. 🔴**

**6.2 — The landing page.** We port it from the V3 prototype. The landing page will be live and public. If you want a different landing page, the port is four hours of work that we can use on other work. 🟡

**6.3 — Launch uses the V3 prototype's look, not Untitled UI.** ADR 0011 says to build on the Untitled UI token pipeline. But that pipeline is blocked. The launch plan proposes to port the prototype's styling for 12 October, then rebuild on the pipeline in v1. **This needs your approval. It is D-01, and it is due on day one.** 🔴

> [!note]- Why
> - 6.1: If a search gives no results, the user answered a full interview for zero results. That is the worst moment in the product.
> - 6.2: The team made the V3 prototype for femmeflats, a women-only swipe app. We pivoted away from femmeflats after that.
> - 6.3: The prototype's palette does not agree with the pipeline.

---

## What you never have to ask us about

These items are always free:

Colours · type · spacing · icons · imagery · copy and tone · card layout ·
button placement · animation · empty-state illustrations · the visual design
of each screen.

**The general rule:** if it changes how something *looks*, it is free. If it
changes what we *ask*, what we *store*, or *when something appears*, it is on the
list above.

> [!note]- Why
> You can change these items at all times, before or after launch. Nothing breaks.

---

## What we need back

1. Read §1, §5 and §6.3 first.
2. Mark each item OK / CHANGE / LATER.
3. For each item that you mark CHANGE, we tell you the real cost on the same day. We also tell you what work it moves out.

> [!note]- Why
> - §1, §5 and §6.3 are more important than all other items together.
> - The build is in progress. Each day that this document stays unread, more items change from 🟢 to 🔴.
