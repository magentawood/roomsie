# Product calls: matching rules

**Task:** F-12 · **Status:** open · **Updated:** 2026-10-04

## How to run this session

- Run this session after the F-11 session ([intake-and-profile.md](intake-and-profile.md)).
- Ask the questions in rounds. Put a question in a round when all its prerequisites have answers.
- Ask one question at a time. Get one answer before you go to the next question.
- Record each answer in the named record. Then delete the question from this file.
- [PD3a](../decisions/pd-03a-flatmate-matching.md) is open and has no content. The answers to PC-20 to PC-33 fill it and close it.

## Round 1

Prerequisites: PC-02, PC-04, PC-07 and PC-18 in [intake-and-profile.md](intake-and-profile.md).

### PC-25 · Does an unanswered axis fail a dealbreaker

❓ A searcher sets a dealbreaker on smoking. A candidate did not answer the smoking question. Do we hide the candidate?

- **Today:** Yes, we hide the candidate (`apps/api/src/match/query.ts:140-152`).
- **Options:** a) Hide the candidate. b) Show the candidate below the full matches, with the label "did not answer: smoking". c) Show the candidate with no label.
- **Blocks:** T-14, T-15, M-01 (the seeding form).
- **Record:** PD3a.

➡️ **Recommended:** b) Seeded profiles will have gaps at launch. Option a) can empty the panel, and [PD11](../decisions/pd-11-launch.md) needs a full panel in each launch area.

### PC-24 · Do the candidate's dealbreakers filter the searcher

❓ Are dealbreakers mutual? If a candidate will not live with a smoker and the searcher smokes, does each person disappear for the other?

- **Today:** Mutual for a signed-in searcher with a profile. One-way for an anonymous searcher. The code flags this rule "for confirmation" (`apps/api/src/match/query.ts:154-176`).
- **Options:** a) Mutual, as built. b) One-way only: only the searcher's dealbreakers filter.
- **Blocks:** T-14.
- **Record:** PD3a.

➡️ **Recommended:** a) Mutual, but use the PC-25 rule in the two directions. A one-way match gives a connect request that the candidate will decline. Today, an unanswered axis on the searcher's side also hides the candidate.

### PC-20 · Which intents match which

❓ Who sees whom for each intent? For example, do two people who each want a full flat see each other, so that they can rent together?

- **Today:** `has_flat` and `wants_room` see each other. `wants_flat` sees `wants_flat`. `open` sees everyone. `unclear` sees nobody (`apps/api/src/match/intent.ts:8-25`).
- **Options:** a) Keep the matrix as built. b) Remove `wants_flat` to `wants_flat`. c) Change the matrix to follow the PC-02 cards.
- **Blocks:** T-14.
- **Record:** PD3a.

➡️ **Recommended:** a) Keep it, and remove the row of each intent that PC-02 drops. Two seekers who team up are flatmates, and [PD0](../decisions/pd-00-v0-scope.md) allows flatmate matching only.

### PC-26 · Budget overlap and move-date window

❓ Do two budgets match when their ranges overlap? Is plus or minus 30 days the correct window for the move date?

- **Today:** Ranges must overlap. The window is plus or minus 30 days. A candidate with no move date passes (`apps/api/src/match/query.ts:129-138`). For a `has_flat` person, the budget is the rent.
- **Options:** a) Keep all three rules. b) Change the window, for example to 15 or 60 days. c) Hide a candidate with no move date.
- **Blocks:** T-14.
- **Record:** PD3a.

➡️ **Recommended:** a) Keep all three rules. Two fixed numbers or dates do not frequently meet, and a strict filter empties a sparse panel. Confirm that "budget" means rent, after PC-18.

### PC-23 · When the match score shows

❓ When does the match score show on a card: after one preference, after more preferences, or after the full minimum slot set?

- **Today:** The code has two gates. The score shows after one `prefer` answer (`apps/api/src/match/query.ts:73-82`). The minimum slot set (move date and two dealbreakers) ends the interview (`query.ts:84-91`). [ai-agent-design.md](../ai-agent-design.md) calls this set "a proposal, for discussion".
- **Options:** a) One preference, as built. b) Three or more preferences. c) The minimum slot set.
- **Blocks:** T-13, T-14, T-15.
- **Record:** PD3a.

➡️ **Recommended:** b) With one preference, the score can only be 70 or 100. That is noise, not a ranking. Option c) gates on dealbreakers, but dealbreakers filter and do not rank. Keep the slot set as the interview gate only. [PD6c](../decisions/pd-06c-interface-holes.md) says "sufficient lifestyle answers".

### PC-28 · Does Form B show to others or rank at launch

❓ Do the notes of the observer (Form B) show on a card to other users? Do they change the ranking at launch?

- **Today:** The query uses Form A only (`apps/api/src/match/query.ts:22-41`). An observation has `visible: true` with no stated audience (`docs/agent-architecture.md:52`). [PD7a](../decisions/pd-07a-agent-architecture.md) says Form B "can inform the ranking".
- **Options:** a) Neither at launch. b) Ranking only. c) Show the notes to others and use them for ranking.
- **Blocks:** T-15, T-35, D-03.
- **Record:** PD3a, and PD7a for the audience of Form B.

➡️ **Recommended:** a) Neither at launch. PC-07 is not settled, so a user cannot correct the notes at this time. Do not show them to others or rank on them until users can correct them. PD7a says "can", not "must".

## Round 2

Prerequisites: PC-23, PC-24 and PC-25 in Round 1. For PC-36, also PC-01 (task F-06), PC-21 in [intake-and-profile.md](intake-and-profile.md) and PC-22 in [connect-and-trust.md](connect-and-trust.md).

### PC-33 · Score formula and how it reads

❓ Is the score "70 + 30 × the share of preferences met"? Does it show as a percentage, a label or a sentence? With no score, is the order "newest first"?

- **Today:** The formula is in `apps/api/src/match/query.ts:190-206`. The order is newest first when there is no score (`query.ts:222-224`).
- **Options:** a) A percentage, for example "85%". b) A label, for example "Strong match". c) A sentence, for example "Meets 3 of your 4 preferences".
- **Blocks:** T-14, T-15.
- **Record:** PD3a.

➡️ **Recommended:** Keep the formula for the ranking, and show c). Keep "newest first". With the formula, a candidate who meets no preferences shows "70%". That is not honest. A count is clear and correct.

### PC-36 · The empty state and out-of-area searches

❓ The panel is empty. Which options do we offer: a larger area, a relaxed dealbreaker, or a notification? A user selects a launch area and an area that is not in the launch. What happens?

- **Today:** There is no design ([design review](../archive/2026-09-design-review.md) 6.1). [PD6](../decisions/pd-06-interface-shape.md) says to define the empty state before launch. Visitors outside the launch areas join a waitlist ([PD2](../decisions/pd-02-launch-market.md)).
- **Options:** a) A larger area. b) Relax the dealbreaker that removes the most people. c) A notification. d) A mix.
- **Blocks:** T-15, T-22b, D-04.
- **Record:** [PD6c](../decisions/pd-06c-interface-holes.md).

➡️ **Recommended:** d) Offer a) and b) at launch. Offer c) as the waitlist form only after PC-22 gives a channel. For a mixed selection, show the launch-area results and add one waitlist line for the other areas. PD2 sends those visitors to the waitlist.
