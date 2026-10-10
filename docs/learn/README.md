# Learn

**In one line:** one page for each technical topic that the team learned in a ticket, in plain language, with a link to the decision record or the PR.

Each page tells what the topic is, how it fits roomsie, the choice we made, and the gotchas. When a later ticket adds to a topic, the team updates its page. The list below is generated from the pages.

<!-- learn:start -->
- [Building the API](building-the-api.md): `tsx` runs the TypeScript API in development, and `tsup` builds our code into one JavaScript file. The Docker image installs the libraries next to it.
- [CI checks](ci-checks.md): GitHub checks each pull request automatically, and `main` accepts a merge only when the checks pass and a teammate approves.
- [Deploys](deploys.md): Vercel publishes the web from `main` and builds a preview for each pull request. A GitHub workflow deploys the API as a Docker image to AWS Lightsail in Mumbai.
- [Local development with Docker](local-dev-with-docker.md): a local Postgres 17 runs in Docker. `pnpm db:up` starts it, and `pnpm test` starts it if necessary and gives each test run a fresh database.
- [OpenAPI from Zod](openapi-from-zod.md): the API makes its OpenAPI document from the Zod schemas in `packages/contract`. The document is committed, and a test fails when it is out of date.
- [pnpm, Corepack and Turborepo](pnpm-and-corepack.md): pnpm installs the packages of the monorepo, Corepack gives each developer the same pnpm version, and Turborepo runs the tasks of all packages with one command.
- [Postgres drivers](postgres-drivers.md): a driver is the library that connects the API to Postgres. We use postgres.js under Drizzle, with prepared statements off for the Supabase pooler.
- [Secret scanning](secret-scanning.md): gitleaks finds a password or a key in the code before the secret goes into the shared git history. Run `pnpm secrets` before each pull request.
- [Uptime monitoring](uptime-monitoring.md): HetrixTools calls the health check of the API each minute. When the API stops, it sends an alert to the Telegram group of the team.
<!-- learn:end -->
