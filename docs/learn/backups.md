# Backups

**In one line:** each night, a GitHub workflow dumps the two databases, checks each restore, and keeps fourteen encrypted dumps in R2.

## What it is

A **dump** is one file that holds the tables and the rows of a database. `pg_dump` makes it, and `pg_restore` loads it into a database again. We use the custom format of `pg_dump`. This format compresses the data, and `pg_restore` can read it.

A **restore check** loads a dump into an empty database. A dump that does not restore is not a backup. Thus, each night the workflow restores each dump into a temporary Postgres 17, and the workflow fails if the restore fails.

**`age`** is a small encryption tool. A **public key** can only lock a file. The **private key** unlocks the file. Thus, the public key can be in the repo, but the private key must stay secret.

**Retention** is the time that we keep a backup.

## How it fits our project

The free plan of Supabase makes no backups ([PD13](../decisions/pd-13-databases-and-backups.md)). The workflow `backup-databases.yml` gives the backups. It starts each night at 03:00 IST, and a person can start it by hand from the Actions tab of GitHub.

For each database, the workflow does these steps:

1. It dumps the `public` and `drizzle` schemas through the session pooler of Supabase.
2. It restores the dump into a temporary Postgres 17.
3. It encrypts the dump with the public key, then uploads it to the backups bucket in R2.
4. It deletes the dumps that are older than the newest fourteen.

If a step fails, the steps after it do not run. Thus, a failed night never deletes a good dump. A Telegram bot then sends a message to the team group.

The name of each file is `<database>/<UTC time>.dump.age`, for example `main/2026-10-13T2130Z.dump.age`.

## Restore a dump on your laptop

You need Docker, `age` (`brew install age`), access to R2 in the Cloudflare dashboard, and the private backup key. Pulkit keeps the key in Bitwarden, in the secure note "roomsie – backup private key (age)". Ask Pulkit for it.

CAUTION: Delete the key file and the decrypted dump after the restore. The dump holds the personal data of all users.

1. Start the local Postgres: `pnpm db:up`.
2. In the Cloudflare dashboard, open R2, then the backups bucket. Download the dump that you need.
3. Save the private key from the Bitwarden note to a file outside the repo, for example `~/backup-key.txt`.
4. Decrypt the dump: `age --decrypt --identity ~/backup-key.txt --output main.dump 2026-10-13T2130Z.dump.age`
5. Make a scratch database: `docker compose exec postgres createdb -U postgres restore_check`
6. Restore the dump: `docker compose exec -T postgres pg_restore -U postgres --clean --if-exists --exit-on-error -d restore_check < main.dump`
7. Look at the tables: `docker compose exec postgres psql -U postgres -d restore_check -c '\dt public.*'`
8. Delete the key file and the dump: `rm ~/backup-key.txt main.dump`
9. Delete the scratch database: `docker compose exec postgres dropdb -U postgres restore_check`

## The choice we made

- Nightly dumps to R2, because the free plan has no backups: [PD13](../decisions/pd-13-databases-and-backups.md).
- The R2 key of the API, and where the private key lives: [ADR-0016](../decisions/0016-credentials-and-secrets.md) and the T-40 spec.
- The restore check, the retention, the encryption and the alert: the T-40 spec.

## Gotchas

- **The dump connects through the session pooler, not the direct address.** GitHub runners have no IPv6, and the direct address of a free Supabase project has only IPv6.
- **The workflow runs `pg_dump` from the Postgres 17 image.** The `pg_dump` of the runner is older than the Postgres of Supabase, and an older `pg_dump` cannot dump a newer server.
- **A restore needs `--clean --if-exists`.** The dump makes the `public` schema, and a new database has it already. Without the two options, the restore stops with "schema public already exists".
- **The dump has no Supabase schemas, owners or grants.** Thus, it restores into each Postgres 17. The `pg_cron` jobs of the analytics database are not in the dump.
- **Row Level Security does not hide rows from the dump.** The dump user owns the tables, and the tables do not force Row Level Security. If a migration adds `FORCE ROW LEVEL SECURITY`, the dump stops with an error.
- **If you lose the private key, nobody can read the dumps.** Keep the key only in the Bitwarden note. Never put it in GitHub, Vercel, `.env`, a chat or the repo.
- **A deleted account stays in the dumps for fourteen days,** until the workflow deletes its newest dump.

## Tickets

- T-40: [#131](https://github.com/magentawood/roomsie/pull/131), 2026-10-25. The nightly backup workflow, the restore check and the retention.
