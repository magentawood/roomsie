# Product numbers

**In one line:** `/admin/numbers` shows the funnel of roomsie from the analytics events, for today, 7 days and 30 days, each against the period before.

## What it is

- The **funnel** is the path of a person through roomsie, in steps: a chat starts, the results show, the sign-in wall, a sign-in, a connect request, an accept, and the close of a goal. Each step counts one event ([Analytics events](analytics-events.md)).
- A **rollup** is a table of counts that a job builds from the events. `event_days` keeps the count of each event of each day in IST, and the count of each value of the fields that the page splits. It has no person.
- The **period before** today is yesterday until the same time. The period before the 7 days is the 7 days before them, and the same for 30 days.

## How it fits our project

```
events ──▶ jobs.count_events(since, until) ──▶ the counts of a time range
                │
                └── 00:30 IST: jobs.roll_up_events(today − 3, yesterday) ──▶ event_days

GET /v1/admin/numbers?period=
  ├── today ─────────▶ count_events: today until now, and yesterday until the same time
  └── week, month ───▶ event_days: the whole days that end yesterday, and the days before them
```

- One SQL function counts the events of a time range. The job and the numbers of today use it, so they count the same way.
- Each night at 00:30 IST, the job counts the last three days again, so a missed night mends itself. The migration `0004_roll_up_events` counted each day that the events had.
- Each step shows its share of the step before it. The steps count events, not people: a guest has no analytics id. Thus a step can be larger than the step before it. Then the page shows "1.1 for each sign-in", not a percent.
- With fewer than 20 in the period before, a change shows as a count, because a percent of a small count jumps. The change of the sign-in wall is gray: more hits of the wall is not good or bad.
- The card of the home shows the chats started, the new accounts and the connect requests of today ([The admin home](admin-home.md)).
- No analytics database, a failed read or a read over 5 s gives no numbers, and the page tells so. The other cards of the home still show.

| Step or card | Event | Field |
|---|---|---|
| Chats started | `interview_started` | |
| Results shown | `results_shown` | |
| Sign-in wall | `wall_hit` | |
| Signed in, and the new accounts | `signed_in` | `newAccount` |
| Connect requests | `connect_sent` | |
| Requests accepted | `connect_accepted` | |
| Goals closed, the card "Where people found it" | `goal_closed` | `where` |
| Limits that stopped people | `limit_hit` | `limit` |
| Reports filed | `report_filed` | `reason` |
| Answers that changed | `slot_conflict` | `slot` |

## The choice we made

- The periods, the comparisons and "events, not people": the spec of [T-66](../plan/tasks/T-66%20Product%20numbers.md).
- A rollup for the dashboards, and the raw events for today: [database.md](../standards/database.md) and [ADR-0012](../decisions/0012-analytics-event-store.md).

## Gotchas

- **A new split:** change `jobs.count_events` in a new migration, then count the old days again: `select jobs.roll_up_events('<first day>', '<yesterday>')`.
- **The schedule:** `select * from cron.job` in the analytics project shows `roll-up-events`. After a restore, the dump has no schedule. Run the `cron.schedule` command of the migration `0004_roll_up_events` again.
- **Nothing deletes the rollup.** It keeps counts, and no person, so it stays after the job of the events drops an old month ([PD19](../decisions/pd-19-retention.md)).
- **From 00:00 to 00:30 IST, yesterday counts 0** on the 7 and 30 days, because the job has not counted it yet. After a missed night, the days stay 0 until the next run. The header of the funnel tells the time of the count.
- **The tests use days three months ahead.** The events table has a partition only from this month on, and a fixed time keeps the edges of the days in IST the same in each run.

## Tickets

- T-66: [#232](https://github.com/magentawood/roomsie/pull/232), 2026-11-05. The rollup and its job, the route, the three pages and the card of the home.
