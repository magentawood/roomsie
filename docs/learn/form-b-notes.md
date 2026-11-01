# Form B notes

**In one line:** Form B is the set of notes that the assistant keeps about a person, each with a quote and its message.

## What it is

- **Form A** holds the filter answers, for example the budget and the areas ([Form A and intent](form-a-and-intent.md)). **Form B** holds the other things that a person tells the assistant.
- **A note** (an observation) has seven fields. The observer, an AI step in T-36, writes the notes ([PD7a](../decisions/pd-07a-agent-architecture.md)).

| Field | Example | What it is |
|---|---|---|
| `key` | `guest_frequency` | The topic of the note |
| `value` | "partner stays over most nights" | What the assistant learned |
| `kind` | `concern` | `constraint`, `preference`, `context` or `concern` |
| `evidence` | "my ex basically lived there" | The words of the person, with no change |
| `turn` | a chat turn id | The message that the quote comes from |
| `confidence` | `0.82` | How sure the observer is, from 0 to 1 |
| `visible` | `true` | Only the owner sees a note, never another person |

- **The owner** of a note is a user or a visitor session, never both. A visitor can chat before sign-in.

## How it fits our project

```
a typed message ──► the observer (T-36) ──► saveObservation ──► observations table
                                                 │
                         rejects a topic that is not in observation_topics
```

- The contract is `observation` in `packages/contract`.
- The tables are `observations` and `observation_topics`. The observations module of the API owns them. Other modules call its functions: save, list, delete one note, delete the notes of a user, and move the notes of a session.
- At sign-in, T-17 calls `moveObservations`. The notes of the visitor session then belong to the account.
- Account deletion calls `deleteObservationsOf`.
- To add a topic, add a row to the topic list in the seed. You do not need a migration.

## The choice we made

- `turn` holds the id of the message. When that message goes, the note goes too: [#185](https://github.com/magentawood/roomsie/pull/185).
- The topics are a catalogue in the database, the same as the Form A catalogues: [ADR-0017](../decisions/0017-schema-v1-shape.md), [#185](https://github.com/magentawood/roomsie/pull/185).
- An owner has one note for each topic. A newer note replaces the older note. At sign-in, the newer note on a topic stays: [#185](https://github.com/magentawood/roomsie/pull/185).

## Gotchas

- **A topic that is not in the catalogue fails.** `saveObservation` gives `false`. A retired topic (`active = false`) also fails. Add the topic to the seed first.
- **The contract does not trim the quote.** The quote must stay word for word, so that T-36 can find it in the message. The contract trims only `value`.
- **"Newer" uses `updated_at`.** A replaced note gets a new `updated_at`. The move compares these times, not the ids.
- **The tombstone keeps the users row.** Thus, its cascade does not delete the notes, and account deletion deletes them itself.

## Tickets

- T-35: [#185](https://github.com/magentawood/roomsie/pull/185), 2026-11-02. The contract, the two tables, the six starter topics, the observations module and the move at sign-in.
