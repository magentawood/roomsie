# Analytics events

**In one line:** the API records what people do, for example "connect sent", in an `events` table of a second database, with no text and no `users.id`.

## What it is

- An **event** is one row that tells that something happened: its name, a version, the person who did it and a few fields. "Signed in", "connect sent", "connect accepted" and "report filed" are examples.
- The **actor** is the person of the event. It is a random **analytics id** from the users row, not `users.id`.
- The **analytics database** is a second Supabase project. The events stay off the main database, so a burst of events cannot slow a profile save ([ADR-0012](../decisions/0012-analytics-event-store.md), [PD13](../decisions/pd-13-databases-and-backups.md)).
- A **partition** is a sub-table for one month of events. Postgres puts each row in the partition of its month. An old month goes away with one quick drop.

## How it fits our project

```
a route ──▶ track(req, event) ──▶ memory ──▶ one insert each 5 s or 100 events ──▶ events (analytics database)
                 │
                 └─ Zod parse with the schema of packages/contract
```

- **One function:** product code writes an event only with `app.analytics.track(req, event)`. The module has no read function, so no product code depends on the analytics database ([extensibility.md](../extensibility.md)).
- **The schemas:** each event is a Zod schema in `packages/contract` with `eventVersion`. A change of its fields gives a new version. No schema has a text field.
- **The actor:** `track()` takes the analytics id of the signed-in person of `req`. A guest has no actor. Account deletion clears the analytics id in the users row. After that, no row links the events to the person, and the deletion makes no call to the analytics database.
- **Signed in:** the users row keeps the `auth_time` of the latest sign-in. A token with a later `auth_time` fires "signed in" one time. A token refresh keeps its `auth_time`, so it fires nothing.
- **Best effort:** a bad event or a failed insert goes to the log, and the route still succeeds. At a shutdown (SIGTERM at a deploy), the API first writes the events in memory.
- **The job:** each day at 04:00 IST, `pg_cron` runs `jobs.maintain_events(12)` in the analytics database. It makes each missing monthly partition, in UTC, to 12 months ahead, with row level security. It drops each partition whose whole month is older than 12 months ([PD19](../decisions/pd-19-retention.md)). The migration `0002_maintain_events` makes the function and the schedule.
- **Migrations:** the analytics database has its own folder, `apps/api/drizzle-analytics`. `node dist/migrate.js` migrates both databases. The deploy gives it `ANALYTICS_DATABASE_URL_SESSION`.
- **Local work:** with no `ANALYTICS_DATABASE_URL`, `track()` does nothing. The tests make a disposable analytics database for each test file that checks events.

| Event | Fires | Fields |
|---|---|---|
| `signed_in` | at each new sign-in | `newAccount` |
| `connect_sent` | `POST /v1/requests` | `to`: person or listing |
| `connect_accepted` | an accept of a request | `to` |
| `report_filed` | `POST /v1/reports`, not a repeat | `subject`, `reason` |
| `interview_started` | T-12 | none |
| `results_shown` | T-14 | `count` |
| `wall_hit` | T-21, at the turn cap | none |

## The choice we made

- Our own Postgres, not an analytics vendor, with batched writes and monthly partitions ([ADR-0012](../decisions/0012-analytics-event-store.md)).
- An analytics id in place of `users.id`, so a deletion cuts the link in one transaction of the main database ([#176](https://github.com/magentawood/roomsie/pull/176)).
- Deletion by whole month ([PD19](../decisions/pd-19-retention.md)).
- `pg_cron` in the database, not a job in the API, so the job runs with no API ([#182](https://github.com/magentawood/roomsie/pull/182)).

## Gotchas

- Postgres refuses an insert when no partition holds its month. The job makes 12 months ahead, so a missed run is not urgent. To see the runs: `select * from cron.job_run_details order by start_time desc limit 5`.
- A partition is also a table that the Supabase API can reach. Each new partition needs row level security, as the job does.
- The Supabase API also serves each function of `public`. Thus, the function is in the `jobs` schema, and nobody but the owner can run it.
- The period is in the schedule, not in the code. To change it, change PD19 first, then run `select cron.schedule('maintain-events', '30 22 * * *', 'SELECT jobs.maintain_events(<months>)')`. After a restore into Supabase, the dump has no schedule, and a new project has `pg_cron` off. Run `create extension if not exists pg_cron with schema pg_catalog`, then the same command.
- Local work and the tests have no `pg_cron`. The migration skips the schedule there, and the tests call the function.
- Drizzle cannot declare a partitioned table. The SQL of the first analytics migration is edited by hand. `pnpm db:generate:analytics` makes the next one, and it sees a plain table, so check its SQL.
- The tests must call `flushEvents()` before they read the table, because `track()` writes later.

## Tickets

- T-24: [#176](https://github.com/magentawood/roomsie/pull/176), 2026-10-28. The events table, `track()`, the analytics id and the first four events.
- T-39: [#182](https://github.com/magentawood/roomsie/pull/182), 2026-10-28. The daily job for the partitions and the deletion after 12 months.
