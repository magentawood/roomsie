# Goals: the list, the close and the feedback

**In one line:** each search is one goal, with a title that code builds from Form A; the person closes it with "I found a place", reopens it when they want, and can send a face and a few words after the close.

## What it is

- A **goal** is one move: one chat, its Form A and its results ([ADR-0017](../decisions/0017-schema-v1-shape.md)). A person or a visitor can have many goals.
- The **title** names the place type and the first area: "Room hunting in Bandra–Santacruz", "Teaming up to rent around Powai". With no area yet, it is "New goal". The API builds it and sends it with the goal, each turn and the list, so the header and the list agree, and it changes when the area changes.
- The **goal list** is in the sidebar on a computer. On a phone, the title above the chat opens it. It shows the 50 newest goals, and a closed goal has a "Closed" mark.
- **A new goal** starts at `/start?new`: "New Goal", the phone "+" and "Start a new goal" ([the onboarding](onboarding.md)).
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

- **The address names the goal.** `/chat?goal=<id>` opens that goal. Local storage keeps the last goal that the API gave, so `/chat` opens it again, and a link to a goal of a different person changes nothing ([the chat screen](chat-screen.md)).
- **Only the owner** closes, reopens or sends feedback: the token of the person, or the visitor key of the session.
- **A closed goal refuses a typed turn, a tap and a waitlist join** with 409, before any model call. A second close or reopen changes nothing and logs nothing.
- **The events** `goal_closed` (with the answer) and `goal_reopened` count the found places ([analytics events](analytics-events.md)). The goal row keeps only its status.
- **One feedback for each closed goal**, from its owner. This lets a visitor send it with no new spam limit, because the chat limits already limit the goals of a visitor ([PD9](../decisions/pd-09-pre-login-limits.md)).
- **A visitor goal goes** with its session, 30 days after the last visit, with its feedback. A goal that moved to an account at sign-in stays ([the visitor chat at sign-in](visitor-chat-claim.md)).

## The choice we made

- The scope, the title, the read-only goal, Reopen, the feedback, the visitors and the limit: the spec of T-50.

## Gotchas

- **The minutes of a deploy.** The old API has no route for a close, a reopen or the feedback, and Fastify answers 404 "Route … not found". `errorText()` turns it into "This starts in a few minutes. Try again soon." The old API also has no list, so the list is empty for those minutes.
- **A reopen and a second close** ask no feedback when the goal has its feedback: the close answers `askFeedback`. A goal whose pop-up was skipped gets the pop-up again.
- **The status "found" became "closed"**, because a dropped plan is not a found place. No code wrote "found", so the migration was safe for the API before it.

## Tickets

- T-50: the list, the title, the close, the reopen and the feedback.
- T-67: [#234](https://github.com/magentawood/roomsie/pull/234), 2026-11-05. The nightly delete of the old visitor goals.
