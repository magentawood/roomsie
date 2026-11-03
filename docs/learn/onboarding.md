# The onboarding and the profile completion card

**In one line:** `/start` asks the first questions of flow 01, then the sign-in, and one request starts the goal with the answers in Form A. The completion card shows how much of the profile is done.

## What it is

- **The onboarding** is at `/start`. It has the steps of flow 01 of the Product file: "What brings you to Roomsie?", "Who's moving?", "What kind of place?", "Budget per month?" and "Where do you want to live?". Each step has Previous, Skip and Next. A bar of four parts shows the four questions after the purpose.
- **"Sign in to continue"** comes after the questions, with "Sign up with Google" and "Guest login". A signed-in person does not see it.
- **A lister** picks "I have a place to list". The next step is "Sign in to continue" with Google only, then the listing flow.
- **The start request** is `POST /v1/goals` with the answers: `intent`, `whosMoving`, `area` and `budget`, with the values of the chips. The API writes them into Form A as stated answers, as a chip tap does, and saves one assistant turn, for example "Got it: a room in a shared flat, a student, Andheri–Goregaon, up to ₹25,000. When do you want to move in?". It calls no model.
- **The profile completion card** shows the percentage of the profile, "Update Profile" and a close button. It is in the sidebar on a computer, and above the chat on a phone.

## How it fits our project

| Part | Where |
|---|---|
| The start answers | `goalStart` in `packages/contract/src/goals.ts` |
| The answers into Form A, and the line | `runStart()` in `apps/api/src/assistant/assistant.ts` |
| The goal and its first turn, in one transaction | `startGoal()` in `apps/api/src/goals/store.ts` |
| The steps, Previous, Skip and the start answers | `apps/web/lib/onboarding.ts`, with unit tests |
| The screens | `apps/web/components/onboarding/onboarding.tsx`, at `apps/web/app/start/page.tsx` |
| The percentage | `completionOf()` in `apps/api/src/profiles/read.ts`, as `completion` of the own profile |
| The card | `apps/web/components/profile/completion-card.tsx` |
| The images of the steps | `apps/web/public/onboarding/` |

- **Each chat starts here.** "Start looking", "Open Roomsie", "New Goal" and the phone "+" open `/start`. `/chat` with no goal on the browser goes to `/start`. A person with a goal on the browser goes from `/start` to the chat.
- **A skipped step** leaves its slot empty, and the chat asks it later. With no answer, the line asks the first question, with the place-type chips.
- **"Looking for my son or daughter"** asks one more choice: Student, Starting their first job or Working. That answer is who is moving (PD15).
- **The limits stay the same** ([the limits of the chat](chat-limits.md)). The start is a new chat, so the limits of new visitor chats apply. A refusal shows under the sign-in buttons, next to "Sign up with Google".
- **The percentage** has 11 parts of equal weight: a photo, the name, the age, the gender, who is moving, the areas, the budget, the move date, the job, the bio, and the eight lifestyle answers as one part. A new profile has 3 parts, so 27%. The API gives it with the own profile, because the web has no business logic. The card hides at 100%, on the profile page, and after a close until the tab closes.

## The choice we made

- The screens of v0 are the designs: [PD14](../decisions/pd-14-v0-is-the-figma-designs.md). The steps before the sign-in, one start request and the 11 parts: the spec of T-48, which the user approved.
- Who is moving, and the answer of a parent: [PD15](../decisions/pd-15-form-a-contract.md) and [PD16](../decisions/pd-16-profiles.md).

## Gotchas

- **An area must be an area group.** A sub-area or an unknown area gets 400 `not valid: areas`, before a visitor session exists.
- **The minutes of a deploy.** Vercel goes live before the API. The old API ignores the start answers and makes an empty goal, so the chat opens on its empty screen, "What are we looking for?". The old API also gives no `completion`, so the card does not show.
- **The art of each step** is a square image. A computer shows a tall part of it, and a phone a wide band. `x` and `y` in the screen code set the part that shows.
- **The footer has no email.** The designs show one, but the code keeps emails out of the repo.

## Tickets

- T-48: the onboarding, the start request and the completion card.
- T-60: the pop-up after the first sign-in.
