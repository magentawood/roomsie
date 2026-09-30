# How roomsie absorbs change

**Date:** 2026-09-26 · **Status:** proposed · **Applies to:** every change to `apps/` and `packages/`

The architecture should not change every time we add a feature or swap a
vendor. This page lists every change we already know is coming, where each one
lands, and what has to be true **from day one** so that it lands cleanly.

The technical base in `docs/tech-base.md` already designed most of
these seams. This page checks the launch tasks against them, because the scope
cuts in `docs/launch-plan.md` dropped some of them.

---

## Five rules

1. **Every vendor sits behind one module.** No product code imports a vendor
   SDK directly. The model, auth, storage, analytics and error reporting each
   have exactly one module, so replacing a vendor changes one file per app.
2. **Clients talk to the API, never to the database.** The schema can change
   without shipping a new client.
3. **`packages/contract` is the only shared language.** Every request, response,
   form and event is a Zod schema there. The OpenAPI document is generated from
   it and committed. Breaking changes need a new version, never an edit in place.
4. **The IDs are ours.** Every table keys to our own `users.id`, a UUIDv7 minted
   by the API. No vendor ID is ever a primary or foreign key.
5. **A feature is a module, and a module owns its tables.** Other modules call
   its functions, never its tables. Adding a feature means adding a folder.

---

## Every change we know is coming

| Change | When | Where it lands | Must be true from day one | Made true by |
|---|---|---|---|---|
| Swap the model provider | Any time | `adapters/llm` | One module is the only way to call a model | T-11 ✓ |
| Swap the router's model, say to Jev | When access arrives | The router's own adapter | The router is its own adapter, tested on the same eval set | T-34 |
| Add another assistant handler | Any time | A new folder in `assistant/handlers/`, plus one router label | The assistant has one entry point, and the router picks handlers by label | T-12, T-34 |
| Teach the observer something new | Any time | Re-run the backfill over stored turns | **Every free-text turn is stored** | T-06, T-36 |
| Swap the web search provider | Any time | Inside `adapters/llm` | The advisor asks the wrapper for a search, never a vendor directly | T-38 |
| Move both Supabase projects into one paid organisation | When we start paying | A project transfer in Supabase. No code changes | Each database's connection details live only in environment settings | T-39 |
| Move analytics to a bigger store, like ClickHouse | At scale | Change the sink inside `track()`, export and import the rows | Events go through one `track()`. Each carries an `event_version` from `packages/contract`. No product code reads or joins the events table | T-24, T-39 |
| Switch auth provider | If needed | Re-link `users.auth_provider_id` | The Firebase UID lives only in that column | T-05, T-06 |
| Swap error tracking to GlitchTip | v1 | Inside `reportError` | One function is the only way to report errors | T-07 ✓ |
| Move photo storage | If needed | Change the storage module and base URL | Store object keys, never full URLs. Uploads use presigned URLs | T-16 ✓ |
| Property listings | After v0 | A new `listings` module and table. Results gain a second kind | Results in the contract are a tagged union, `kind: "person"`, from day one | T-08 |
| In-app messaging | v1 | A new `messaging` module, with Supabase Realtime broadcast | Nothing beyond rule 5 | — |
| DigiLocker verification | v1 | A new `verification` module. The blur is made on the server | Profiles already carry `visibility` | T-06 ✓ |
| A mobile app | Later | A new `apps/mobile` on the same API | Bearer tokens, the committed OpenAPI document, and **every route under `/v1`** so older app versions keep working | T-05 ✓, T-02 |
| Untitled UI token pipeline | v1 | Replace the token values | Components use theme tokens, never raw colours, sizes or fonts | T-23a |
| Move the API host | If needed | Redeploy the container | The API ships as a Docker image with no host-specific code | T-04 ✓ |
| Outgrow Turborepo | Past ~15 packages | `nx init`, about half a day | Nothing | ADR 0010 ✓ |

✓ means the task already guaranteed it. The rest were added to the tasks'
done-when lists on 2026-09-26.

**One exception on purpose:** both databases run on free Supabase accounts
until we pay, which means no backups and a policy risk. Nightly dumps to R2
(T-40) cover the backups. See PD13 in `CONTEXT.md`.

---

## What stays a real migration

No architecture makes every change free. These cost real work, and we accept
them on purpose.

- **The database region.** Supabase in `ap-south-1` is the sticky choice. Moving
  compute is an afternoon, but moving the database is a real migration. That is
  why the region was chosen first (ADR 0009).
- **Leaving Postgres.** Drizzle and plain SQL migrations keep us portable to any
  Postgres host. ADR 0001 forbids proprietary extensions on the critical path, so
  that stays true. Leaving Postgres entirely is not planned.
- **A breaking change to the contract.** A new `/v2` route set, served beside
  `/v1` until old clients are gone.

---

## What is and isn't in v0

The launch plan first cut the router, observer, advisor and separate analytics
database to save time. On 26 September they came back, and launch moved to
12 October to make room. So the only thing kept out on purpose is:

| Not in v0 | Why | Where it goes later |
|---|---|---|
| A mobile app | The web app is responsive, and one client is enough to learn from | A new `apps/mobile` on the same `/v1` API |

In-app messaging, verification and SEO area pages are still v1 items in
`docs/launch-plan.md`. Each is a new module and changes nothing else.

**Vector store — not planned at all, not just deferred.** Matching is a SQL query
over typed fields, not a document search. The advisor's corpus is dozens of
articles, which Postgres full-text search handles. If embeddings are ever
needed, `pgvector` would run inside the same Postgres, with an ADR 0001
amendment, so it still wouldn't add a service.
