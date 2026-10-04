# PD13 — Databases and backups

**Status:** Settled, as an exception. Changed on 2026-10-04. · **Date:** 2026-10-04 · **Deciders:** Yash

## Context

- On 26 September, the isolated analytics database came back into the launch (PD11). The main and analytics databases are two Supabase projects.
- The Supabase acceptable use policy discourages more accounts for one user.
- The free plan allows two active projects.
- The free plan has no backups.

## Decision

**In one line:** The main and analytics databases are two free projects in one Supabase account, with a nightly dump of both to R2.

- **The main and analytics databases are two free projects in one Supabase account and organisation.**
- **A nightly dump of the two databases goes to R2** (T-40).
- **When we start to pay, the organisation changes to a paid plan.**
- **Connection details are only in environment settings.**

## Rationale

- One account obeys the Supabase policy, and the free plan holds the two projects.
- The two databases are on the free plan. Thus, we added nightly backups.
- With a backup, a bad migration on day three is undone from the copy of last night. The data stays available.
- Analytics in its own database keeps analytics writes off the main database. Many "results shown" events at one time cannot make a profile save slow.
- **The change to a paid plan is a plan change, not a code change.** The connection details of each database are only in environment settings.

## Consequences

- This is the one intentional exception in `extensibility.md`. The result is no backups on the free plan. The nightly dumps give the backups.
- T-39 builds the analytics database. T-40 builds the nightly backups to R2.
- Go/no-go check 8: the backup from last night exists, and a restore worked one or more times.
- If the app reaches a free Supabase limit, change the organisation to a paid plan before the planned time. This needs no code changes.

## Revisit when

We start to pay, or the app reaches a free Supabase limit.

Superseded (2026-10-04): two free Supabase accounts, one for each database. That broke the Supabase policy on more accounts.

## Sources

- [CONTEXT.md, PD13 row and Why callout](../../CONTEXT.md)
- [product-base.md, Still open](../product-base.md)
- [launch-plan.md, Update 26 September](../archive/2026-09-launch-plan.md)
- [extensibility.md](../extensibility.md)
- [how-to-work.md](../how-to-work.md)
- [team-plan.md, If things go incorrectly](../team-plan.md)
