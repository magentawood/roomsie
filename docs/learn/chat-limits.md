# The limits of the chat

**In one line:** a visitor gets five typed messages before the sign-in wall, the API stops a device or a network that starts too many chats and a person who types too fast, and the team gets an alert when the model spend of the day gets near its amount.

## What it is

- **The turn cap.** A visitor with no account gets five typed turns. Then "Sign in to keep chatting" comes, and the results stay on the screen. Chip taps do not count. The wall never comes before results show, except at the backstop of 15 typed turns ([PD9](../decisions/pd-09-pre-login-limits.md)).
- **The rate limits.** They stop a script, not a person: new visitor chats in 24 hours for each device, each IP address and each IP range, and typed turns in a minute for each person.
- **The daily spend.** Each model call adds its cost to the row of the day. At 70% and at 100% of the amount, one Telegram message goes to the team group. The chat never stops for money.

All the values are first guesses in config, until two to three months of data ([pre-login-limits.md](../pre-login-limits.md)).

## How it fits our project

| Part | Where |
|---|---|
| The values | `limitSettings` in `apps/api/src/goals/settings.ts`, and `spendSettings` in `apps/api/src/models/settings.ts` |
| The counts and the hashes | `apps/api/src/goals/limits.ts` |
| The refusals: `turn_cap`, `too_many_chats`, `too_fast` | the goals routes, with `limitRefusal` of `packages/contract` |
| The spend of each day and the alerts | `apps/api/src/models/spend.ts`, and the table `model_spend` |
| The wall, the button and the two messages | `apps/web/components/chat/chat-screen.tsx` |

- **A device** is one IP address with one browser. The database keeps only the hashes of the device, the address and its range (/24 for IPv4, /48 for IPv6), never the address.
- **The IP address** comes from the load balancer of Lightsail. The API trusts one hop of `X-Forwarded-For`, so an address that the browser writes in the header does not count.
- **A typed turn over a limit** gets its refusal before the router and the extractor, so it costs nothing. The cap sends `wall_hit`, and each rate limit sends `limit_hit` with its name.
- **The count of typed turns** is `turn_count` of the visitor session, across all its goals. A signed-in person has no cap and no session limit.

## The choice we made

- The counts are in the database, and the spend is an alert, not a stop: [PD9](../decisions/pd-09-pre-login-limits.md).

## Gotchas

- **The cost is an estimate.** It uses the full price of each vendor, and DeepSeek costs half off-peak, so the estimate is high.
- **Each alert goes one time a day, also from two machines.** The update of `alerted` is the lock: only one call moves it past 70 or 100.
- **The router and the extractor run at the same time,** so two writes of the spend can come together. The total of the row is right, because each write adds to it.
- **The other test files have very high limits** (`noLimits` in `test/app.ts`), because they send many turns from one address. The tests of the limits set their own small values.

## Tickets

- T-21: the cap, the backstop, the rate limits and the spend alerts.
- T-29: the abuse test of the limits.
- T-17: a sign-in carries the visitor chat into the account.
