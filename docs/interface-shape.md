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

Why: [PD6](decisions/pd-06-interface-shape.md)

---

## The five holes

### 1. Mobile has no side-by-side — PROVISIONAL

- This is the largest hole.
- Two panels need approximately 900px.
- Select one of three options:

| Option | How it works |
|---|---|
| Bottom sheet | Chat fills the screen. Results are in a sheet that the user drags up. A pill shows the live count. |
| Tabs | Two tabs, Chat and Results. Results has a badge. |
| Inline cards | Results show in the chat as card carousels. |

**Provisional design (2026-09-20).** We will finalise it subsequently.

| When | Chat | Listings |
|---|---|---|
| Start | Fills the screen | — |
| Results are available | A bar at the bottom, approximately 25% of the height | Fill the space above |
| The user taps the input | Approximately 60% of the height | The space above |
| The listings update | Small again | The space above |

**One rule to hold.** Do not change the size while the user types or reads.
The size should change on send, or when the user drags it.

Why: [PD6a](decisions/pd-06a-mobile-split-view.md)

### 2. Search traffic breaks the no-skip rule — CLOSED

- **We moved the gate.**
- The user must log in only to open the details of a listing or to contact a person.
- Browse, chat and the two-panel view are public.
- A visitor from search starts in the two-panel view:
  - The page filters apply.
  - The chat is empty.
  - Some fields of the form have values.
- Refer to `seo-with-gated-products.md`.

Why: [PD6b](decisions/pd-06b-login-gate-and-search.md)

### 3. Two or three turns is not enough to rank — CLOSED

**Decision.** The panel shows first when the user gives intent, area and
budget. This takes approximately three turns.

- Show results early and honestly.
- Do not show the match score until it has a meaning.
- The V3 prototype does this: with no lifestyle filters, it hides the match tag.

**Headers by state:**

| Slots filled | Panel header |
|---|---|
| Intent only | "Everything in Mumbai" |
| Plus area | "Flats in Powai" with the count |
| Plus budget | "Flats in Powai under 20,000" |
| Enough lifestyle answers | Match score shows on cards |

**The first three turns are chip-driven.**

| Slot | Chips |
|---|---|
| Intent | The four intent cards from the prototype |
| Area | The top five or six areas, and a "somewhere else" chip that opens search. The user can select more than one area. |
| Budget | Bands, not a slider: below 15, 15 to 20, 20 to 25, above 25 |

**Chips are the floor, not the ceiling.**

**Where the interview ends, revised.** It does not end.

- The open questions start when results are on the screen.
- They continue while the user browses.
- The completeness gate in `ai-agent-design.md` section 3.3 controls when the match score shows, not when the conversation stops.

Why: [PD6c](decisions/pd-06c-interface-holes.md)

### 4. Live updates — CLOSED

**The rule: the panel updates when the form changes, not when a turn happens.**

- The panel is a pure function of the form.
- A form change is a change to the value or weight of a slot.
- A change to provenance is not a form change.
- If the user confirms an inferred value that the panel uses, there is no new query.

**The direction of the change sets what the panel does:**

| Change | Behaviour |
|---|---|
| Widen, more results | A banner that the user can tap: "12 more matches. Show them." |
| Narrow, fewer results | The change applies, and the system tells what it removed: "Hid 8 that allow smoking." With undo. |
| Reorder | Only on explicit refresh. Never while the user scrolls. |
| A change would hide a saved card | Never remove it. Mark it, with the reason. |

**Freeze while the user scrolls.** While the user scrolls or reads a card,
updates wait in a queue. When the user is idle, they apply.

**The "don't ask again" checkbox applies to wider results only.**

- After a tick, more results come automatically.
- A narrow change always tells the user, also when the system does not ask.

Why: [PD6c](decisions/pd-06c-interface-holes.md)

### 5. Two inputs, one form — CLOSED

- There is one form. The chat and the filter panel are two views of it.
- **A manual filter edit writes to the same slot,** and the assistant gets its context.
- **Manual edits are silent in the transcript by default.**
- The assistant speaks only when the edit contradicts an earlier statement of the user.

**The complete conflict rule:**

| What happened | What the system does |
|---|---|
| Chat contradicts earlier chat | Ask which to keep |
| Manual edit contradicts earlier chat | Manual edit wins. The assistant tells this one time. |
| Inference contradicts anything | Inference never wins. Propose it. |

Why: [PD6c](decisions/pd-06c-interface-holes.md)

---

## Two smaller notes

**Latency.** The panel must not wait for the model. Run the query from the
current form state.

**Cold start.** No skip and an empty panel give a dead end. Define the empty
state before launch:

- Make the area larger.
- Relax a dealbreaker.
- Offer a notification.

Why: [PD6](decisions/pd-06-interface-shape.md)
