# Limits on the pre-login chat

**Date:** 2026-09-20 · **Status:** settled · **Decision:** D9

The interview runs before login, so the assistant is open to anyone. At roughly
₹1 to ₹2 per completed interview, a bot talking all night costs more than a
thousand real users.

**Decision: both a turn cap and rate limits, with a cap of 5.**

---

## The turn cap

**Five turns, then sign in to continue.**

This works because results appear at turn three. Intent, area and budget are
chip-driven, so the user sees the panel fill before the wall arrives. They are
asked to sign in at the moment they have just seen something they want, which
is the right moment to ask.

### Guard 1 — chip taps do not count

A chip tap costs nothing. It runs no model. Counting it against a budget that
exists to control model spend is wrong, and it punishes the users who are
cheapest to serve.

**Count free-text turns only.** A user who taps through intent, area and budget
arrives at results having spent none of their five.

### Guard 2 — the wall never appears before results have

Someone who types instead of tapping can burn turns on clarification. "I'm
looking for a place", then "somewhere central", then a clarifying question, and
they are at five with no results shown.

That is the worst outcome available. They gave effort, got nothing, and left.
You paid for the tokens and got no conversion.

**Hard rule: the cap cannot trigger until the panel has rendered at least
once.** If slots are still missing at turn five, keep going until results
exist, then stop.

### What the wall looks like

**The listings stay visible.** Gate the chat, not the results. Taking away what
they have already seen reads as a trick.

The chat input is replaced by a sign-in prompt. Scrolling and filtering the
panel keep working, because manual filters cost nothing.

### Five is a tuning knob, not a constant

It is a conversion lever and it is cheap to change. Put it in config, not in
code, and A/B it once there is traffic. Too low and people leave before they
are invested. Too high and you pay for tyre-kickers.

---

## Rate limits

The turn cap converts. These stop abuse. They are different jobs.

| Limit | Scope |
|---|---|
| Sessions per device | Cookie or fingerprint. Stops one browser starting fifty interviews. |
| Sessions per IP | Catches the naive case. |
| Sessions per IP range | Catches the less naive case. |
| Turns per minute | Stops a script running flat out. |
| **Daily spend ceiling** | The backstop. Global, not per user. |

**Where these live.** ADR 0009 rejected serverless partly because rate limiting
wants an in-process counter rather than an external round trip per request, and
the API is a single long-running Fly machine. That works today.

**It stops working at two machines.** In-process counters are per-machine, so
two machines means double the limit. ADR 0009 calls a second machine a one-line
config change. It is not, once counters exist. Note the coupling now.

---

## What happens at the ceiling

Not an outage. **Degrade to the zero-cost path.**

The chip-driven flow runs no models at all. Intent, area and budget are
scripted questions with enum answers, and the panel is a SQL query. So when the
spend ceiling is hit, the assistant stops accepting free text and falls back to
chips only.

The product still works. It just stops understanding sentences until the
window resets. Nobody sees an error page.

**Alert before the ceiling, not at it.** An alert at 70% of the daily budget
gives someone a chance to look before users notice anything.

---

## What to measure

| Metric | Why |
|---|---|
| Cost per completed interview | The unit that matters, split by handler |
| Anonymous sessions reaching results | Whether guard 2 is doing its job |
| Sign-in rate at the wall | Whether five is the right number |
| Turns to results, distribution not mean | Whether the chips are working |
| Spend by hour | Whether DeepSeek's peak window bites |
| Blocked sessions by limit type | Whether a limit is catching real users |

That last one matters most. A rate limit that quietly blocks genuine users is
worse than the abuse it prevents, and it is invisible unless measured.
