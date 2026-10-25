# Learn

**In one line:** one page for each technical topic that the team learned in a ticket, in plain language, with a link to the decision record or the PR.

Each page tells what the topic is, how it fits roomsie, the choice we made, and the gotchas. When a later ticket adds to a topic, the team updates its page. The list below is generated from the pages.

<!-- learn:start -->
- [Backups](backups.md): each night, a GitHub workflow dumps the two databases, checks each restore, and keeps fourteen encrypted dumps in R2.
- [Building the API](building-the-api.md): `tsx` runs the TypeScript API in development, and `tsup` builds our code into one JavaScript file. The Docker image installs the libraries next to it.
- [CI checks](ci-checks.md): GitHub checks each pull request automatically, and `main` accepts a merge only when the checks pass and a teammate approves.
- [Deploys](deploys.md): Vercel publishes the web from `main` and builds a preview for each pull request. A GitHub workflow deploys the API as a Docker image to AWS Lightsail in Mumbai.
- [Form A and intent](form-a-and-intent.md): Form A is the set of typed answers that drives matching, and intent is its first answer: the kind of place that a seeker wants.
- [Listings and photo uploads](listings.md): a lister saves a listing of one of four kinds one step at a time, uploads photos straight to R2 with a signed link, and publishes it for 30 days.
- [Local development with Docker](local-dev-with-docker.md): a local Postgres 17 runs in Docker. `pnpm db:up` starts it, and `pnpm test` starts it if necessary and gives each test run a fresh database.
- [Message requests](message-requests.md): "Say hi" sends a request with a short note, the other person accepts or declines, and only then can the two people chat; a phone number never shows.
- [Database migrations](migrations.md): a migration is a committed SQL file that changes the shape of the database. The deploy applies the new migrations and the catalogue seed before the new API starts.
- [Model hosting and where user text goes](model-hosting-and-data.md): each chat message goes to a model provider, and the provider decides where the text is stored and if it trains on it; roomsie sends user text to the DeepSeek API.
- [OpenAPI from Zod](openapi-from-zod.md): the API makes its OpenAPI document from the Zod schemas in `packages/contract`. The document is committed, and a test fails when it is out of date.
- [pnpm, Corepack and Turborepo](pnpm-and-corepack.md): pnpm installs the packages of the monorepo, Corepack gives each developer the same pnpm version, and Turborepo runs the tasks of all packages with one command.
- [Postgres drivers](postgres-drivers.md): a driver is the library that connects the API to Postgres. We use postgres.js under Drizzle, with prepared statements off for the Supabase pooler.
- [Secret scanning](secret-scanning.md): gitleaks finds a password or a key in the code before the secret goes into the shared git history. Run `pnpm secrets` before each pull request.
- [Sign-in and tokens](sign-in-and-tokens.md): the web signs in with Google through Firebase. The API checks the ID token locally and loads the `users` row.
- [Uptime monitoring](uptime-monitoring.md): HetrixTools calls the health check of the API each minute. When the API stops, it sends an alert to the Telegram group of the team.
<!-- learn:end -->
