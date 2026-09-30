# Build journal

This journal is a continuous record of the roomsie build. A reader with no prior
context can understand it. Each entry tells what we built and why we built it
that way. Each entry also explains the ideas when they occur.

The newest entry is at the bottom. Add new entries only. Never rewrite the journal.

---

## Before anything: what are we building?

**roomsie** finds a flat or a flatmate for you in Mumbai. Other rental sites
start with a search box and filters. roomsie starts with an assistant that
interviews you. This front door is the difference from all other rental sites.
The assistant finds what you actually need. Then it shows matches. You can also
browse, but only after the conversation.

roomsie handles four intents:

- A person with a flat who wants flatmates
- A person who wants a full flat
- A person who wants a room in an occupied flat
- People who will accept a flat or a room

The product is a **pivot**. The previous product, *femmeflats*, was a swipe app
for women only. roomsie is open to all genders. It will launch in three Mumbai
areas. The femmeflats requirements are dead. But roomsie keeps the
**technical** decisions of femmeflats with no change: fifteen accepted ADRs.

### Words you will meet constantly

| Term | What it means here |
|---|---|
| **ADR** | Architecture Decision Record. A short document that says "we chose X over Y, and here is why." Each ADR has a number and a date, and each ADR is binding. `docs/decisions/` holds fifteen. |
| **Monorepo** | One repository for the website, the server and the shared code, not three separate repositories. All people commit to the same repository. |
| **Schema** | The shape of the database: the tables, the columns in each table, and the type of each column. |
| **Migration** | A file of SQL that changes the schema. Migrations run in sequence. Never edit a migration after you ship it. Thus, all machines get the same database. |
| **Drizzle** | The tool that we use to describe the schema in TypeScript. It also generates the SQL migrations from that description. |
| **Form A** | The structured list of data that the assistant tries to learn from you: intent, budget, areas, move date, and nine lifestyle answers. The assistant fills it while you talk. |
| **T-06, T-14…** | Task codes. Each code is a GitHub issue. `docs/how-to-work.md` gives an index of all 55 in plain words. |
| **P1–P5** | The work lanes of the five people. This journal comes from **P3 · Data and trust**: the schema, the matching, and who sees whom. |

---

# Entry 1 — T-06, the database schema

**Issue [#11](https://github.com/magentawood/roomsie/issues/11) · 8 hours · critical path**

No other task in the project has as many tasks that depend on it. Seven
other tasks cannot start until this task is complete. These tasks belong to
four people:

- The match query
- Profiles
- The transfer of a chat into an account
- Report and block
- Account deletion
- Event logging
- The connect API

Thus, this task is first. It must be correct, and correctness is more
important than speed.

## What a schema actually is

A database keeps rows in tables. The tables are like spreadsheets that know
about each other. The schema is the definition: the tables, the columns, the
types, and the rules.

The schema is more important than most code because **after you ship it, no other part is as hard to change.** You can rewrite a screen in an afternoon.
But after real people's data is in a column, a change to that column needs a
migration and a backfill. You must also decide what to do with each row that
does not fit the new shape.

Thus, the job is to think carefully one time, and to leave space where you are
not sure.

## Decision 1 — `users` is thin

There are two ways to store a person:

- **Fat:** one `users` table holds all the data: name, age, photos, budget, preferences.
- **Thin:** `users` holds only identity and account state. All other data is in `profiles`, with a one-to-one link.

We chose thin, for three reasons:

1. **Each request reads the user row** to check who you are. That read should touch a very small row, not a row with four photo keys and twenty preferences.
2. **A profile edit never touches your auth row.** Different data changes at different rates and for different reasons.
3. **Deletion is simpler.** Account deletion (T-20) can remove the profile and keep the minimum record. We need this record to stop a suspended person who tries to sign up again immediately.

Cost: one more join when you need the two tables. The cost is worth it.

## Decision 2 — UUIDv7 ids, minted in code

The id of each table is a `uuid`, not a number in a sequence. **ADR 0015** already
made this decision, and I obeyed it. The reasons are worth your attention:

**Why not `1, 2, 3`?** Because `/users/1024` tells you that `1023` and `1025`
exist. This is important, because this product holds people's homes and photos.
Thus, each endpoint that takes an id becomes a list of all users that you can walk
through. Authorization should stop that. But you do not publish the map.

**Why v7 rather than v4?** A random UUIDv4 goes to a different place in the
index on each insert. This becomes slow when the index is larger than the
memory. UUIDv7 puts a millisecond timestamp in its first bits. Thus, new ids
sort to the end. You get the unguessability of v4 with the performance of
sequential inserts.

**Why not let the database generate it?** Because then the id exists only
*after* the insert commits. Thus, the phone can never know the id in advance.
When app code mints the id, the client can render immediately. Also, a retried
request is naturally safe: the same id arrives two times, and the database
ignores the second.

```ts
const id = () => uuid('id').primaryKey().$defaultFn(() => uuidv7())
```

`$defaultFn` means "run this function in TypeScript when inserting." This is
different from `.default()`, which would put it in the database.

## Decision 3 — the axis catalogue

At this point I hit a wall. This part of the entry has the most interest.

All plan documents refer to **"the nine lifestyle axes."** Six documents
mention them. **None of them says what the nine are.**

There were two bad options:

- **Guess, and hardcode nine columns.** The guess can be incorrect, and it will be incorrect. Then each correction needs a migration, a contract change, a re-tuned AI prompt and a new filter branch. That is five files in the lanes of three people, after real data exists.
- **Wait.** This blocks seven tasks and four people.

Thus, I chose a third option: **make the axes data, not schema.**

There are two tables. `lifestyle_axes` defines what the axes *are*: key,
question, allowed answers, order. `profile_lifestyle` holds one row for each
axis that each person answered.

Now, to add a tenth axis, you edit a seed file and seed again. You need no
migration, no backfill and no deploy. The same applies when you rename an
axis, remove an axis, or change its allowed answers.

### The idea behind it

This is a known trade-off. Columns are fast and rigid. Rows are flexible and
slower. Use rows when **you do not know at this time what the columns should be**. That is our condition.

The cost: the match becomes a join and an aggregate, not a comparison of
columns. At launch scale (a hundred seeded profiles in three areas), that cost
is nothing. The cost would be important at a scale that we will not see this
year. At that time, we would know the nine, and we could deliberately collapse
them into columns.

### The catch, which is real

The flexibility stays only if the system obeys these three conditions:

1. `packages/contract` **generates** Form A from the catalogue. It does not hardcode nine fields.
2. The match query (T-14, mine) **joins through** the catalogue, never `WHERE smoking = 'never'`.
3. The code **builds** the extraction prompt (T-12) from the catalogue. Nobody types the prompt out.

If one condition fails, that part becomes rigid again, but the other parts
pretend to be flexible. That is worse than a system that is honestly rigid.
Conditions one and three are in P2's lane. Thus, this is a shared contract
between P2 and me, as Form A is.

### The nine provisional names

I gave them names so that work could start. They are in `seed-axes.ts`, with a
warning comment at the top:

`smoking` · `drinking` · `diet` · `sleep_schedule` · `guests` ·
`cleanliness` · `work_from_home` · `pets` · `community`

Some names come from the documents, and I did not invent them. `smoking`
occurs by name in `ai-agent-design.md`. `guests` occurs as the example key
`guest_frequency`, with the worked example *"my ex basically lived there,
that's what killed it."* `diet` includes jain and eggetarian because the
market is Mumbai.

`community` needs a clear statement. Decision **PD3c** (2026-09-20) explicitly
chose to record community and religion and to filter on them.
`ai-agent-design.md` §4.1 gives a long description of the press exposure that
this causes. `community` is in the list because that decision says so. If
someone revisits that decision, the removal is one line.

## Decision 4 — `prefer` vs `dealbreaker`

Each answer has a weight. A **dealbreaker** removes people from your results
fully. A **preference** only moves them lower in the order.

This is a product decision that looks like a database decision. It is not confirmed at this time. It is §2.2 of `docs/design-review.md`, and it waits for the designer.

The designer can decide that preferences should be a 1–5 scale, not
two states. If so, that change *is* a migration. I flagged this. I did not hide
it.

## Decision 5 — where "we don't know" lives

Form A says that each field can be `unclear`, because the assistant has
permission to not know. This shows in two different ways:

- **Enums have an `unclear` value.** `intent` can be `has_flat`, `wants_flat`, `wants_room`, `open` or `unclear`.
- **Lifestyle answers use a missing row.** No row means no answer. We never store "we don't know" as a fact.

Lifecycle enums (account status, connection status) deliberately have no
`unclear`. Those values are facts that the system owns. They are not answers
from a person.

## The eight tables

| Table | Holds | Serves |
|---|---|---|
| `users` | Identity and account state only | All authenticated requests |
| `profiles` | The person: name, age, work, Form A, photo keys, visibility | T-16 |
| `lifestyle_axes` | What the axes *are* | T-08, T-12, T-14 |
| `profile_lifestyle` | One row for each answered axis of each person | T-14 |
| `anonymous_sessions` | Chat before sign-up, and the turn count | T-17, T-21 |
| `connection_requests` | Requests to connect. The contact shows after an accept | T-18a |
| `reports` | A person flagged a person | T-19 |
| `blocks` | A person hid a person, in the two directions | T-19 |
| `events` | What people did, also when anonymous | T-24 |
| `waitlist` | People outside the three launch areas | T-22 |

There are ten, not eight. The other two tables are the axis catalogue. The
"nine lifestyle answers" line in the ticket implies these tables, but it does
not name them.

## Small things worth noticing

**Blocks work in the two directions.** The match query subtracts blocks in the two directions. A block hides each of you from the other, not only one of you. There is an index for that lookup.

**`reports` and `blocks` are client-mintable.** ADR 0015 lists them as tables
where the phone generates the id. Their endpoints accept an `id` and dedupe
with `ON CONFLICT (id) DO NOTHING`. Thus, a retried tap on a bad connection
never files two reports.

**Anonymous events are the point of `events`.** The important question is: how
many people start a chat and never sign up? You can see this only if the system
records anonymous activity. Thus, there is a nullable `anonymous_session_id`
next to the nullable `user_id`.

**`turnCount` counts typed turns only.** Chip taps are free, because they run
no model. The turn budget exists to control model spend. If it counted chip
taps, it would punish the users with the lowest cost. This rule comes from
`pre-login-limits.md`.

## What is not done

- **No migrations at this time.** Drizzle generates SQL from this file, but for that, `apps/api` must exist. That is T-02, which is P1's task. The design is complete. The generated SQL is not.
- **Form B has nowhere to live.** `agent-architecture.md` describes a second structure: observations, with kind, evidence, turn and confidence. It says clearly that this structure must have a structure. It must not be a text blob. No table here holds it, because T-06's checklist does not mention it. I raised it. I did not silently add it.
- **Two documents disagree about `room_type`.** `agent-architecture.md` lists it as a Form A slot. T-06's acceptance criteria do not. I included it. One of the two documents is incorrect.

## Files

```
apps/api/src/db/
├── schema.ts       the ten tables, the enums, the indexes
└── seed-axes.ts    the nine provisional axes
```

## Addendum — two tables the checklist did not ask for

I added these tables after I compared the schema with
`seo-with-gated-products.md`. That document is the search strategy of the
project. The team decided it before T-06 existed.

That document says that **public area pages are the primary SEO asset**:
"this data is the moat." Aggregates supply these pages. The aggregates are the
median budget of people
who search an area, the typical move-in window, the lifestyle mix, and **rent
bands by room type**. I checked if the schema could actually supply them.
It could not supply two things.

### `listings`

There was no listings table, but two other documents assume that one exists.

ADR 0015 names it directly in its list of the ids that the client mints and
the ids that the API mints: "`users`, `profiles`, `listings`". The SEO document says that listings
expire after thirty days. It also says that the gated action is to open the
details of a listing.

Without this table, a person with intent `has_flat` could describe
**themselves** but not the flat. Nobody could aggregate rent bands, because no
table stored rent. That is a hole in the data model, not only in SEO.

A profile is a person. A listing is a property. One person can post more than one
listing, and a listing lives longer than a single conversation about it.

Listings expire, and the system does not delete them. There are two reasons.
Expired rows continue to feed the aggregates. Also, Google demotes link decay.
Thus, a page that gives a 404 is worse than a page that says that the flat is
not available.

### `areas`

Areas were a `text[]` on `profiles`. That is satisfactory until URLs depend on
them.

Area pages are at `/flats-in-powai`, and that URL must mean the same thing
forever. Free text drifts: "Powai", "powai" and "Powai, Mumbai" become three
different cells. This divides each aggregate and makes duplicate or dead pages. A
controlled vocabulary prevents this. The table is also the natural location
for the evergreen commute notes and the area text that the pages need.

`isLaunchArea` covers F-06, which selects three areas for the launch. The other
areas exist so that the waitlist has a target.

### A deliberate ADR exception

`areas` and `lifestyle_axes` use a **text slug as the primary key**, not a
UUIDv7. ADR 0015 says that each table uses a uuid. Thus, this is a departure,
and it needs a defence.

The reason for the ADR is enumerability: you should not be able to walk from
`/users/1024` to `/users/1025` and harvest the user base. Catalogue tables are
the full opposite. The slugs are public, and we want people to guess them and
link to them. `/flats-in-powai` is the product. The rule there would cost a
join on each page and protect nothing.

`profiles.areas` stays an array, because Postgres cannot put a foreign key on
an array element. Validation occurs in the contract layer. This is the same
pattern that `profile_lifestyle.value` already uses against its axis.

### Still nobody's job

The area pages have no task. I searched all fifty-five tasks. No task mentions
area pages, aggregates, SEO or sitemaps. T-22 is "Launch areas and waitlist",
which is a different thing.

Also, **T-14 is the incorrect shape for them.** It returns individual people to a
person who searches. Area pages need aggregates with a suppression floor. The
strategy requires that you hide each cell with fewer than twenty users.
Without this floor, the cell leaks an individual.

That is a different query. It
does not exist, and no one owns it.

Twelve tables now, not ten.
---

# Entry 2 — T-14, the match query

**Issue [#27](https://github.com/magentawood/roomsie/issues/27) · 6 hours · critical path**

This query takes what the assistant learned about you, and returns the people
who fit. All of the product points to this query. The chat exists to fill a
form, and this query changes that form into results.

## The one idea that shapes everything

**Filtering and ranking are different jobs.** To confuse them is the easiest way to build
this incorrectly.

- **Filtering** removes people who cannot work: incorrect area, incorrect budget, a
  violated dealbreaker, a block. It is binary and cheap.
- **Ranking** puts the remaining people in sequence, by how much they suit you.

This is important because filtering needs only area and budget, which arrive
after approximately three turns. Ranking needs lifestyle answers, which take
much longer. If you make them one step, you get one of two bad results. You
show nothing for ten turns. Or you show a match score from almost no
information.

`interface-shape.md` gives the decision: show results quickly and honestly, and
**withhold the score until it means something.** Thus, the query returns rows
immediately when intent, area and budget exist. It returns `score: null` until
there is a preference to measure.

## Intent is not symmetric

roomsie serves the two sides of the market at the same time. Thus, the answer
to "who should I see" depends on your side. A person with a spare room and a
person who looks for a room are a match. Two people who each already have a
flat are not a match.

```
has_flat    → wants_room, open
wants_room  → has_flat,   open
wants_flat  → wants_flat, open     ← two seekers teaming up to rent together
open        → everyone
unclear     → nobody
```

`wants_flat → wants_flat` is the non-obvious match, and it is correct: two people who each want a full flat can rent one together. `unclear → nobody` is
deliberate. The system requires intent before results appear at all. Thus, an
unclear intent means that we should not query.

## Ranges overlap, they do not match

A first instinct is to filter budget with equality or a simple ceiling. The two methods are incorrect.

All people have a *range*. A person who asks for up to ₹25,000 and a person who
offers from ₹20,000 have an overlap that is worth a discussion. Thus, the
filter is:

```
their minimum ≤ my maximum   AND   their maximum ≥ my minimum
```

`coalesce` handles the open-ended cases: an unstated minimum is 0, and an
unstated maximum is effectively infinite.

Move date works in the same way, with a thirty-day window on each side. Move
dates are approximate, and a filter that needs the same date would empty the
panel.

## Dealbreakers, and the question nobody answered

A dealbreaker is a hard filter: *I will not live with a smoker.* In one
direction, this is easy: the candidate must have an answer for that axis, with
a value that you accept.

**An unanswered axis is not a pass.** If you said no to `smoking` and a
candidate never answered the `smoking` question, the query excludes that candidate. Silence
is not consent when your home is at risk.

The next question is not easy: **do their dealbreakers filter you back?**

The ticket says "Hard filters: area, budget, move date, compatible intent,
dealbreakers." It does not say which person's dealbreakers. Flatsharing is mutual. If they will not
live with a smoker and you smoke, the two of you should not be in the results of
the other. Thus, I implemented the filter in the two directions, with one limit.
The opposite filter needs your own answers. Thus, anonymous searchers get only
the one-way version.

I flagged this in the PR. It is a product decision, not a technical decision.

## The score, and why it starts at 70

```
score = 70 + 30 × (share of your preferences this person meets)
```

That formula came from the ticket. But it is worth it to understand the 70, not
only to copy it.

All people who get a score **already passed all hard filters.** They are in
your areas and inside your budget. They are on a compatible side of the market,
and they violate none of your dealbreakers. They are all genuinely viable.

If the score went from 0–100, a person who meets one preference out of eight
would show as 12%. That looks like "bad match", but the truth is "viable
person, fewer shared preferences." The floor of 70 says that all people here
work. The top thirty points show how much they suit you.

## What I could not settle

The two source documents do not agree about when the score appears.

- T-14's checklist: "shown only once lifestyle answers exist"
- `ai-agent-design.md` §3.3: "at least 2 dealbreakers" before the first recommendation

Those rules measure different things. Dealbreakers *filter*, and preferences
*rank*. A person could have two dealbreakers and no preferences. Then the score
formula would divide by zero.

Thus, I implemented the two rules independently, and gave them honest names:

- `scoreShown()` — one or more preferences exist, because that is what the score measures
- `minimumSlotSetMet()` — the §3.3 interview gate, which the assistant uses and the query does not

Someone should confirm which rule the documents meant.

## What is not done

- **Not executable.** The blocker is the same as for T-06: no `apps/api` and no workspace. Thus, nothing compiles or runs. The design is complete.
- **`FormA` is a local placeholder.** The real one is T-08's, in `packages/contract`, and P2 has not built it. My placeholder mirrors `agent-architecture.md`. It has a warning comment. Two definitions of the same form are the drift that T-08 exists to prevent.
- **No tests.** Tests need a database that runs, and a way to seed it. They are the first thing to do after T-02 is complete.

## Files

```
apps/api/src/match/
├── intent.ts   which intents match which, and why
└── query.ts    the filters, the score, the gates
```
