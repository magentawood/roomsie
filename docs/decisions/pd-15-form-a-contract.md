# PD15 — Form A contract: intent, room type, lifestyle and who's moving

**Status:** Settled · **Date:** 2026-10-24 · **Deciders:** n3rxv, for the founders

## Context

- Form A holds the typed slots that drive the match query (PD7a, PD3b).
- The designs ([PD14](pd-14-v0-is-the-figma-designs.md)) ask what a person wants in two steps.
- The code had one intent enum, `has_flat`, `wants_flat`, `wants_room`, `open`, `unclear`, with no value for a PG or a whole flat. It seeded nine lifestyle axes, with `community` as one of them.
- Listers state "Who is welcome" ([PD3d](pd-03d-listing-identity-restrictions.md)). Seekers state "Who's moving". The two lists do not agree one to one.

## Decision

**In one line:** A seeker's intent is one of five place types, and Form A adds room type, who is moving, eight lifestyle answers and seven must-haves.

- **Intent.** "What brings you to Roomsie?" sends a lister to the listing flow. A lister is a listing, not a seeker. A seeker selects a place type. The values are `room` (a room in a shared flat), `pg`, `whole_flat`, `flatmates` (people to rent with) and `unclear` ("Not sure, help me pick").
- **Room type.** A slot that only the chat fills. The values are `private`, `shared` and `unclear`. `private` matches "Private room" and a PG with "Single". `shared` matches "Shared room" and a PG with "Double" or more.
- **Lifestyle.** Eight questions, with the answers of the designs:

  | Question | Answers |
  |---|---|
  | Food | Veg, Non-veg, Eggetarian, Jain |
  | Smoking | Non-smoker, Smoker, Smoke outside |
  | Drinks | None at home, Fine at home |
  | Guests | Weekends only, Guests welcome, Guests rarely |
  | Your days | Out most days, Home most days, Night shifts, Student |
  | Sleep | Night owl, Early bird |
  | Tidiness | Very tidy, Tidy enough, Relaxed about mess |
  | Pets | No pets, Fine with pets |

- **No community question** ([PD3c](pd-03c-exclusionary-preferences.md)).
- **Must-haves.** Each has a weight, prefer or dealbreaker: Veg kitchen, Non-smokers, No alcohol at home, Women only, Men only, Tidy flatmates, Couple friendly. A dealbreaker filters, and a preference ranks ([PD3a](pd-03a-flatmate-matching.md)). Women only and Men only wait for F-13 (PC-30).
- **Who's moving.** Each answer has a type and a household:

  | Who's moving | Type | Household |
  |---|---|---|
  | Student | student | bachelor |
  | Starting my first job, Working and looking for a better place | working | bachelor |
  | Couple | not asked | couple |
  | Family | not asked | family |
  | Group of friends | not asked | bachelors |
  | Looking for my son or daughter | from the child (PD16) | bachelor |

- **The listing filter.** A seeker sees a listing only if the listing welcomes the type and the household. A part that is not known does not filter. A group of "Who is welcome" that the lister left empty does not filter. The filter runs on the server, as PD3c requires.

## Rationale

- One intent value for each screen choice keeps the data and the screens the same.
- "Private room only" is a frequent stated must-have. A chat-only slot keeps it with no change to the designs.
- The designs set the lifestyle questions and the must-haves (PD14).

## Alternatives rejected

- **Keep the old intent enum, and add `pg` and `whole_flat`.** A lister stays a seeker with `has_flat`, so the same room shows twice.
- **No room type slot.** A stated "private room only" cannot filter.
- **Show "Who is welcome", and never filter.** Couples and bachelors contact listers who refuse them.
- **Match the two lists one to one.** It breaks the "no bachelors" rule of a lister.

## Consequences

- T-06 replaces the intent enum, and removes `whole_flat` from room type. The schema has no migration yet, so no data moves.
- T-06 changes `seed-axes.ts` to the eight questions of this record.
- The matching rules (F-12) use the listing filter and the must-haves.

## Revisit when

- The designer changes the onboarding questions, the profile questions or the listing flow.

## Sources

- [PD14](pd-14-v0-is-the-figma-designs.md), [PD3c](pd-03c-exclusionary-preferences.md), [PD3d](pd-03d-listing-identity-restrictions.md), [PD7a](pd-07a-agent-architecture.md)
- The Product file: flow 01 (Purpose, Place type, Who's moving), Profile and settings, and flow 04 (What's the place, House rules and who's welcome)
