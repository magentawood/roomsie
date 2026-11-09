# Postgres drivers

**In one line:** a driver is the library that connects the API to Postgres. We use postgres.js under Drizzle, with prepared statements off for the Supabase pooler.

## What it is

The API talks to Postgres over a network connection with its own protocol. A **driver** is the library that opens these connections, sends the SQL, and changes the replies into JavaScript objects. Drizzle does not do this itself. Drizzle makes typed SQL from our schema and gives it to the driver.

```
route handler → Drizzle (typed query) → driver (connection and protocol) → Postgres
```

## How it fits our project

- The driver is set in one file only: the database client of `apps/api` (`src/db/client.ts`). Its `createDb(url)` gives a Drizzle database. The `Db` type comes from it.
- The rest of the code uses Drizzle queries, for example `db.select().from(profiles)`. A change of driver changes one file.
- The tests use the same client, so tests and production use the same connection settings.

## The choice we made

- **postgres.js** (the `postgres` package), selected in the T-02 grill: [#94](https://github.com/magentawood/roomsie/pull/94). It is small and fast, and it is the default of Drizzle for Supabase.
- The alternative was **node-postgres** (`pg`), the oldest Node driver. It needs a little more setup and works equally well at our scale.
- Drizzle itself: [ADR-0006](../decisions/0006-drizzle.md).

## Gotchas

- **The API uses the session pooler** ([ADR-0018](../decisions/0018-migrations-in-the-deploy.md)). Each connection of the API holds one database connection, so each pool has at most 6. The transaction pooler shares a few database connections between many requests, and it hung the API on 2026-11-09: postgres.js asks the database to describe each query with values, flushes, and waits, and the pooler did not always pass the answer back. The database session then shows `active` with `ClientRead` in `pg_stat_activity`, and the request waits forever.
- **Prepared statements stay off** (`prepare: false`), so the code also works on the transaction pooler.
- **The pool options** are `poolOptions` in `apps/api/src/db/client.ts`, for both databases: at most 6 connections, an idle connection closes after 20 seconds, each connection is renewed every 5 minutes, and a connect gives up after 10 seconds.
- **A stuck session** shows in the Supabase SQL editor: `select pid, state, wait_event, now() - query_start from pg_stat_activity where application_name = 'Supavisor'`. `pg_terminate_backend(pid)` ends one, and a redeploy gives the API fresh connections.
- Do not make a second client in other code. Import `createDb`, so the setting stays in one place.

## Tickets

- T-02: [#94](https://github.com/magentawood/roomsie/pull/94), 2026-10-03. The client and the choice of driver.
