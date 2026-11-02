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
- **The backstop:** at 15 typed turns, the wall comes also with no results.

Why: [PD9](decisions/pd-09-pre-login-limits.md)

### What the wall looks like

- **The listings stay on the screen.** Gate the chat, not the results.
- The wall is the sign-in modal of the designs, over the blurred screen. On a phone, it is a sheet.
- The user can close the modal, then scroll and filter the panel. The chat input becomes a sign-in button. The button and a tap on a chat chip open the modal again.

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
| **Daily spend amount** | An alert, not a stop. Global, not for each user. |

**Where these live:** in the database. The typed turns and the visitor sessions come from their tables, and the spend from one row for each day. A deploy or a second API machine does not change a count.

**The first values are guesses** in config, until two to three months of data (PC-10):

| Limit | First value |
|---|---|
| Typed turns before the wall | 5, and the backstop at 15 |
| New visitor sessions in 24 hours | 10 for each device, 100 for each IP address, 500 for each IP range |
| Typed turns in a minute | 10 for each person |
| Daily spend amount | ₹500 |

A session limit gets "Too many chats from this network today. Sign in, or come back tomorrow.", with a Sign in button. The limit of a minute gets "You're sending fast. Wait a moment, then send it again." 

Why: [PD9](decisions/pd-09-pre-login-limits.md), [ADR 0009](decisions/0009-hosting-and-region.md)

---

## What happens at the daily spend amount

- **The chat keeps working.** The amount is not a stop.
- A Telegram message goes to the team group at 70% and at 100%, one time each day.
- The turn cap and the rate limits stop abuse.

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
