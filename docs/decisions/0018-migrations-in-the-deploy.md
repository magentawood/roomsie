# ADR 0018 — Migrations run in the deploy, before the new API

**Status:** Accepted · **Date:** 2026-10-25 · **Deciders:** n3rxv

## Context

- ADR 0006 says that CI applies each committed migration. Until T-51, no step applied them, so the live database had no tables.
- The deploy workflow builds a Docker image on a GitHub runner, pushes it to Lightsail, and starts it (ADR 0009).
- The API connects through the Supabase pooler in transaction mode.
- Drizzle applies all new migrations in one transaction. It skips a migration that is older than the last applied migration.

## Decision

**In one line:** The deploy applies the migrations and the catalogue seed from the new image before Lightsail starts the new API, and each migration works with the API before it.

- **Where:** a step of the deploy workflow runs the `migrate` entry of the new image in a one-off container. The step comes after the image push and before the Lightsail deploy.
- **What:** all new migrations in one transaction, then the catalogue seed. The seed is an upsert, so a second run changes nothing.
- **Connection:** the session pooler, from the `DATABASE_URL_SESSION` secret. The API keeps the transaction pooler.
- **Failure:** the transaction rolls back, and the job stops. Lightsail keeps the old API.
- **Expand, then contract:** each migration works with the API version before it. To drop or rename a column or a table, first merge a PR that stops its use. Then drop it in a second PR.

## Rationale

- The container runs the code that ships, with no second install.
- A failure stops the job before Lightsail changes. The old API stays up, and the failed step shows the error.
- The workflow runs one deploy at a time. Thus, two migrations cannot run together.
- Supabase advises a session connection for schema changes. GitHub runners have no IPv6, and the direct connection of the free plan needs IPv6.
- The old API runs on the new schema until the new API starts. If the Lightsail step fails, it runs on it until the next deploy. An additive migration keeps it correct.

## Alternatives rejected

- **The API migrates itself when it starts.** Two containers can migrate at the same time. A failure shows only as a failed health check, and each start is slower.
- **pnpm on the runner runs a migrate script from the source.** Each deploy installs for approximately one more minute, and the source can differ from the image.
- **No rule for a migration.** A drop or a rename breaks the old API during each deploy. If the Lightsail step fails, the old API stays broken.
- **Maintenance mode for each migration.** We have no maintenance switch, and each deploy stops the site.

## Consequences

- A drop or a rename takes two PRs.
- A test checks that the dates in the migration journal increase. Thus, Drizzle cannot skip a migration.
- A migration that cannot run in a transaction, for example `CREATE INDEX CONCURRENTLY`, needs a different path.
- No backup occurs before a migration. The nightly dump of T-40 is the backup ([PD13](pd-13-databases-and-backups.md)).
- The analytics database (T-39) gets its own migrations.

## Revisit when

- Lightsail runs more than one API container, or a migration locks a busy table for more than a few seconds.
- A migration must run outside a transaction.

## Sources

- The T-51 grill ([#134](https://github.com/magentawood/roomsie/issues/134))
- [ADR 0006](0006-drizzle.md), [ADR 0009](0009-hosting-and-region.md), [ADR 0016](0016-credentials-and-secrets.md)
- The Drizzle migrator, `drizzle-orm/pg-core/dialect.js`, version 0.45.3
