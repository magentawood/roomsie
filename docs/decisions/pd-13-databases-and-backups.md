# PD13 — Databases and backups

**Status:** Settled, as an exception · **Date:** 2026-09-26 · **Deciders:** Yash

## Context

- On 26 September, the isolated analytics database came back into the launch (PD11). The main and analytics databases are two Supabase projects.
- The Supabase acceptable use policy discourages more accounts.
- The free plan has no backups.

## Decision

**In one line:** The main and analytics databases are on two free Supabase accounts, with a nightly dump of the two databases to R2.

- **The main and analytics databases are on two free Supabase accounts.**
- **A nightly dump of the two databases goes to R2** (T-40).
- **When we start to pay, the two projects move into one paid organisation.**
- **Connection details are only in environment settings.**

## Rationale

- The two databases are on free Supabase accounts. Thus, we added nightly backups.
- With a backup, a bad migration on day three is undone from the copy of last night. The data stays available.
- Analytics in its own database keeps analytics writes off the main database. Many "results shown" events at one time cannot make a profile save slow.
- **The move to one paid organisation is a transfer, not a code change.** This is correct only because the connection details of each database are only in environment settings.

## Consequences

- This is the one intentional exception in `extensibility.md`. The result is no backups on the free plan, and a policy risk. The nightly dumps give the backups.
- T-39 builds the analytics database. T-40 builds the nightly backups to R2.
- Go/no-go check 8: the backup from last night exists, and a restore worked one or more times.
- If the app reaches a free Supabase limit, upgrade that account. Or move the two projects into one paid organisation before the planned time. This needs no code changes.

## Revisit when

We start to pay, or the app reaches a free Supabase limit.

## Sources

- [CONTEXT.md, PD13 row and Why callout](../../CONTEXT.md)
- [product-base.md, Still open](../product-base.md)
- [launch-plan.md, Update 26 September](../archive/2026-09-launch-plan.md)
- [extensibility.md](../extensibility.md)
- [how-to-work.md](../how-to-work.md)
- [team-plan.md, If things go incorrectly](../team-plan.md)
