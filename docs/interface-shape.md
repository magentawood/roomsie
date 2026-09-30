# Interface shape

**Date:** 2026-09-20 · **Status:** holes 2 to 5 closed. Mobile provisional.
**Decision:** PD6

---

## The decided flow

1. **Landing page.** Traditional hero and product narrative. Public.
2. **Primary call to action.** "Start looking" opens a full-screen chat.
3. **No skip.** The user cannot jump to the grid from here.
4. **After 2 to 3 inputs, the view splits.** Chat on one side, listings on the
   other.
5. **The listings panel has minimal manual filters.** Most filtering comes from
   the chat.
6. **The panel updates as the chat goes on.**

## Why it works

- The user sees results early, so the interview feels worth it.
- Results that change as you talk prove the assistant is listening.
- Minimal manual filters give an escape hatch without leaving the chat.
- Full chat first, split later, paces the effort well.

---

## The five holes

### 1. Mobile has no side-by-side — PROVISIONAL

This is the biggest one. A split view needs about 900px. Mumbai is a
mobile-first market. At 400px there is no second panel.

Three options, and one must be chosen:

| Option | How it works | Cost |
|---|---|---|
| Bottom sheet | Chat fills the screen. Results sit in a sheet that drags up. A pill shows the live count. | Extra component, but one product |
| Tabs | Chat and Results as two tabs, with a badge on Results. | Cheapest. Loses the live feedback, which is the whole point. |
| Inline cards | Results appear inside the chat as card carousels. | Most natural on mobile. Hard to compare options, which property search needs. |

**Provisional design (2026-09-20), to be finalised later.** The chat fills the
screen at the start. When results are ready, the chat shrinks to a bar at the
bottom, about 25% of the height, and the listings fill the space above. Tapping
the input expands the chat to about 60% so the user can read the history. It
shrinks again when the listings update.

The mechanics are the same as desktop. One form, two views.

**One rule to hold.** Never resize while the user is typing or reading. An
auto-shrink that fires mid-sentence is the same defect as silent reordering in
hole 4. Shrink on send, or let the user drag it.

### 2. Search traffic breaks the no-skip rule — CLOSED

**Resolved by moving the gate.** Login is required only to open a listing's
details and to contact anyone. Browsing, the chat and the split view are all
public, so there was never a conflict.

A visitor from search lands in the split view with the page's filters applied
and an empty chat, but a partly filled form. See
`seo-with-gated-products.md`.

### 3. Two or three turns is not enough to rank — CLOSED

**Decision.** The panel first appears once intent, area and budget are filled.
That is about three turns.

Filtering and ranking are different things. Filtering needs area and budget.
Ranking on compatibility needs the lifestyle answers, which take much longer.
So show results early and honestly, and withhold the match score until it
means something. The V3 prototype already does this: it hides the match tag
when no lifestyle filters are set.

**Headers by state:**

| Slots filled | Panel header |
|---|---|
| Intent only | "Everything in Mumbai" |
| Plus area | "Flats in Powai" with the count |
| Plus budget | "Flats in Powai under 20,000" |
| Enough lifestyle answers | Match score appears on cards |

**The first three turns are chip-driven.** Intent, area and budget are closed
questions, so tapping is right. Reuse the four intent cards from the prototype.
Area shows the top five or six as chips plus "somewhere else" which opens
search, and is multi-select. Budget shows bands rather than a slider, because
bands are faster on a phone: under 15, 15 to 20, 20 to 25, above 25.

**Chips are the floor, not the ceiling.** A user who types "2bhk in Powai under
25k from October" fills four slots in one turn and goes straight to results. If
that does not work, the chips are a form with a chat skin.

**Where the interview ends, revised.** It does not. The open questions begin
once results are already on screen, and continue while the user browses. The
completeness gate in `ai-agent-design.md` section 3.3 governs when the match
score appears, not when the conversation stops.

### 4. Live updates — CLOSED

**The rule: the panel updates when the form changes, not when a turn happens.**

A turn that changes no slot changes nothing on screen. A ten-turn conversation
might produce three panel updates. The panel is a pure function of the form,
which makes it deterministic and testable, unlike everything else in this
layer.

**A form change means a slot's value or weight changed.** It does not mean
provenance changed. Confirming an inferred value that was already applied does
not re-query.

**Direction decides the behaviour:**

| Change | Behaviour |
|---|---|
| Widening, more results | Banner: "12 more matches. Show them." Tappable. |
| Narrowing, fewer results | Applies, and says what went: "Hid 8 that allow smoking." With undo. |
| Reordering | Only on explicit refresh. Never while scrolling. |
| A saved card would be hidden | Never removed. Marked, with the reason. |

**Freeze while scrolling.** Updates queue while the user is scrolling or
reading a card, and apply when idle.

**The "don't ask again" checkbox covers widening only.** Once ticked, more
results arrive automatically. Narrowing always tells the user, even when it
stops asking. A toast with undo is not an interruption. Without this scoping,
one tick means cards silently vanish for the rest of the session.

### 5. Two inputs, one form — CLOSED

There is one form. The chat and the filter panel are two views of it.

**A manual filter edit writes to the same slot** and its context reaches the
assistant, so the source of truth stays common.

**Manual edits are silent in the transcript by default.** If every filter tap
produced a chat message, the conversation would become a log of taps. The
assistant speaks only when the edit contradicts something the user said
earlier.

**The complete conflict rule:**

| What happened | What the system does |
|---|---|
| Chat contradicts earlier chat | Ask which to keep |
| Manual edit contradicts earlier chat | Manual wins, assistant notes it once |
| Inference contradicts anything | Never wins, propose it |

A manual tap is explicit and recent. Asking "are you sure" after a deliberate
tap is irritating and teaches people to dismiss dialogs.

---

## Two smaller notes

**Latency.** The panel must not wait for the model. Run the query off the
current form state. A turn that does not change a slot changes nothing.

**Cold start.** No skip plus an empty panel is a dead end. If Mumbai supply is
thin, a forced interview makes it worse, because the user spent effort for
nothing. Define the empty state before launch: widen the area, relax a
dealbreaker, or offer to notify.
