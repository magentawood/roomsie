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

- **Prepared statements must stay off.** In production the API connects through the Supabase pooler in transaction mode. Many requests share a small number of connections, so the next query can go to a different connection. A prepared statement is a query plan that one connection keeps, so it fails there. The client sets `prepare: false`. Do not remove it.
- Do not make a second client in other code. Import `createDb`, so the setting stays in one place.

## Tickets

- T-02: [#94](https://github.com/magentawood/roomsie/pull/94), 2026-10-03. The client and the choice of driver.
