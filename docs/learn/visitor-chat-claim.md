# The visitor chat at sign-in

**In one line:** when a visitor signs in, one claim request moves the chats of the visitor session to the account, and the visitor key ends.

## What it is

- **A visitor session** holds the chats of a person with no account. The browser keeps its visitor key, and the database keeps only the hash of the key ([the assistant turn](assistant-turn.md)).
- **The claim** is `POST /v1/goals/claim`. It needs the sign-in token and the visitor key, and it answers 204. One transaction moves these to the account:
  - each goal of the session, with its chat turns, Form A, its outside places, its waitlist entries, its feedback and its traces ([Traces of the model calls](traces.md));
  - the Form B notes of the session ([Form B notes](form-b-notes.md));
  - the latest own religion and community of the goals, to the profile, as the newer statement ([the hidden filter](hidden-filter.md)). With no profile, the values stay on the goal, and a new profile reads them.
- **The key ends.** The claim marks the session as claimed by the account, and ends it. The old key then opens no chat, and a new chat with it gets a new visitor session.

## How it fits our project

| Part | Where |
|---|---|
| The claim route | `apps/api/src/goals/routes.ts` |
| The move in one transaction | `claimSession()` in `apps/api/src/goals/store.ts` |
| The claim of the browser | `claimVisitorChat()` in `apps/web/lib/claim.ts`, called by the auth provider in `apps/web/lib/auth.tsx` |

- **When it runs.** The auth provider sends the claim each time a signed-in person appears: at the sign-in, and at each load of a page. With no visitor key, it sends nothing.
- **After a claim**, the browser forgets the visitor key and keeps the goal of the chat. The chat and the profile load again, and the chat goes on at the next open question.
- **A failed claim** keeps the key. The chat still works with the token and the key, and the next load tries again. The invite gate (T-33) refuses an account before anything moves, and that refusal is not an error report.

## The choice we made

- One claim request at sign-in, safe to repeat: the spec of T-17, which the user approved.
- The goals move to the account at login: [ADR-0017](../decisions/0017-schema-v1-shape.md).

## Gotchas

- **The claim is safe to repeat.** A second claim, a session that a different account claimed, and an expired key move nothing, and each gets 204.
- **The session stays.** A claimed session is never deleted, so the notes and the counts of T-21 keep their rows. Account deletion removes it with the account.
- **Two goals of one move stay two goals.** The claim merges nothing with the goals that the account has.

## Tickets

- T-17: the claim of the visitor chat at sign-in.
- T-48: [the onboarding](onboarding.md) asks its questions before the sign-in, and a guest goal from it moves at the sign-in as each visitor goal does.
