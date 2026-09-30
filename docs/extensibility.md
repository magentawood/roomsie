# How roomsie absorbs change

**Date:** 2026-09-26 · **Status:** proposed · **Applies to:** all changes to `apps/` and `packages/`

The architecture should not change each time we add a feature or change a
vendor. This page lists all the changes that we know about. For each change, it
gives the location and the conditions that must be correct **from day one** for
a clean change.

The technical base in `docs/tech-base.md` designed most of these seams. The
scope cuts in `docs/launch-plan.md` removed some seams. Thus, this page compares
the launch tasks with the seams.

---

## Five rules

1. **Each vendor is behind one module.** Product code does not import a vendor
   SDK directly. The model, auth, storage, analytics and error reporting each
   have one module only. Thus, to replace a vendor, you change one file in each app.
2. **Clients connect only to the API, not to the database.** Thus, the schema
   can change and we do not release a new client.
3. **`packages/contract` is the only shared language.** Each request, response,
   form and event is a Zod schema in it. We generate the OpenAPI document from it
   and commit that document. A breaking change needs a new version. Do not edit
   a version in place.
4. **The IDs are ours.** Each table refers to our own `users.id`. The API makes
   each `users.id`, a UUIDv7. A vendor ID is not a primary key or a foreign key.
5. **A feature is a module, and a module owns its tables.** Other modules call
   the functions of a module. They do not use its tables. Thus, to add a
   feature, you add a folder.

---

## Every change we know is coming

| Change | When | Where it lands | Must be correct from day one | Made correct by |
|---|---|---|---|---|
| Change the model provider | At any time | `adapters/llm` | Only one module calls a model | T-11 ✓ |
| Change the model of the router, for example to Jev | When we get access | The adapter of the router | The router has its own adapter. We test it on the same eval set | T-34 |
| Add an assistant handler | At any time | A new folder in `assistant/handlers/`, and one router label | The assistant has one entry point. The router selects handlers by label | T-12, T-34 |
| Teach the observer a new thing | At any time | Run the backfill again on the stored turns | **We store all free-text turns** | T-06, T-36 |
| Change the web search provider | At any time | In `adapters/llm` | The advisor asks the wrapper for a search, not a vendor directly | T-38 |
| Move the two Supabase projects into one paid organisation | When we start to pay | A project transfer in Supabase. No code changes | The connection details of each database are only in environment settings | T-39 |
| Move analytics to a larger store, for example ClickHouse | At scale | Change the sink in `track()`. Export and import the rows | Events go through one `track()`. Each event has an `event_version` from `packages/contract`. Product code does not read or join the events table | T-24, T-39 |
| Change the auth provider | If necessary | Link `users.auth_provider_id` again | The Firebase UID is only in that column | T-05, T-06 |
| Change error tracking to GlitchTip | v1 | In `reportError` | Only one function reports errors | T-07 ✓ |
| Move photo storage | If necessary | Change the storage module and the base URL | Store object keys, not full URLs. Uploads use presigned URLs | T-16 ✓ |
| Property listings | After v0 | A new `listings` module and table. Results get a second kind | Results in the contract are a tagged union, `kind: "person"`, from day one | T-08 |
| In-app messaging | v1 | A new `messaging` module, with Supabase Realtime broadcast | Only rule 5 | — |
| DigiLocker verification | v1 | A new `verification` module. The server makes the blur | Profiles have `visibility` at launch | T-06 ✓ |
| A mobile app | Later | A new `apps/mobile` on the same API | Bearer tokens, the committed OpenAPI document, and **all routes under `/v1`**, so that earlier app versions continue to work | T-05 ✓, T-02 |
| Untitled UI token pipeline | v1 | Replace the token values | Components use theme tokens, not raw colours, sizes or fonts | T-23a |
| Move the API host | If necessary | Deploy the container again | The API is a Docker image with no host-specific code | T-04 ✓ |
| Outgrow Turborepo | More than ~15 packages | `nx init`, approximately half a day | Nothing | ADR 0010 ✓ |

✓ means that the task guaranteed the condition before this page. For the other
tasks, we added the condition to their done-when lists on 2026-09-26.

**One intentional exception:** the two databases use free Supabase accounts
until we pay. Thus, they have no backups, and there is a policy risk. Nightly
dumps to R2 (T-40) give the backups. Refer to PD13 in `CONTEXT.md`.

---

## What stays a real migration

No architecture makes all changes free. The changes below cost much work, and
we accept this cost intentionally.

- **The database region.** Supabase in `ap-south-1` is the choice that is
  not easy to change. To move compute takes an afternoon. But to move the
  database is a full migration. Thus, we selected the region first (ADR 0009).
- **An exit from Postgres.** Drizzle and plain SQL migrations let us move to any Postgres host. ADR 0001 prohibits proprietary extensions on the
  critical path, thus this stays correct. We do not plan to leave Postgres fully.
- **A breaking change to the contract.** This needs a new `/v2` set of routes.
  We serve `/v2` with `/v1` until no clients use `/v1`.

---

## What is and isn't in v0

To save time, the launch plan first removed the router, the observer, the
advisor and the isolated analytics database. On 26 September, they came back
into v0, and the launch moved to 12 October to give time for them. Thus, only
one item stays out of v0 intentionally:

| Not in v0 | Why | Where it goes later |
|---|---|---|
| A mobile app | The web app is responsive. One client is sufficient to learn from | A new `apps/mobile` on the same `/v1` API |

In-app messaging, verification and SEO area pages stay v1 items in
`docs/launch-plan.md`. Each is a new module and changes no other thing.

**Vector store: not planned at all, not only deferred.** Matching is a SQL query
on typed fields. It is not a document search. The corpus of the advisor is some
dozens of articles, and Postgres full-text search processes them. If we ever need embeddings, `pgvector` would run in the same Postgres. This needs an ADR 0001
amendment, but it does not add a service.
