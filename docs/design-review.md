# For the designer — decisions we are about to lock

**Date:** 2026-09-25 · **Updated:** 2026-09-26, launch moved to Mon 12 Oct · **For:** the person who owns design · **From:** engineering

---

## Why you are reading this

We will build for a fortnight before your designs arrive. Approximately 80 of the
115 engineering hours do not need a picture to start. This work is the database,
the sign-in, the AI and the matching.

**But "does not need a design" is not the same as "has no design decisions in it."**

Each of those tasks quietly assumes some behaviour of the product. For example:
how many questions the assistant asks, what a profile contains, when results
appear, and what occurs on a phone. We already made those decisions, because we
had to make them to start. This document writes them down.

If you do not agree with a decision, **its cost to change depends fully on
when you tell us.** Today, most of the decisions are free to change. In ten days,
some of them will cost the launch date.

This document does not ask you to approve visuals. It asks you to confirm,
change or defer **behaviour**. Then we do not build the incorrect thing for a fortnight.

---

## How to answer

For each numbered item, write one of these words:

- **OK** — build it as the item tells.
- **CHANGE** — and tell us the new behaviour. On the same day, we will tell you what it costs.
- **LATER** — you want a different behaviour, but not before launch.

You do not have to answer all of the items at one time. Answer them in the
sequence of their deadlines. The table below uses that sequence.

---

## What it costs to change something

| | Meaning |
|---|---|
| 🟢 **Free** | Change it at all times. No work is built on it. Styling, colour, copy, spacing, icons, card layout and imagery are always free. |
| 🟡 **Costly** | If you change it after its build date, it costs approximately one or two days of rework. This is annoying, but we can survive it. |
| 🔴 **Structural** | Other work is on top of it. If you change it after its date, we must remove other work to keep 12 October. |

---

## Deadlines, in order

| By | What must be settled | Why |
|---|---|---|
| **Now** | §1 The conversation's questions, and §6.3 the launch look | We build the contract first. The styling decision controls all designs. |
| **Sun 27 Sep** | §2 What we store about a person | We commit the schema on Sunday night. Migrations after that are painful. |
| **Tue 29 Sep** | §3 How the assistant behaves | We build the reply writer on Wed–Thu. |
| **Wed 30 Sep** | §4 How results appear and update | Work on the match query and the results panel starts on Thursday. |
| **Wed 30 Sep** | §5 Mobile — **still unresolved** | This is the largest open question in the product. |
| **Wed 30 Sep** | Designs D-02, D-03, D-04 finished | Five people start to build screens on Thursday 1 October. |

---

# §1 · The conversation's questions — 🔴 structural, needed now

This is the most expensive item on the list. The database, the AI extraction,
the matching and the profile screens all read from one shared definition of
*what we ask a person*. If you add or remove a question after this, all four change
together.

**1.1 — The form has only these fields.** Intent, areas, budget, move date,
room type, and nine lifestyle answers. The nine answers are smoking, alcohol,
guests, pets, hours, tidiness, at home, daytime and kitchen. The form has no
other fields. 🔴

> **If you add a flow**, it is not one new question. An example is "do you have
> pets?" as a separate step. A flow is a migration, a contract change, a re-tuned
> extraction prompt and a new filter. **If you tell us before Sunday, it costs an
> hour. After Sunday, it costs a day and a half.**

**1.2 — Intent is one of the four cards from the prototype.** The cards are
"a flat and flatmates", "just a flat", "just a flatmate" and "I'm renting out a flat". 🔴

> **This item is in conflict with a settled decision, and we need your answer
> first.** Decision PD0 says that v0 is flatmate matching only, with no property
> listings. Two of the four cards, *just a flat* and *I'm renting out a flat*,
> are about property. Thus, either we hide these two cards for launch, or they go
> to a location that does not exist yet. **Tell us which cards ship on 12 October.**

**1.3 — The first three turns are chips, not typed text.** For intent, area and
budget, the answers are a closed set. Thus, we show options that the user can tap. 🟡

**1.4 — Budget is bands, not a slider.** The bands are below 15k, 15–20k,
20–25k and above 25k. We chose bands because they are faster on a phone. 🟡

**1.5 — Areas are multi-select.** We show the top five or six areas as chips.
We also show a "somewhere else" chip, which opens a search. 🟡

**1.6 — The user can answer each question with "unclear."** It is
acceptable for the assistant to not know an answer. 🟢

**1.7 — Typed text is better than taps.** A user can type "2bhk in Powai under
25k from October". This fills four fields at one time and moves the user
forward. The chips are the minimum, not a limit. 🟡

**1.8 — We never offer some preferences as chips.** If a user speaks about
community or religion, we record it and filter on it. We never suggest it and we
never ask about it. We never infer it from a name, a diet or an area. PD3c settles
this, thus it is not open for review. But it limits what the chips can show. 🔒

---

# §2 · What we store about a person — 🔴 structural, by Sun 27 Sep

We commit the database on Sunday night. After that, it is the item on this
list with the highest cost to change. The reason is that real data goes into it in the
next week.

**2.1 — A profile holds:** name, age, work, intent, budget, areas, move date,
and the nine lifestyle answers. 🔴

**2.2 — Each lifestyle answer has the mark "prefer" or "dealbreaker."** A
dealbreaker removes people from the results. A preference changes only the
rank. 🔴

> This is a product decision in the costume of a database. Maybe you think that
> people must rank preferences, or give them a weight on a scale. If so, tell
> us now.

**2.3 — A maximum of four photos for each person.** 🟡

> Four is a guess. Today, a change to six is free. In October, it is a day of work.

**2.4 — We store anonymous sessions and the text that people type.** Thus, a
user can chat before sign-up, and keep that conversation after sign-up. We keep
the typed messages and delete them with the account. Should the chat tell
users this at the start? 🟡

**2.5 — Reports, blocks and a waitlist are first-class**, not add-ons. 🟢

**2.6 — The assistant keeps notes about each person.** The observer changes what
people say into notes, for example "partner stays over most nights". Each note
holds the exact words that the person used.

**Can people see and correct these notes,
and where?** On the profile, in the chat, or nowhere at launch? This decision
gives the shape of the profile screens (D-03). Thus, we need it by Wed 30 Sep. 🔴

---

# §3 · How the assistant behaves — 🟡 by Tue 29 Sep

**3.1 — It answers questions about housing, and does not refuse them.** For
example, a user can ask what semi-furnished usually includes, or the usual
amount of a deposit. First, it answers from the roomsie articles, and it gives
the name of the article.

If the articles do not have the answer, a signed-in person gets an answer from a
web search. A visitor gets a simple answer with a caveat. The assistant never
answers questions about law, tax, area safety or claims about a person from the
web. For these questions, it uses articles only, or it sends the question to a
person. Should an answer from a web search look different from our answers? 🟡

**3.2 — Five typed turns before we ask you to sign in.** Chip taps are free,
and they do not count. 🟡

**3.3 — The sign-in wall never appears before the results appear.** You always see
something that you want before we ask who you are. 🔴

**3.4 — The results stay in view behind the sign-in wall.** The wall is not a
page that stops you. 🟡

**3.5 — When the money is low, the chat changes to chips only.** It does not
stop. 🟢

**3.6 — Manual filter changes are silent in the chat.** If you tap a filter, the
assistant does not tell about it. If it did, the conversation would become a
list of taps. It speaks only when your tap contradicts something that you said
before. 🟡

**3.7 — Off-topic messages get one scripted line.** "Write my essay" gets a
polite fixed reply. This reply costs no model call, and we log the message. You
write the words of the reply. 🟢

---

# §4 · How results appear and update — 🟡 by Wed 30 Sep

Launch builds 4.1 to 4.4. `docs/launch-plan.md` moved the other items to v1.
Thus, if you mark them LATER, it costs nothing.

**4.1 — The results panel appears when intent, area and budget have values.**
This is after approximately three turns. 🔴

**4.2 — The match score stays hidden until we know sufficient information.**
The filter needs the area and the budget. The rank for compatibility needs the
lifestyle answers, which take much more time to collect. We show results
quickly and honestly. We do not show the score until it has a meaning. 🟡

**4.3 — The panel header changes when we learn more:** "Everything in Mumbai" →
"Powai" → "Powai, under ₹20,000" → match scores appear. In v0, each card is a
person, never a listing (PD0). Thus, you choose the words. 🟢

**4.4 — The panel updates when the form changes, not after each turn.** In a
conversation of ten turns, the panel can change maybe three times. 🟡

**4.5 — More results and fewer results have different behaviour.** More results
come as a banner that the user can tap. Fewer results apply immediately. They
also tell what went, and they give an undo. **v1, not launch.** 🟡

**4.6 — No card moves while you scroll.** Updates wait in a queue and apply when
the user stops. **v1, not launch.** 🟡

**4.7 — We never silently remove a card that you saved.** We mark it with the
reason. **v1, not launch.** 🟢

---

# §5 · Mobile — 🔴 unresolved, and the biggest risk

**We need you for this item more than for all other items.**

The full product is a split view, with the chat on one side and the results on
the other. That needs approximately 900 pixels. **Mumbai is a mobile-first
market.** At 400px, there is no second panel. Thus, the central idea must work
in a different way on mobile.

On 20 September, we wrote down three options. We did not fully choose one.
Engineering chose a provisional pattern so that it can start (below). The launch
plan already moved the bottom sheet to v1.

| Option | How it works | Trade |
|---|---|---|
| **Bottom sheet** | The chat fills the screen. The results are in a sheet that you pull up. A pill shows the live count. | One more component, but one product. |
| **Tabs** | Chat and Results are two tabs, with a badge. | Cheapest to build. It loses the live feedback, which is the full purpose. |
| **Inline cards** | The results appear in the chat as card carousels. | Most natural on mobile. It is difficult to compare options, and property search needs this. |

**What engineering assumed, so that it can start:**

- The chat fills the screen.
- When the results are available, the chat becomes a bar at the bottom. The bar
  is approximately 25% of the height. The listings fill the space above it.
- When you tap the input, the chat increases to approximately 60%. Then you can
  read back.
- When you send, the chat becomes small again.

**One rule that we want to keep for all options:** never change the size while
a person types or reads.

**This pattern is provisional, and we expect that you will overrule it.** But work on
it is in progress. Decide by 30 September.

---

# §6 · Three open questions outside the flow

**6.1 — The empty state.** There is no skip. Thus, if a search gives no results,
the user answered a full interview for zero results. That is the worst moment in
the product, and at this time it has no design. The options are: make the area
larger, relax a dealbreaker, or offer to send the user a notification. **Undesigned. 🔴**

**6.2 — The landing page.** We port it from the V3 prototype. The team made
that prototype for femmeflats, a women-only swipe app that we pivoted away from
after that. The landing page will be live and public. If you want a different
landing page, the port is four hours of work that we can use on other work. 🟡

**6.3 — Launch uses the V3 prototype's look, not Untitled UI.** ADR 0011 says
to build on the Untitled UI token pipeline. But that pipeline is blocked, and
the prototype's palette does not agree with it. The launch plan proposes to port
the prototype's styling for 12 October, then rebuild on the pipeline in v1. **This needs your approval. It is D-01, and it is due on day one.** 🔴

---

## What you never have to ask us about

You can change these items at all times, before or after launch. Nothing breaks:

Colours · type · spacing · icons · imagery · copy and tone · card layout ·
button placement · animation · empty-state illustrations · the visual design
of each screen.

**The general rule:** if it changes how something *looks*, it is free. If it
changes what we *ask*, what we *store*, or *when something appears*, it is on the
list above.

---

## What we need back

1. Read §1, §5 and §6.3 first. Those three items are more important than all other items together.
2. Mark each item OK / CHANGE / LATER.
3. For each item that you mark CHANGE, on the same day we will tell you the real
   cost. We will also tell you what work it moves out.

The build is already in progress. Each day that this document stays unread,
more items change from 🟢 to 🔴.
