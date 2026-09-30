# How roomsie absorbs change

**Date:** 2026-09-26 · **Status:** proposed · **Applies to:** all changes to `apps/` and `packages/`

---

## Five rules

1. **Each vendor is behind one module.** Product code does not import a vendor SDK directly.
   - The model, auth, storage, analytics and error reporting each have one module only.
2. **Clients connect only to the API, not to the database.**
3. **`packages/contract` is the only shared language.**
   - Each request, response, form and event is a Zod schema in it.
   - We generate the OpenAPI document from it and commit that document.
   - A breaking change needs a new version, not an edit in place.
4. **The IDs are ours.**
   - Each table refers to our own `users.id`, a UUIDv7 that the API makes.
   - A vendor ID is not a primary key or a foreign key.
5. **A feature is a module, and a module owns its tables.** Other modules call the functions of a module. They do not use its tables.

Why: [ADR 0002](decisions/0002-api-boundary.md), [ADR 0014](decisions/0014-error-tracking.md)

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
| A mobile app | Later | A new `apps/mobile` on the same API | Bearer tokens, the committed OpenAPI document, and **all routes under `/v1`** | T-05 ✓, T-02 |
| Untitled UI token pipeline | v1 | Replace the token values | Components use theme tokens, not raw colours, sizes or fonts | T-23a |
| Move the API host | If necessary | Deploy the container again | The API is a Docker image with no host-specific code | T-04 ✓ |
| Outgrow Turborepo | More than ~15 packages | `nx init`, approximately half a day | Nothing | ADR 0010 ✓ |

✓ means that the task guaranteed the condition before this page. For the other tasks, we added the condition to their done-when lists on 2026-09-26.

**One intentional exception:** the two databases use free Supabase accounts until we pay.

- Result: no backups, and a policy risk.
- Nightly dumps to R2 (T-40) give the backups.
- Refer to PD13 in `CONTEXT.md`.

Why: [ADR 0002](decisions/0002-api-boundary.md)

---

## What stays a real migration

| Migration | Facts |
|---|---|
| **The database region** | Supabase in `ap-south-1`. To move compute takes an afternoon. The region decision is ADR 0009. |
| **An exit from Postgres** | ADR 0001 prohibits proprietary extensions on the critical path. We do not plan to leave Postgres fully. |
| **A breaking change to the contract** | This needs a new `/v2` set of routes. We serve `/v2` with `/v1` until no clients use `/v1`. |

Why: [ADR 0001](decisions/0001-rent-infrastructure.md), [ADR 0006](decisions/0006-drizzle.md), [ADR 0009](decisions/0009-hosting-and-region.md)

---

## What is and isn't in v0

- On 26 September, the router, the observer, the advisor and the isolated analytics database came back into v0.
- The launch moved to 12 October to give time for them.
- **Only one item stays out of v0 intentionally: a mobile app.**
- In-app messaging, verification and SEO area pages stay v1 items in `docs/launch-plan.md`. Each is a new module and changes no other thing.
- **Vector store: not planned at all.**
- Postgres full-text search processes the corpus of the advisor.
- If we ever need embeddings, `pgvector` would run in the same Postgres. This needs an ADR 0001 amendment, but it does not add a service.

Why: [ADR 0002](decisions/0002-api-boundary.md), [PD5](decisions/pd-05-team-and-budget.md), [PD7a](decisions/pd-07a-agent-architecture.md), [PD11](decisions/pd-11-launch.md)
