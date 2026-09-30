# Limits on the pre-login chat

**Date:** 2026-09-20 · **Status:** settled · **Decision:** PD9

- The interview occurs before login.
- A completed interview costs approximately ₹1 to ₹2.
- **Decision: use the two, a turn cap and rate limits, with a cap of 5.**

Why: [PD9](decisions/pd-09-pre-login-limits.md)

---

## The turn cap

**After five turns, the user must sign in to continue.**

- Intent, area and budget are chip-driven.

Why: [PD9](decisions/pd-09-pre-login-limits.md)

### Guard 1 — chip taps do not count

**Count free-text turns only.** Chip taps do not count in the turn cap.

Why: [PD9](decisions/pd-09-pre-login-limits.md)

### Guard 2 — the wall never appears before results have

- **Hard rule: the cap cannot stop the chat until the panel renders a minimum of one time.**
- If slots are missing at turn five, continue until results exist. Then stop.

Why: [PD9](decisions/pd-09-pre-login-limits.md)

### What the wall looks like

- **The listings stay on the screen.** Gate the chat, not the results.
- The wall replaces the chat input with a request to sign in.
- The user can continue to scroll and filter the panel.

Why: [PD9](decisions/pd-09-pre-login-limits.md)

### Five is a tuning knob, not a constant

- Put the cap value in config, not in code.
- When there is traffic, do an A/B test of it.

Why: [PD9](decisions/pd-09-pre-login-limits.md)

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

Why: [PD9](decisions/pd-09-pre-login-limits.md), [ADR 0009](decisions/0009-hosting-and-region.md)

---

## What happens at the ceiling

- It is not an outage. **Degrade to the zero-cost path.**
- The chip-driven flow runs no models:
  - Intent, area and budget use scripted questions with enum answers.
  - The panel is a SQL query.
- At the spend ceiling, the assistant does not accept free text. It uses only chips.
- Nobody sees an error page.
- **Alert before the ceiling, not at it.** The alert starts at 70% of the daily budget.

Why: [PD9](decisions/pd-09-pre-login-limits.md)

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

Why: [PD9](decisions/pd-09-pre-login-limits.md)
