# PD6c — The panel follows the form

**Status:** Settled. Four holes closed, one provisional · **Date:** 2026-09-20 · **Deciders:** Yash

## Context

PD6 settles the flow. First a landing page, then a full-screen chat with no
skip. After 2 to 3 inputs, a split view shows live listings with minimal manual
filters. The design had five holes:

1. Mobile has no side-by-side view. **Provisional** (PD6a).
2. Search traffic breaks the no-skip rule. **Closed** (PD6b).
3. Two or three turns do not give sufficient data to rank. **Closed.**
4. Live updates. **Closed.**
5. Two inputs, one form. **Closed.**

## Decision

**In one line:** The panel is a pure function of the form: it updates when the form changes, not when a chat turn happens.

**The panel updates when the form changes, not when a chat turn happens.**

- The panel is a pure function of the form.
- A form change is a change to the value or weight of a slot. A change to
  provenance is not a form change.

**First results (hole 3).** The panel shows first after intent, area and
budget, approximately three turns. These turns are chip-driven: the four intent
cards, the top five or six areas plus "somewhere else", and budget bands (below
15, 15 to 20, 20 to 25, above 25). The match score stays hidden until the user
gives sufficient lifestyle answers. The interview does not end: open questions
continue while the user browses.

**Direction of change (hole 4):**

| Change | What the panel does |
|---|---|
| Widen, more results | A banner: "12 more matches. Show them." |
| Narrow, fewer results | It applies, tells what it removed, and offers undo |
| Reorder | Only on explicit refresh. Never during a scroll. |
| A saved card would go | Never removed. It shows the reason. |

- While the user scrolls or reads, updates wait in a queue.
- "Don't ask again" applies to wider results only. A narrow change always tells
  the user.

**One form, two views (hole 5).** A manual filter edit writes to the same slot.
Manual edits are silent in the transcript by default.

| Conflict | Rule |
|---|---|
| Chat against earlier chat | Ask which one to keep |
| Manual filter against chat | The filter wins. The assistant tells the user one time. |
| Inference against anything | It never wins. The assistant proposes it. |

**At launch, only the basics.** The panel queries again when the form changes.
The banners, the undo and the scroll rules come in v1.

## Rationale

- **Form, not turn.** A turn that changes no slot changes nothing on the
  screen. Ten turns can give only three panel updates.
- **A pure function is deterministic and testable.** No other part of this
  layer is.
- **Filters and rank are different.** Filters need area and budget. A
  compatibility rank needs lifestyle answers, which take much more time. The
  panel header shows what the panel knows. Example: "Everything in Mumbai" →
  "Powai" → "Powai, under ₹20,000" → match scores appear.
- **Budget is in the first three turns.** Budget is the most frequent cause of
  wasted results.
- **Chips for closed slots.** Intent, area and budget have a closed set of
  answers, so a tap is correct. Bands are faster than a slider on a phone. A
  user who types "2bhk in Powai under 25k from October" fills four slots and
  goes directly to results. Without this, the chips are only a form with a
  chat skin.
- **Chips give three benefits:**
  1. The user does not have to type. On mobile, to type is the primary cause
     of fatigue.
  2. They make the interview faster. A slow interview is the primary cause of
     abandonment.
  3. They limit the input space. This decreases prompt injection, off-topic
     drift and adversarial input. This is a security benefit, not only a UX
     benefit.
- **The cost of chips is anchoring.** Thus, suggestions go on closed questions,
  never on open ones. Suggestions push the answer to the options that the user
  sees. But the full premise of the interview (option 1) is to learn things
  that chips cannot capture. Example: the assistant offers "Early riser" and
  "Night owl". Then it does not learn about shifts that rotate.
- **Chips for a closed question come from the slot definition,** not from a
  second model call. A second model call on each turn makes the latency and
  the cost two times larger.
- **A toast with undo is not an interruption.**
- **The limit on "don't ask again".** Without it, one tick makes cards go away
  silently for the remainder of the session.
- **One form gives one source of truth.** If each filter tap made a chat
  message, the conversation would become a list of taps.
- **A manual tap wins** because it is explicit and recent. An "are you sure"
  question after a deliberate tap annoys the user, and teaches people to close
  dialogs without a check.
- **Inference never wins.** An inferred value never fills a slot silently.

## Consequences

- The panel must not wait for the model. Run the query from the current form
  state.
- Define the empty state before launch: make the area larger, relax a
  dealbreaker, or offer a notification. If Mumbai supply is small, a forced
  interview makes the dead end worse.
- The completeness gate controls when the match score shows, not when the
  conversation stops.
- Mobile rule (hole 1): do not change the chat size while the user types or
  reads. An automatic shrink in the middle of a sentence is the same defect as
  a silent reorder.

## Revisit when

The mobile split view (hole 1, PD6a) gets its last design. We settled the
mechanics, but not the appearance.

## Sources

- [CONTEXT.md](../../CONTEXT.md), PD6c row
- [product-base.md](../product-base.md), section 07
- [interface-shape.md](../interface-shape.md), holes 1 to 5 and "Two smaller notes"
- [ai-agent-design.md](../ai-agent-design.md), sections 3.3 and 3.4
- [design-review.md](../archive/2026-09-design-review.md), item 4.3
- [launch-plan.md](../archive/2026-09-launch-plan.md), "What moves to after launch"
