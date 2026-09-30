# Build journal

A running record of building roomsie, written so it makes sense with no prior
context. Every entry says what was built, why it was built that way, and
explains the ideas as they come up.

Newest entry at the bottom. Append, never rewrite.

---

## Before anything: what are we building?

**roomsie** finds you a flat or a flatmate in Mumbai. The difference from every
other rental site is the front door: instead of a search box and filters, an
assistant interviews you. It works out what you actually need, then shows
matches. Browsing exists, but downstream of the conversation.

It handles four intents: someone with a flat looking for flatmates, someone
wanting a whole flat, someone wanting a room in an occupied flat, and people
open to either.

The product is a **pivot**. The previous one, *femmeflats*, was a women-only
swipe app. roomsie is open to all genders, launching in three Mumbai areas.
The femmeflats requirements are dead; its **technical** decisions carried over
unchanged — fifteen accepted ADRs.

### Words you will meet constantly

| Term | What it means here |
|---|---|
| **ADR** | Architecture Decision Record. A short document saying "we chose X over Y, and here is why." Numbered, dated, and binding. `docs/decisions/` holds fifteen. |
| **Monorepo** | One repository holding the website, the server and the shared code, instead of three separate ones. Everyone commits to the same place. |
| **Schema** | The shape of the database: what tables exist, what columns they have, what type each column is. |
| **Migration** | A file of SQL that changes the schema. Run in order, never edited once shipped, so every machine ends up with the same database. |
| **Drizzle** | The tool we use to describe the schema in TypeScript and generate those SQL migrations from it. |
| **Form A** | The structured list of things the assistant tries to learn from you — intent, budget, areas, move date, and nine lifestyle answers. The assistant fills it as you talk. |
| **T-06, T-14…** | Task codes. Each is a GitHub issue. `docs/how-to-work.md` indexes all 55 in plain words. |
| **P1–P5** | The five people's work lanes. This journal is written from **P3 · Data and trust** — the schema, the matching, and who sees whom. |

---

# Entry 1 — T-06, the database schema

**Issue [#11](https://github.com/magentawood/roomsie/issues/11) · 8 hours · critical path**

This is the most depended-on task in the project. Seven other tasks across four
people cannot start until it lands: the match query, profiles, carrying a chat
into an account, reporting and blocking, account deletion, event logging and
the connect API. So it is first, and it needs to be right rather than fast.

## What a schema actually is

A database stores rows in tables, like spreadsheets that know about each other.
The schema is the definition: which tables, which columns, which types, and
which rules.

It matters more than most code because **it is the hardest thing to change
later.** You can rewrite a screen in an afternoon. Changing a column after real
people's data is in it means a migration, a backfill, and something to do with
every row that does not fit the new shape.

So the job is to think hard once, and to leave room where you are unsure.

## Decision 1 — `users` is thin

Two ways to store a person:

- **Fat:** one `users` table holding everything — name, age, photos, budget, preferences.
- **Thin:** `users` holds only identity and account state. Everything else lives in `profiles`, linked one-to-one.

We went thin. Three reasons:

1. **Every single request reads the user row** to check who you are. That should touch a tiny row, not one carrying four photo keys and twenty preferences.
2. **Editing your profile never touches your auth row.** Different things change at different rates and for different reasons.
3. **Deletion gets simpler.** Account deletion (T-20) can drop the profile while keeping the minimal record needed to stop a suspended person signing straight back up.

Cost: one extra join when you need both. Worth it.

## Decision 2 — UUIDv7 ids, minted in code

Every table's id is a `uuid`, not a counting number. This was already decided
in **ADR 0015** and I followed it. The reasoning is worth understanding:

**Why not `1, 2, 3`?** Because `/users/1024` tells you `1023` and `1025` exist.
On a product where people's homes and photos are involved, that turns any
id-taking endpoint into a walkable list of every user. Authorization should
stop it — but you do not publish the map.

**Why v7 rather than v4?** A random UUIDv4 lands in a different place in the
index on every insert, which gets slow once the index outgrows memory. UUIDv7
puts a millisecond timestamp in its leading bits, so new ids sort to the end.
You get v4's unguessability with sequential-insert performance.

**Why not let the database generate it?** Because then the id only exists
*after* the insert commits, so the phone can never know it in advance. Minting
it in app code means the client can render immediately, and a retried request
is naturally safe — the same id arrives twice and the second is ignored.

```ts
const id = () => uuid('id').primaryKey().$defaultFn(() => uuidv7())
```

`$defaultFn` means "run this function in TypeScript when inserting," as opposed
to `.default()` which would put it in the database.

## Decision 3 — the axis catalogue

Here is where I hit a wall, and the interesting part of this entry.

Every planning document refers to **"the nine lifestyle axes."** Six documents
mention them. **None of them says what the nine are.**

Two bad options:

- **Guess, and hardcode nine columns.** If the guess is wrong — and it will be — every correction is a migration plus a contract change plus a re-tuned AI prompt plus a new filter branch. Five files across three people's lanes, after real data exists.
- **Wait.** Blocks seven tasks and four people.

So, a third option: **make the axes data instead of schema.**

There are two tables. `lifestyle_axes` defines what the axes *are* — key,
question, allowed answers, order. `profile_lifestyle` holds one row per person
per axis they have answered.

Adding a tenth axis is now an edit to a seed file and a re-seed. No migration,
no backfill, no deploy. Renaming one, dropping one, changing its allowed
answers — all the same.

### The idea behind it

This is a known trade. Columns are fast and rigid; rows are flexible and
slower. You reach for rows when **you do not yet know what the columns should
be**, which is exactly our situation.

The cost: matching becomes a join and an aggregate rather than comparing
columns. At launch scale — a hundred seeded profiles in three areas — that is
nothing. It would matter at a scale we will not see this year, and by then we
would know the nine and could collapse them into columns deliberately.

### The catch, which is real

The flexibility only survives if three things hold:

1. `packages/contract` **generates** Form A from the catalogue rather than hardcoding nine fields
2. the match query (T-14, mine) **joins through** the catalogue, never `WHERE smoking = 'never'`
3. the extraction prompt (T-12) is **built from** the catalogue, not typed out

Break any one and that part goes rigid again while the rest pretends to be
flexible — which is worse than being rigid honestly. One and three are P2's
lane, so this is a shared contract between us, like Form A itself.

### The nine provisional names

I named them so work could start. They are in `seed-axes.ts` with a warning
comment on top:

`smoking` · `drinking` · `diet` · `sleep_schedule` · `guests` ·
`cleanliness` · `work_from_home` · `pets` · `community`

Some are grounded rather than invented. `smoking` appears by name in
`ai-agent-design.md`. `guests` appears as the example key `guest_frequency`,
with the worked example *"my ex basically lived there, that's what killed it."*
`diet` carries jain and eggetarian because the market is Mumbai.

`community` needs naming out loud: decision **PD3c** (2026-09-20) explicitly
chose to record and filter on community and religion, and `ai-agent-design.md`
§4.1 documents the press exposure that carries at length. It is in because that
decision says so. It is one line to remove if that is revisited.

## Decision 4 — `prefer` vs `dealbreaker`

Each answer carries a weight. A **dealbreaker** filters people out of your
results entirely. A **preference** only moves them down the ranking.

This is a product decision wearing a database costume, and it is still
unconfirmed — it is §2.2 of `docs/design-review.md`, waiting on the designer.
If they decide preferences should be a 1–5 scale instead of two states, that
*is* a migration. Flagged, not hidden.

## Decision 5 — where "we don't know" lives

Form A says every field can be `unclear`, because the assistant is allowed not
to know. That shows up in two different ways:

- **Enums carry an `unclear` value.** `intent` can be `has_flat`, `wants_flat`, `wants_room`, `open` or `unclear`.
- **Lifestyle answers use the absence of a row.** No row means unanswered. We never store "we don't know" as a fact.

Lifecycle enums — account status, connection status — deliberately have no
`unclear`. Those are facts the system owns, not answers a person gave.

## The eight tables

| Table | Holds | Serves |
|---|---|---|
| `users` | Identity and account state only | Every authenticated request |
| `profiles` | The person: name, age, work, Form A, photo keys, visibility | T-16 |
| `lifestyle_axes` | What the axes *are* | T-08, T-12, T-14 |
| `profile_lifestyle` | One row per person per answered axis | T-14 |
| `anonymous_sessions` | Chat before sign-up, and the turn count | T-17, T-21 |
| `connection_requests` | Asking to connect; contact revealed on accept | T-18a |
| `reports` | Someone flagged someone | T-19 |
| `blocks` | Someone hid someone, both directions | T-19 |
| `events` | What people did, including anonymously | T-24 |
| `waitlist` | People outside the three launch areas | T-22 |

Ten, not eight — the two extra are the axis catalogue, which the ticket's
"nine lifestyle answers" line implies but does not name.

## Small things worth noticing

**Blocks work both ways.** The match query subtracts blocks in both directions
— blocking someone hides each of you from the other, not just one. There is an
index for exactly that lookup.

**`reports` and `blocks` are client-mintable.** ADR 0015 lists them as tables
where the phone generates the id. Their endpoints accept an `id` and dedupe
with `ON CONFLICT (id) DO NOTHING`, so a retried tap on a flaky connection
never files two reports.

**Anonymous events are the point of `events`.** The question worth answering is
how many people start a chat and never sign up, which is only visible if
anonymous activity is recorded. Hence a nullable `anonymous_session_id`
alongside the nullable `user_id`.

**`turnCount` counts typed turns only.** Chip taps are free — they run no model
— so counting them against a budget that exists to control model spend would
punish the cheapest users. From `pre-login-limits.md`.

## What is not done

- **No migrations yet.** Drizzle generates SQL from this file, but that needs `apps/api` to exist, which is T-02 and P1's. The design is done; the generated SQL is not.
- **Form B has nowhere to live.** `agent-architecture.md` describes a second structure — observations, with kind, evidence, turn and confidence — and says plainly it must be structured, not a text blob. It is in no table here because T-06's checklist does not mention it. Raised, not silently added.
- **`room_type` is contested.** `agent-architecture.md` lists it as a Form A slot; T-06's acceptance criteria do not. I included it. One of the two documents is wrong.

## Files

```
apps/api/src/db/
├── schema.ts       the ten tables, the enums, the indexes
└── seed-axes.ts    the nine provisional axes
```

## Addendum — two tables the checklist did not ask for

Added after checking the schema against `seo-with-gated-products.md`, which is
the project's search strategy and was decided before T-06 was written.

That document calls **public area pages the main SEO asset** — "this data is
the moat." They are built from aggregates: median budget of people searching an
area, typical move-in window, the lifestyle mix, and **rent bands by room
type**. Checking whether the schema could actually serve them turned up two
things it could not.

### `listings`

There was no listings table, and two other documents assume one.

ADR 0015 names it directly in its client-versus-API minting split —
"`users`, `profiles`, `listings`". The SEO document says listings expire after
thirty days and that opening one's details is the gated action.

Without it, someone whose intent is `has_flat` could describe **themselves**
but not the flat. Rent bands could not be aggregated because no rent was
stored anywhere. That is a hole in the data model, not just in SEO.

A profile is a person; a listing is a property. One person can post several,
and a listing outlives any single conversation about it. They expire rather
than delete, because expired rows still feed the aggregates — and because
Google demotes link decay, so a page that 404s is worse than one that says the
flat is gone.

### `areas`

Areas were a `text[]` on `profiles`. That is fine until URLs depend on them.

Area pages live at `/flats-in-powai`, and that URL has to mean the same thing
forever. Free text drifts: "Powai", "powai" and "Powai, Mumbai" become three
separate cells, which splits every aggregate and produces duplicate or dead
pages. A controlled vocabulary fixes it, and the table is also the natural
home for the evergreen commute notes and area copy the pages need.

`isLaunchArea` covers F-06, which picks three areas to open with; the rest
exist so the waitlist has something to point at.

### A deliberate ADR exception

`areas` and `lifestyle_axes` both use a **text slug as the primary key**, not a
UUIDv7. ADR 0015 says every table uses a uuid, so this is a departure and
worth defending.

The ADR's reasoning is enumerability: you should not be able to walk
`/users/1024` to `/users/1025` and harvest the user base. Catalogue tables are
the exact opposite — the slugs are published, meant to be guessed, and meant to
be linked. `/flats-in-powai` is the product. Applying the rule there would cost
a join on every page and protect nothing.

`profiles.areas` stays an array, because Postgres cannot put a foreign key on
an array element. Validation lives in the contract layer, the same pattern
already used for `profile_lifestyle.value` against its axis.

### Still nobody's job

The area pages themselves have no task. I searched all fifty-five: nothing
mentions area pages, aggregates, SEO or sitemaps. T-22 is "Launch areas and
waitlist", which is a different thing.

And **T-14 is the wrong shape for them.** It returns individual people for a
searcher. Area pages need aggregates with a suppression floor — the strategy
requires hiding any cell with fewer than twenty users, or it leaks an
individual. That is a different query, it does not exist, and no one owns it.

Twelve tables now, not ten.
---

# Entry 2 — T-14, the match query

**Issue [#27](https://github.com/magentawood/roomsie/issues/27) · 6 hours · critical path**

Given what the assistant has learned about you, return the people who fit.
This is the thing the whole product points at: the chat exists to fill a form,
and this turns that form into results.

## The one idea that shapes everything

**Filtering and ranking are different jobs.** Confusing them is the easiest way
to build this wrong.

- **Filtering** removes people who cannot work. Wrong area, wrong budget, a
  violated dealbreaker, a block. Binary, and cheap.
- **Ranking** orders whoever survives, by how well they suit you.

Why it matters: filtering needs only area and budget, which arrive about three
turns in. Ranking needs lifestyle answers, which take much longer. If you treat
them as one step, you either show nothing for ten turns, or you show a match
score computed from almost no information.

`interface-shape.md` settles it — show results early and honestly, and
**withhold the score until it means something.** So the query returns rows as
soon as intent, area and budget exist, with `score: null` until there is a
preference to measure.

## Intent is not symmetric

roomsie serves both sides of the market at once, so "who should I see" depends
on which side you are on. Someone with a spare room and someone looking for a
room are a match. Two people who each already have a flat are not.

```
has_flat    → wants_room, open
wants_room  → has_flat,   open
wants_flat  → wants_flat, open     ← two seekers teaming up to rent together
open        → everyone
unclear     → nobody
```

`wants_flat → wants_flat` is the non-obvious one, and it is correct: two people
who each want a whole flat can rent one together. `unclear → nobody` is
deliberate — intent is required before results appear at all, so an unclear
intent means we should not be querying.

## Ranges overlap, they do not match

A first instinct is to filter budget with equality or a simple ceiling. Both
are wrong.

Everyone has a *range*. Someone asking for up to ₹25,000 and someone offering
from ₹20,000 have an overlap worth talking about. The filter is therefore:

```
their minimum ≤ my maximum   AND   their maximum ≥ my minimum
```

`coalesce` handles the open-ended cases — an unstated minimum is 0, an unstated
maximum is effectively infinite.

Move date works the same way, with a thirty-day window either side. Moving
dates are approximate, and an exact-match filter would empty the panel.

## Dealbreakers, and the question nobody answered

A dealbreaker is a hard filter: *I will not live with a smoker.* Easy enough
one way — require the candidate to have answered that axis with a value you
accept.

Note that **an unanswered axis is not a pass.** If you said no smoking and a
candidate never answered the smoking question, they are excluded. Silence is
not consent when the stake is your home.

The harder question: **do their dealbreakers filter you back?**

The ticket says "Hard filters: area, budget, move date, compatible intent,
dealbreakers." It does not say whose. Flatsharing is mutual — if they will not
live with a smoker and you smoke, neither of you should be in the other's
results. So I implemented it both ways, with a caveat: the reverse filter needs
your own answers, so anonymous searchers get the one-way version only.

Flagged in the PR. It is a product decision, not a technical one.

## The score, and why it starts at 70

```
score = 70 + 30 × (share of your preferences this person meets)
```

That formula came from the ticket, but the 70 is worth understanding rather
than just copying.

Everyone being scored **has already cleared every hard filter.** They are in
your areas, inside your budget, on a compatible side of the market, and they
violate none of your dealbreakers. They are all genuinely viable.

If the score ran 0–100, someone meeting one preference out of eight would show
as 12%. That reads as "bad match" when the truth is "viable person, fewer
shared preferences." The floor of 70 says: everyone here works; the top thirty
points are about how well.

## What I could not settle

The two source documents disagree on when the score appears.

- T-14's checklist: "shown only once lifestyle answers exist"
- `ai-agent-design.md` §3.3: "at least 2 dealbreakers" before the first recommendation

Those measure different things. Dealbreakers *filter*; preferences *rank*. A
person could have two dealbreakers and no preferences, and the score formula
would divide by zero.

So I implemented both, separately, and named them honestly:

- `scoreShown()` — at least one preference exists, because that is what the score measures
- `minimumSlotSetMet()` — the §3.3 interview gate, which the assistant uses and the query does not

Someone should confirm which was meant.

## What is not done

- **Not executable.** Same blocker as T-06: no `apps/api`, no workspace, so nothing compiles or runs. Design is complete.
- **`FormA` is a local placeholder.** The real one is T-08's, in `packages/contract`, and P2 has not built it. Mine mirrors `agent-architecture.md`. It carries a warning comment, because two definitions of the same form is exactly the drift T-08 exists to prevent.
- **No tests.** They need a running database and a way to seed it. First thing once T-02 lands.

## Files

```
apps/api/src/match/
├── intent.ts   which intents match which, and why
└── query.ts    the filters, the score, the gates
```
