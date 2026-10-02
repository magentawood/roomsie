# Local development with Docker

**In one line:** a local Postgres 17 runs in Docker. `pnpm db:up` starts it, and `pnpm test` starts it if necessary and gives each test run a fresh database.

## What it is

**Docker** runs a program in a sealed box, a **container**, with all that the program needs. We do not install Postgres on each laptop. Docker runs the official `postgres:17` image, the same Postgres version as Supabase in production. The file `docker-compose.yml` at the repo root tells Docker the version, the port (5432), the password and the data folder.

## How it fits our project

Three processes run on a laptop:

```
apps/web (Next.js, port 3000) → apps/api (Fastify, port 8080) → Postgres (Docker, port 5432)
```

| Command | What it does |
|---|---|
| `pnpm dev` | Starts web and the API. It does not start Postgres. |
| `pnpm db:up` | Starts Postgres in the background and waits until it is ready. |
| `pnpm db:down` | Stops Postgres. The data stays in a Docker volume. |
| `pnpm test` | Starts Postgres if it does not run, then runs the tests. |

- For work on the API or the database, run `pnpm db:up` one time, then `pnpm dev`.
- For work on web screens only, run `pnpm dev`. Docker does not have to run.
- Each test run makes a new empty database, applies the committed migrations, runs the tests, and removes the database. Tests never touch your local data.

## The choice we made

- A separate `pnpm db:up`, and a `pnpm test` that starts Postgres itself, selected in the T-02 grill: [#94](https://github.com/magentawood/roomsie/pull/94).
- Tests use a real Postgres, never a mock: [ADR-0013](../decisions/0013-ci-gate-and-testing.md).
- Postgres 17 agrees with Supabase: [ADR-0015](../decisions/0015-primary-key-strategy.md).

## Gotchas

- **"Postgres is not running and Docker could not start it":** open Docker Desktop, wait until it runs, then run the command again.
- **Docker Desktop does not start, and its log says "cannot resize Docker.raw":** the disk file of Docker belongs to `root`. Run `sudo chown $USER:staff ~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw`, then start Docker again.
- **Port 5432 is in use:** a different Postgres runs on your laptop. Stop it, or change the port in `docker-compose.yml` and in your `.env`.

## Tickets

- T-02: [#94](https://github.com/magentawood/roomsie/pull/94), 2026-10-03. The local Postgres, the commands and the test harness.
