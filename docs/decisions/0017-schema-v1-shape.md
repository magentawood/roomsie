# 0017 — Schema v1: goals, listings and the storage of Form A

**Status:** Accepted · 2026-10-24
**Depends on:** ADR 0006 (Drizzle), ADR 0015 (ids), PD14, PD15, PD16

## Decision

**In one line:** A goal is one move with its own chat; a listing is one wide table; Form A catalogues are data.

**Goals and the chat**

- A `goals` row is one move: a title, its own search state, a status (open or found) and one owner. The owner is a visitor's session or a user, never both.
- `chat_turns` belongs to a goal, and stores both sides of the chat. An assistant turn keeps the cards and chips that it showed, as JSON. A user turn records if the user typed it or tapped a chip.
- The profile keeps its own "Your search" for the card. "Fill using our chat" copies from a goal.

**Form A**

- The lifestyle questions and the must-haves are seed data (`lifestyle_axes`, `must_haves`). A person's answers are rows (`profile_lifestyle`, `profile_must_haves`). Only a must-have has a weight.
- ADR 0015 exception: a catalogue has a text key, as `areas` does. An answer table has a two-column key: the person and the question.
- "Who's moving" stores the choice of the person. The contract maps a choice to a type and a household (PD15).
- `profiles.age` can be empty, and a check rejects an age below 18.

**Listings**

- One `listings` table has a `kind`: `room_in_flat`, `owner_flat`, `pg` or `broker_flat`. A broker flat has the fields of an owner flat, and a brokerage.
- A draft can be incomplete. From `live`, a check requires an area group, the name of a PG, and the brokerage of a broker flat. A live listing has an expiry date.
- Each rent is a row in `listing_rates`: one row for a room or a flat, and one row for each sharing type of a PG. The row copies the kind of its listing in a two-column key, so a check ties a sharing type to PGs only.
- A pick-many list (what is inside, the building and society, the sharing types, who is welcome) is an array of fixed keys. The contract checks the keys. A GIN index makes each list a fast filter.
- The address is optional and private until the lister turns on `share_address`. Seekers see the area group, the landmark and the building.
- `listing_flatmates` holds the flatmates of a room listing, with the same two-column key. `flatmates_consent` records that the lister confirmed "My flatmates agreed to be shown".

## Why

- **Goals.** The designs show a list of moves and ask "Is this the same move?". "I found a place" closes one move. One search for each person cannot show two moves.
- **Both sides of the chat.** A reopened goal shows the replies and the cards of the assistant. The reply writer needs the last two turns ([agent-architecture.md](../agent-architecture.md)).
- **Catalogues as data.** A new question or must-have is a re-seed, with no migration. Women only and Men only can wait for F-13 as inactive rows.
- **The choice, not its parts.** The profile shows the exact choice. A change to the mapping is a code change, with no stored rows to fix.
- **Age can be empty.** Onboarding saves a profile before the person gives an age. The database still rejects 17.
- **One listings table.** One query finds every listing, and each filter is a plain column.
- **Rents in one place.** The budget filter and the "Rent: …" line read one table for all kinds.
- **Arrays of keys.** One column for each list, with no join. The same pattern holds `profiles.areas`.
- **A private address.** The listing flow promises: "The full address is optional, and only shared if you choose to."

## Rejected

- **One search for each person, with chat turns on the user or the session.** Two moves cannot exist together.
- **The typed user turns only.** A reopened goal cannot show the assistant.
- **A database enum for the must-haves.** Each change needs a migration.
- **Two stored parts for "Who's moving".** The profile loses the exact choice, and a mapping change rewrites rows.
- **Age always required.** No profile row can exist before the person gives an age.
- **A detail table for each kind of listing.** Each results query joins two or three tables.
- **Rent on `listings`, and a second table for PG rents.** Rent lives in two places.
- **A seed table and a join table for each pick-many list.** Eight more tables, and a join for each filter.
- **A required address, with the area group from the pincode.** We maintain a pincode table, and a pincode can cross area groups.
- **Flatmates with no consent tick.** We store faces of people who never agreed.

## Consequences

- [PD3a](pd-03a-flatmate-matching.md) sets the matching rules.

## Revisit when

- The designer changes the listing flow, the profile or the goals.
