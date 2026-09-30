# Interface shape

**Date:** 2026-09-20 · **Status:** holes 2 to 5 closed. Mobile provisional.
**Decision:** PD6

---

## The decided flow

1. **Landing page.** A traditional hero and product narrative. Public.
2. **Primary call to action.** "Start looking" opens a full-screen chat.
3. **No skip.** From the chat, the user cannot go to the grid.
4. **After 2 to 3 inputs, the view splits.** Chat on one side, listings on the other.
5. **The listings panel has minimal manual filters.** Most filters come from the chat.
6. **The panel updates as the chat continues.**

## Why it works

- The user sees results fast. Thus, the interview feels worth the effort.
- Results change as the user talks. This proves that the assistant listens.
- Minimal manual filters give a way out, and the user does not leave the chat.
- A full chat first and two panels after give the effort a good pace.

---

## The five holes

### 1. Mobile has no side-by-side — PROVISIONAL

This is the largest hole. Two panels need approximately 900px. Mumbai is a
mobile-first market. At 400px, a second panel cannot fit.

Select one of three options:

| Option | How it works | Cost |
|---|---|---|
| Bottom sheet | Chat fills the screen. Results are in a sheet that the user drags up. A pill shows the live count. | One more component, but one product |
| Tabs | Two tabs, Chat and Results. Results has a badge. | Lowest cost. Loses the live feedback, which is the main function. |
| Inline cards | Results show in the chat as card carousels. | Most natural on mobile. Hard to compare options, which property search needs. |

**Provisional design (2026-09-20).** We will finalise it subsequently. At the
start, the chat fills the screen. When results are available, the chat becomes a bar at
the bottom (approximately 25% of the height), and the listings fill the
space above. A tap on the input makes the chat approximately 60% of the height, to
let the user read the history. When the listings update, the chat becomes
small again.

The mechanics are the same as on desktop: one form, two views.

**One rule to hold.** Do not change the size while the user types or reads. An automatic shrink in the middle of a sentence is the same defect as silent reorder in hole 4.
The size should change on send, or when the user drags it.

### 2. Search traffic breaks the no-skip rule — CLOSED

**We moved the gate.** The user must log in only to open the details of a
listing or to contact a person. Browse, chat and the two-panel view are
public. Thus, there was no conflict.

A visitor from search starts in the two-panel view. The page filters apply,
the chat is empty, and some fields of the form have values. Refer to
`seo-with-gated-products.md`.

### 3. Two or three turns is not enough to rank — CLOSED

**Decision.** The panel shows first when the user gives intent, area and
budget. This takes approximately three turns.

Filters and rank are different. Filters need area and budget. A compatibility
rank needs the lifestyle answers, which take much more time. Thus, show
results fast and honestly. Do not show the match score until it has a meaning.
The V3 prototype does this: with no lifestyle filters, it hides the match tag.

**Headers by state:**

| Slots filled | Panel header |
|---|---|
| Intent only | "Everything in Mumbai" |
| Plus area | "Flats in Powai" with the count |
| Plus budget | "Flats in Powai under 20,000" |
| Enough lifestyle answers | Match score shows on cards |

**The first three turns are chip-driven.** Intent, area and budget have a
closed set of answers, so a tap is correct. Use the four intent cards from
the prototype again. Area shows the top five or six areas as chips, and a
"somewhere else" chip that opens search. The user can select more than one
area. Budget shows bands, not a slider, because bands are faster on a phone:
below 15, 15 to 20, 20 to 25, above 25.

**Chips are the floor, not the ceiling.** A user who types "2bhk in Powai
under 25k from October" fills four slots in one turn and goes directly to
results. If this does not work, the chips are only a form with a chat skin.

**Where the interview ends, revised.** It does not end. The open questions
start when results are on the screen, and continue while the user browses.
The completeness gate in `ai-agent-design.md` section 3.3 controls when the
match score shows, not when the conversation stops.

### 4. Live updates — CLOSED

**The rule: the panel updates when the form changes, not when a turn happens.**

A turn that changes no slot changes nothing on the screen. Ten turns can give
only three panel updates. The panel is a pure function of the form. Thus, it
is deterministic and testable, but no other part of this layer is.

**A form change means a change to the value or weight of a slot.** A change to
provenance is not a form change. If the user confirms an inferred value that
the panel uses, there is no new query.

**The direction of the change sets what the panel does:**

| Change | Behaviour |
|---|---|
| Widen, more results | A banner that the user can tap: "12 more matches. Show them." |
| Narrow, fewer results | The change applies, and the system tells what it removed: "Hid 8 that allow smoking." With undo. |
| Reorder | Only on explicit refresh. Never while the user scrolls. |
| A saved card would be hidden | Never remove it. Mark it, with the reason. |

**Freeze while the user scrolls.** While the user scrolls or reads a card,
updates wait in a queue. When the user is idle, they apply.

**The "don't ask again" checkbox applies to wider results only.** After a
tick, more results come automatically. A narrow change always tells the user,
also when the system does not ask. A toast with undo is not an interruption.
Without this limit, one tick makes cards go away silently for the remainder
of the session.

### 5. Two inputs, one form — CLOSED

There is one form. The chat and the filter panel are two views of it.

**A manual filter edit writes to the same slot,** and the assistant gets its
context. Thus, there is one source of truth.

**Manual edits are silent in the transcript by default.** If each filter tap
made a chat message, the conversation would become a list of taps. The
assistant speaks only when the edit contradicts an earlier statement of the
user.

**The complete conflict rule:**

| What happened | What the system does |
|---|---|
| Chat contradicts earlier chat | Ask which to keep |
| Manual edit contradicts earlier chat | Manual edit wins. The assistant tells this one time. |
| Inference contradicts anything | Inference never wins. Propose it. |

A manual tap is explicit and recent. An "are you sure" question after a
deliberate tap annoys the user, and teaches people to close dialogs without a
check.

---

## Two smaller notes

**Latency.** The panel must not wait for the model. Run the query from the
current form state. A turn that does not change a slot changes nothing.

**Cold start.** No skip and an empty panel give a dead end. If Mumbai supply
is small, a forced interview makes this worse, because the user did work for
no result. Define the empty state before launch: make the area larger, relax
a dealbreaker, or offer a notification.
