# Limits on the pre-login chat

**Date:** 2026-09-20 · **Status:** settled · **Decision:** PD9

- The interview occurs before login.
- A completed interview costs approximately ₹1 to ₹2.
- **Decision: use the two, a turn cap and rate limits, with a cap of 5.**

> [!note]- Why
> - Before login, the assistant is open to all persons.
> - A bot that talks all night costs more than a thousand human users.

---

## The turn cap

**After five turns, the user must sign in to continue.**

- Intent, area and budget are chip-driven.

> [!note]- Why
> - This works because results appear at turn three.
> - The chips fill the panel before the wall appears.
> - Thus, we ask the user to sign in immediately after they see something that they want. That is the correct time.

### Guard 1 — chip taps do not count

**Count free-text turns only.** Chip taps do not count in the turn cap.

> [!note]- Why
> - A chip tap runs no model, so it has no cost.
> - The turn budget controls model cost. Thus, it is incorrect to count chip taps in it.
> - That also penalises the users with the lowest cost.
> - Example: a user who taps chips for intent, area and budget gets to the results with all five turns available.

### Guard 2 — the wall never appears before results have

- **Hard rule: the cap cannot stop the chat until the panel renders a minimum of one time.**
- If slots are missing at turn five, continue until results exist. Then stop.

> [!note]- Why
> - A user who types and does not tap can use turns on clarification.
> - Example: "I'm looking for a place", then "somewhere central", then a question to clarify. The user is then at five turns with no results.
> - That is the worst possible result. The user gave effort, got nothing, and left.
> - We paid for the tokens and got no conversion.

### What the wall looks like

- **The listings stay on the screen.** Gate the chat, not the results.
- The wall replaces the chat input with a request to sign in.
- The user can continue to scroll and filter the panel.

> [!note]- Why
> - If you remove results that the user saw, it looks like a trick.
> - Manual filters have no cost.

### Five is a tuning knob, not a constant

- Put the cap value in config, not in code.
- When there is traffic, do an A/B test of it.

> [!note]- Why
> - The cap is a conversion lever, and it is cheap to change.
> - If the cap is too low, users leave before they are invested.
> - If it is too high, we pay for tyre-kickers.

---

## Rate limits

- The turn cap gets conversions.
- Rate limits stop abuse.

| Limit | Scope |
|---|---|
| Sessions per device | Cookie or fingerprint |
| Sessions per IP | Catches the naive case |
| Sessions per IP range | Catches the less naive case |
| Turns per minute | Stops a script that runs at full speed |
| **Daily spend ceiling** | The backstop. Global, not for each user. |

**Where these live:**

- ADR 0009 rejected serverless.
- The API is a single Fly machine that runs for a long time. It keeps the counters in-process.
- This works today. **It fails at two machines.**
- When counters exist, a second machine is not a one-line config change.
- Record this dependency today.

> [!note]- Why
> - Sessions per device stops one browser that starts fifty interviews.
> - Rate limiting needs an in-process counter, not an external round trip for each request. This is one reason that ADR 0009 rejected serverless.
> - Each machine has its own in-process counters. Thus, two machines double the limit.
> - ADR 0009 says that a second machine is a one-line config change.

---

## What happens at the ceiling

- It is not an outage. **Degrade to the zero-cost path.**
- The chip-driven flow runs no models:
  - Intent, area and budget use scripted questions with enum answers.
  - The panel is a SQL query.
- At the spend ceiling, the assistant does not accept free text. It uses only chips.
- Nobody sees an error page.
- **Alert before the ceiling, not at it.** The alert starts at 70% of the daily budget.

> [!note]- Why
> - The product continues to work. But it does not understand sentences until the window resets.
> - The alert lets a person look before users see an effect.

---

## What to measure

| Metric | Notes |
|---|---|
| Cost per completed interview | Split it by handler |
| Anonymous sessions that reach results | Shows if guard 2 does its job |
| Sign-in rate at the wall | Shows if five is the correct number |
| Turns to results | A distribution, not a mean |
| Spend by hour | Shows if DeepSeek's peak window has an effect |
| **Blocked sessions by limit type** | Shows if a limit stops human users. The most important metric. |

> [!note]- Why
> - Cost per completed interview is the unit that matters.
> - Turns to results shows if the chips work.
> - A rate limit that silently blocks human users is worse than the abuse that it prevents.
> - If you do not measure it, you cannot see it.
