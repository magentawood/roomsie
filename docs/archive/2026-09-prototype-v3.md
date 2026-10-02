# The V3 prototype

> **Archived 2026-10-02.** The V3 prototype is not the launch design. The launch look comes from the Figma designs ([PD12](../decisions/pd-12-team-plan.md)). This page is history.

**Updated:** 2026-09-30 · Moved from CONTEXT.md

`docs/source/roomsie-prototype-V3.html` is a 23-surface clickable desktop prototype. Use it, not the PRD, as the pre-pivot baseline.

**Items that it settles:**

- **Grid, not stack.** Flats and flatmates show in one responsive card grid with a sticky filter rail. There is no swipe anywhere.
- **The three-state chip.** Sixteen lifestyle chips on nine axes. One tap means prefer, two taps mean dealbreaker, and three taps turn it off.
- If an item fails a dealbreaker, the grid hides it fully. The grid shows the count as "N hidden by your dealbreakers".
- **The nine-axis lifestyle vocabulary**: kitchen, smoking, alcohol, guests, pets, hours, tidiness, at-home vibe, daytime presence. Each axis has three uses: a fact about you, a want with a weight, and a filter.
- **Intent as the first question.** Four cards: a flat and flatmates, only a flat, only a flatmate, renting out a flat.
- **Lazy registration.** The prototype asks nothing at the start. The first message or the first publish starts auth, phone and face check. Signup does not start them.
- **Match score** = 100 with no preferences set. If the user sets preferences, the score is 70 plus 30 times the fraction of preferences hit.
- **Design language**: warm cream and paper, pink `#FF87AC` primary, yellow `#FBDF8E` secondary, Bricolage Grotesque for display and Plus Jakarta Sans for body. Light-first, with full dark mode.

**Items that the all-genders decision (PD1) makes invalid in it:**

- all the women-only strings
- the "For women. By women" hero
- the "Only women see this" reassurance in the post wizard.

To replace them, roomsie needs a new trust story. The product scope section must supply this story.

**Items that it does not build** and that are important to the plan:

- no OTP screen
- no message composer that works in a chat that exists
- no photo upload
- no persistence
- no report or block function
- no notifications
- no settings
- no search
- no map
- the privacy visibility toggles do nothing.

The prototype collects the listing description, and then discards it.

The prototype and the design-system ADR do not agree:

- The palette and fonts of the prototype are not Untitled UI.
- ADR 0011 makes Figma the single source of truth, with a generated `theme.css`.
- Not resolved: does the look of the prototype become the design system, or do we rebuild it in Untitled UI?

## Why it matters

- The V3 prototype is much more complete than the deprecated PRD. It already carries the roomsie name, it is already Mumbai-only, and it already abandoned the swipe stack.
- The pivot should probably keep the items that the prototype settles.
- The four intent cards map exactly onto the intents that the AI interview must disambiguate.
- PD1 also makes invalid the safety argument that the women-only items carry.
