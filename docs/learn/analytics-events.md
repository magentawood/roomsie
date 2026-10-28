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
- The partitions from the month of the first migration to 12 months ahead. T-39 adds the scheduled job for the next partitions and the deletion after 12 months ([PD19](../decisions/pd-19-retention.md)).

## Gotchas

- Postgres refuses an insert when no partition holds its month. Each partition the migration made lasts until 12 months after the first deploy. T-39 must add the next ones before then.
- A partition is also a table that the Supabase API can reach. Each new partition needs row level security, as the migration does.
- Drizzle cannot declare a partitioned table. The SQL of the first analytics migration is edited by hand. `pnpm db:generate:analytics` makes the next one, and it sees a plain table, so check its SQL.
- The tests must call `flushEvents()` before they read the table, because `track()` writes later.

## Tickets

- T-24: [#176](https://github.com/magentawood/roomsie/pull/176), 2026-10-28. The events table, `track()`, the analytics id and the first four events.
