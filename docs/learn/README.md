# Learn

**In one line:** one page for each technical topic that the team learned in a ticket, in plain language, with a link to the decision record or the PR.

Each page tells what the topic is, how it fits roomsie, the choice we made, and the gotchas. When a later ticket adds to a topic, the team updates its page. The list below is generated from the pages.

<!-- learn:start -->
- [Building the API](building-the-api.md): `tsx` runs the TypeScript API in development, and `tsup` builds our code into one JavaScript file. The Docker image installs the libraries next to it.
- [Local development with Docker](local-dev-with-docker.md): a local Postgres 17 runs in Docker. `pnpm db:up` starts it, and `pnpm test` starts it if necessary and gives each test run a fresh database.
- [OpenAPI from Zod](openapi-from-zod.md): the API makes its OpenAPI document from the Zod schemas in `packages/contract`. The document is committed, and a test fails when it is out of date.
- [pnpm, Corepack and Turborepo](pnpm-and-corepack.md): pnpm installs the packages of the monorepo, Corepack gives each developer the same pnpm version, and Turborepo runs the tasks of all packages with one command.
- [Postgres drivers](postgres-drivers.md): a driver is the library that connects the API to Postgres. We use postgres.js under Drizzle, with prepared statements off for the Supabase pooler.
<!-- learn:end -->
