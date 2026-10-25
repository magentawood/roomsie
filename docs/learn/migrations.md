# Database migrations

**In one line:** a migration is a committed SQL file that changes the shape of the database. The deploy applies the new migrations and the catalogue seed before the new API starts.

## What it is

- The **schema** is the shape of the database: its tables, columns and keys. The Drizzle schema in `apps/api` describes it in TypeScript ([ADR-0006](../decisions/0006-drizzle.md)).
- `drizzle-kit generate` compares the schema with the last migration. It writes the difference as a `.sql` file in `apps/api/drizzle`, and we commit the file.
- To **migrate** is to run the new `.sql` files on a database. Drizzle records each applied file in the table `drizzle.__drizzle_migrations`. Thus, a second run applies nothing.
- The **seed** writes the fixed rows of the catalogues: the lifestyle questions and the must-haves. It is an upsert, so a second run changes nothing.

## How it fits our project

```
merge to main ─▶ build image ─▶ push image ─▶ migrate and seed ─▶ Lightsail deploy ─▶ /v1/health
                                              (one-off container,  (only if the
                                               session pooler)      migration passed)
```

| Database | How it gets the migrations |
|---|---|
| The live database | The "Migrate and seed" step of the deploy workflow runs `node dist/migrate.js` in a container from the new image. |
| Your local database | `pnpm --filter @roomsie/api exec drizzle-kit migrate`, with `DATABASE_URL` set. It does not run the seed. |
| The tests | Each test run makes a fresh database and applies the migrations ([local development](local-dev-with-docker.md)). |

## The choice we made

- The deploy migrates from the new image, before the new API starts. Each migration works with the API before it: [ADR-0018](../decisions/0018-migrations-in-the-deploy.md).
- The deploy runs only from `main`. A run by hand from a branch does nothing.

## Gotchas

- **Expand, then contract.** For a few minutes, the old API runs on the new schema. To rename a column, first add the new column and change the code to use it. Drop the old column in a second PR.
- **A test fails on the migration dates.** Drizzle applies a migration only when its date is after the last applied migration. A teammate's migration can merge before yours with a later date. Then the test in `apps/api/test/migrate.test.ts` fails. Delete your migration, rebase onto `main`, and generate it again.
- **Two pooler modes.** The API uses the Supabase pooler in transaction mode ([Postgres drivers](postgres-drivers.md)). The migration uses session mode, from the `DATABASE_URL_SESSION` secret.
- **One transaction.** If one statement fails, all new migrations roll back, and the deploy stops. The old API keeps running. Read the error in the "Migrate and seed" step.
- **Do not change a committed migration.** Drizzle does not apply a file again, so the live database and the file disagree. Write a new migration.
- Lines such as `schema "drizzle" already exists, skipping` in the step log are Postgres notices. They are not errors.

## Tickets

- T-06: [#129](https://github.com/magentawood/roomsie/pull/129), 2026-10-24. The first migration.
- T-51: [#137](https://github.com/magentawood/roomsie/pull/137), 2026-10-25. Migrations and the seed in the deploy.
