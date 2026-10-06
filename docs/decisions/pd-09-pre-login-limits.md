# PD9 — Abuse and cost limits on the pre-login chat

**Status:** Settled · **Date:** 2026-09-20 · **Deciders:** Yash

## Context

- The interview occurs before login (PD6b). Thus, the assistant is open to all persons, and anyone can start an interview.
- A completed interview costs approximately ₹1 to ₹2.
- The budget risk is abuse, not legitimate use. A bot that talks all night costs more than a thousand human users.

## Decision

**In one line:** The pre-login chat uses a turn cap of 5 free-text turns and rate limits, with a global daily spend ceiling as the backstop.

**Use the two: a turn cap and rate limits, with a cap of 5.**

The turn cap:

- After five free-text turns, the user must sign in to continue.
- Intent, area and budget are chip-driven. **Chip taps do not count.**
- **Hard rule: the cap cannot stop the chat until the panel renders a minimum of one time.** If slots are missing at turn five, continue until results exist. Then stop.
- **The listings stay on the screen.** Gate the chat, not the results. The wall replaces the chat input with a request to sign in. The user can continue to scroll and filter the panel.
- Put the cap value in config, not in code. When there is traffic, do an A/B test of it.

Rate limits:

| Limit | Scope |
|---|---|
| Sessions for each device | Cookie or fingerprint |
| Sessions for each IP | Catches the naive case |
| Sessions for each IP range | Catches the less naive case |
| Turns each minute | Stops a script that runs at full speed |
| **Daily spend ceiling** | The backstop. Global, not for each user. |

At the ceiling:

- It is not an outage. **Degrade to the zero-cost path.** The chat uses only chips and does not accept free text. The panel is a SQL query.
- Nobody sees an error page.
- **Alert before the ceiling, not at it.** The alert starts at 70% of the daily budget.

## Rationale

- **The turn cap gets conversions. Rate limits stop abuse.**
- Results appear at turn three. The chips fill the panel before the wall appears. Thus, we ask the user to sign in immediately after they see something that they want.
- **Chips have no cost.** A chip tap runs no model. The turn budget controls model cost. Thus, it is incorrect to count chip taps. That also penalises the users with the lowest cost. A user who taps chips for intent, area and budget gets to the results with all five turns available.
- A user who types can use turns on clarification and get to five turns with no results. The user gave effort, got nothing, and left. We paid for the tokens and got no conversion. That is the worst possible result.
- If you remove results that the user saw, it looks like a trick. Manual filters have no cost.
- The cap is a conversion lever, and it is cheap to change. If it is too low, users leave before they invest effort. If it is too high, we pay for tyre-kickers.
- The device limit stops one browser that starts fifty interviews.
- At the ceiling, the product continues to work. But it does not understand sentences until the window resets. The alert lets a person look before users see an effect.
- The budget risk remains abuse, not legitimate use. A thousand interviews a month cost 12 to 25 dollars, against a base of 50 to 80 dollars a month.

## Consequences

- The API is a single machine. It keeps the counters in-process. **This fails at two machines**, because each machine has its own counters, and two machines double the limit.
- Thus, a second machine is not a one-line config change, which ADR 0009 says. Record this dependency.
- Measure from day one. If you do not measure it, you cannot see it:
  - Cost for each completed interview, for each handler. This is the unit that matters.
  - Anonymous sessions that reach results. This shows if the no-wall-before-results rule works.
  - Sign-in rate at the wall. This shows if five is the correct number.
  - Turns to results, as a distribution. This shows if the chips work.
  - Spend by hour.
  - **Blocked sessions by limit type. This is the most important metric.** A rate limit that silently blocks human users is worse than the abuse that it prevents.
- Out-of-scope turns count against the cap (PD10).
- Go/no-go check 3: the abuse test trips the limits, and the spend ceiling falls back to chips (PD11).

## Sources

- [CONTEXT.md, PD9 row](../../CONTEXT.md)
- [product-base.md §12](../product-base.md)
- [pre-login-limits.md](../pre-login-limits.md)
- [cost-and-team.md](../cost-and-team.md)
- [seo-with-gated-products.md](../seo-with-gated-products.md)
- [model-selection.md](../model-selection.md)
- [design-review.md §3](../archive/2026-09-design-review.md)
