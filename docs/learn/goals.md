# Goals: the list, the close and the feedback

**In one line:** each search is one goal, with a title from Form A, and "Same move?" stops a second goal for one move. The person closes a goal with "I found a place", can reopen it, and can send feedback after the close.

## What it is

- A **goal** is one move: one chat, its Form A and its results ([ADR-0017](../decisions/0017-schema-v1-shape.md)). A person or a visitor can have many goals.
- The **title** names the place type and the first area: "Room hunting in Bandra–Santacruz", "Teaming up to rent around Powai". With no area yet, it is "New goal". The API builds it and sends it with the goal, each turn and the list, so the header and the list agree, and it changes when the area changes.
- The **goal list** is in the sidebar on a computer. On a phone, the title above the chat opens it. It shows the 50 newest goals, and a closed goal has a "Closed" mark.
- **A new goal** starts at "What are we looking for?" of flow 02, at `/chat`: "New Goal", New goal of the phone "+", "Start a new goal", and Chats in a new visit. The first message or chip makes the goal, then the address names it. The landing page goes to [the onboarding](onboarding.md) first.
- **"Same move?"** comes before the first search of a new goal that looks like an open goal of the same person. The assistant says "Quick check before I search: you already have a chat for a move going. Is this the same move? I won't change anything until you say." Two chips follow: "Same move: continue in <title of that goal>" and "No, it's a separate move" (Figma 67:6489).
- **"I found a place"** opens the pop-up "Yay! Where did you find it?": On Roomsie, Somewhere else, or None, I dropped the plan. Each answer closes the goal.
- A **closed goal** is read-only. Its chat and its results stay, and in place of the input it shows "Reopen" and "Start a new goal".
- The **feedback pop-up** follows the close: one of five faces, and words if the person wants. Moderators read it on `/admin/feedback`, with the feedback of [the landing page](landing-page.md).

## How it fits our project

| Part | Where |
|---|---|
| The title and the list | `goalTitle()` in `packages/contract/src/goals.ts`, `titleOf()` and `goalsOf()` in `apps/api/src/goals/store.ts`, and `GET /v1/goals` |
| The close and the reopen | `POST /v1/goals/:id/close` and `/reopen`, `setGoalStatus()` in `apps/api/src/goals/store.ts` |
| The feedback of a goal | `POST /v1/goals/:id/feedback`, `saveGoalFeedback()` in `apps/api/src/feedback/read.ts` |
| The header, the list and the switcher | `apps/web/components/goals/goal-list.tsx` |
| The two pop-ups | `apps/web/components/chat/found-dialogs.tsx` |
| "Same move?": the match | `sameMoveOf()` in `apps/api/src/goals/same-move.ts` |
| "Same move?": the held message and the answer | `runTurn()` and `runHeld()` in `apps/api/src/assistant/assistant.ts`, `POST /v1/goals/:id/same-move`, `moveHeld()` in `apps/api/src/goals/store.ts` |
| The two chips | `apps/web/components/chat/same-move.tsx` |

- **The address names the goal.** `/chat?goal=<id>` opens that goal, and a link to a goal of a different person opens nothing. `/chat` with no goal starts a new goal ([the chat screen](chat-screen.md)).
- **Only the owner** closes, reopens or sends feedback: the token of the person, or the visitor key of the session.
- **A closed goal refuses a typed turn, a tap and a waitlist join** with 409, before any model call. A second close or reopen changes nothing and logs nothing.
- **The events** `goal_closed` (with the answer) and `goal_reopened` count the found places ([analytics events](analytics-events.md)). The goal row keeps only its status.
- **One feedback for each closed goal**, from its owner. This lets a visitor send it with no new spam limit, because the chat limits already limit the goals of a visitor ([PD9](../decisions/pd-09-pre-login-limits.md)).
- **A visitor goal goes** with its session and its feedback, through the nightly job. Its waitlist entries stay with no chat. A goal that moved to an account at sign-in stays ([the visitor chat at sign-in](visitor-chat-claim.md)).

## "Same move?"

- **When it asks.** The owner has another open goal of the same kind (places or people), with an area group in common, or with no area on either side. A sub-area counts as its group. The goal that changed last gets the chip. The check runs on the first typed message of a goal, and on the answers of [the onboarding](onboarding.md).
- **It does not ask** for a message with no place type, or a message that the extractor did not read. It does not ask for a band that is not core, for danger, or for a religion or a community ([PD3c](../decisions/pd-03c-exclusionary-preferences.md)).
- **The held message.** The reply keeps the values of the message by slot, so neither goal changes until the answer. A typed message in that time gets "First, tap one of the two answers…" and changes nothing. A chip of Form A gets 409.
- **"No, it's a separate move"** puts the values in the new goal. The reply asks the next question, and the search goes on.
- **"Same move"** puts the values in the other goal, as the values of a typed turn. An earlier stated value stays, and the reply asks which to keep ([PD3b](../decisions/pd-03b-interview-vs-chips.md)). The message moves to the other goal with the reply. The new goal goes with its chat, and the web opens the other goal.
- **An answer calls no model.** It is a chip, so it is not one of the typed turns of the cap ([PD9](../decisions/pd-09-pre-login-limits.md)). The event `same_move` gives the step: `asked`, `same` or `separate`.

## The choice we made

- The scope, the title, the read-only goal, Reopen, the feedback, the visitors and the limit: the spec of T-50.
- "Same move?": the ask of the founders of 2026-11-09 ("whenever there's a new goal we need to scan if that goal already existed"), and frame 67:6489 of the designer.

## Gotchas

- **The minutes of a deploy.** The old API has no route for a close, a reopen or the feedback, and Fastify answers 404 "Route … not found". `errorText()` turns it into "This starts in a few minutes. Try again soon." The old API also has no list, so the list is empty for those minutes.
- **A reopen and a second close** ask no feedback when the goal has its feedback: the close answers `askFeedback`. A goal whose pop-up was skipped gets the pop-up again.
- **A name of two areas**, such as "Andheri", fills no area. Such a first message thus asks "Same move?" only when the other goal has no area either.
- **The other goal can close before the answer.** Then "Same move" gets 409, and "No, it's a separate move" still works.
- **The minutes of a deploy.** An old web shows "Same move?" with no chips, and a typed message gets the question again. A reload loads the new web.
- **The status "found" became "closed"**, because a dropped plan is not a found place. No code wrote "found", so the migration was safe for the API before it.

## Tickets

- T-50: the list, the title, the close, the reopen and the feedback.
- T-67: [#234](https://github.com/magentawood/roomsie/pull/234), 2026-11-06. The nightly delete of the old visitor goals.
- [#243](https://github.com/magentawood/roomsie/pull/243), 2026-11-07. A new goal opens the empty chat of the designs.
- [#269](https://github.com/magentawood/roomsie/pull/269), 2026-11-09. "Same move?" on the first message of a new goal and on the answers of the onboarding.
