# Interface shape

**Date:** 2026-09-20 · **Status:** decided for desktop, open for mobile
**Decision:** D6

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

### 1. Mobile has no side-by-side

This is the biggest one. A split view needs about 900px. Mumbai is a
mobile-first market. At 400px there is no second panel.

Three options, and one must be chosen:

| Option | How it works | Cost |
|---|---|---|
| Bottom sheet | Chat fills the screen. Results sit in a sheet that drags up. A pill shows the live count. | Extra component, but one product |
| Tabs | Chat and Results as two tabs, with a badge on Results. | Cheapest. Loses the live feedback, which is the whole point. |
| Inline cards | Results appear inside the chat as card carousels. | Most natural on mobile. Hard to compare options, which property search needs. |

**Recommendation: bottom sheet.** It keeps the live count visible, which is the
feedback that stops people quitting.

### 2. Search traffic breaks the no-skip rule

ADR 0007 makes listing pages the search surface. They are server-rendered and
public so Google can index them.

So someone who searches "1BHK Powai rent" lands on a listing page. They have
skipped the interview. The rule cannot hold.

Decide what that visitor sees. Options: the listing plus a chat prompt, the
listing plus a limited grid, or the listing with everything else gated.

Do not drop the public pages. They are the cheapest demand you will get.

### 3. Two or three turns is not enough to rank

After three turns you might know intent and area. That is not enough to rank
anything.

So the first panel state is not "your matches". It is "everything in Mumbai".
Say so. A panel that claims to be personalised when it is not will lose trust
on the first look.

Proposed labels as the form fills:

| Slots filled | Panel header |
|---|---|
| Intent only | "Everything in Mumbai" |
| Plus area or budget | "Narrowing down" with the count |
| Minimum set complete | "Your matches" with the match score shown |

### 4. Live updates will feel jarring

If the list reshuffles every turn, the user loses the card they were reading.

Rules:

- Never reorder silently while the user is scrolling.
- Show a banner instead: "8 new matches. Refresh."
- Removals are the worse case. If a new dealbreaker hides a card the user just
  saved, say which one and why.
- Keep saved cards pinned regardless of filters.

### 5. Two input surfaces, one state

The user can set a manual filter and then contradict it in chat.

There is one form. The chat and the filter panel are two views of it. A manual
filter change writes to the same slot and the assistant acknowledges it. A chat
statement updates the panel. Conflicts follow the rule in
`ai-agent-design.md` section 3.1: ask, do not overwrite.

---

## Two smaller notes

**Latency.** The panel must not wait for the model. Run the query off the
current form state. A turn that does not change a slot changes nothing.

**Cold start.** No skip plus an empty panel is a dead end. If Mumbai supply is
thin, a forced interview makes it worse, because the user spent effort for
nothing. Define the empty state before launch: widen the area, relax a
dealbreaker, or offer to notify.
