# Form B notes

**In one line:** Form B is the set of notes that the assistant keeps about a person, each with a quote and its message.

## What it is

- **Form A** holds the filter answers, for example the budget and the areas ([Form A and intent](form-a-and-intent.md)). **Form B** holds the other things that a person tells the assistant.
- **A note** (an observation) has seven fields. The observer, a small AI step, writes the notes ([PD7a](../decisions/pd-07a-agent-architecture.md)).

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
a typed message ──► router: kind "context"? ──► the reply goes out
                                 │ yes
                                 ▼  (after the reply)
                    the observer ──► quote check ──► saveObservation ──► observations table
                                         │                  │
                       drops a quote that the       rejects a topic that is not
                       message does not hold        in observation_topics
```

- **When it runs.** Only on a typed turn that the router labels `context`, after the reply goes out. A note never changes the reply that it comes from. Thus, the observer adds no wait.
- **The quote check.** The quote must be in the message: the same words, in the same order, as whole words. Only the capitals, the white space and the Unicode form can differ. The note keeps the words as the message has them.
- **The confidence.** It is the token probability of the topic and the kind, from DeepSeek. Gemini gives no probabilities, so its notes get `OBSERVER_UNSCORED_CONFIDENCE` (0.5). A note of DeepSeek whose tokens do not hold its topic or kind gets it too, with an error report. At 0.5, the matching does not use the note.
- **No note:** a sensitive turn, a turn that only asks a question, and an off-topic or adversarial turn. A turn that states a community or religion preference, or the own religion or community of the person, also gives no note (PD3c). The extractor tells an own value, so a turn whose extractor failed or was not sure of one gives no note too. The prompt tells the observer never to note religion, community, caste, health or sexuality, or an answer of a chip, as night shifts. No code checks these two rules. The eval counts the notes of the sentences about health and religion, and no count measures the rule of the chips ([observer-eval.md](../research/observer-eval.md)).
- **"What do you know about me?"** The router flags it, and a scripted line answers. The web gets the current notes from `GET /v1/notes`, so the chat keeps no copy. A delete is `DELETE /v1/notes/:id`, a direct database action. To correct a note, the person types the correction, and the new note replaces the old one.
- **The hint.** The first reply after the first note of an owner tells the person that they can ask. It comes one time for each owner.
- **The one-off backfill.** `pnpm backfill:notes --before=<the time of the deploy>` counts the typed turns with context from before the deploy, and the cost. `--apply` writes their notes, oldest first. It reads no person who chatted from the deploy on, because only such a person can have seen or deleted a note, and it refuses a `--before` later than the oldest note. A note never replaces a note from a newer turn, and a goal with an own religion or community gives no note.
- **The eval.** `pnpm eval:observer` runs the live models on the eval sentences. The result is in [observer-eval.md](../research/observer-eval.md).

- The contract is `observation` in `packages/contract`.
- The tables are `observations` and `observation_topics`. The observations module of the API owns them. Other modules call its functions: save, list (`observationsOf`, and `notesOf` with the labels), delete one note, delete the notes of a user, and move the notes of a session. The observer and the backfill also use `activeTopics`, and the backfill `oldestObservationAt` and `turnsWithNotes`.
- At sign-in, T-17 calls `moveObservations`. The notes of the visitor session then belong to the account.
- Account deletion calls `deleteObservationsOf`.
- The notes of a visitor session that nobody claimed go with it when the nightly job `jobs.delete_old_visitors()` deletes the session ([the visitor chat at sign-in](visitor-chat-claim.md)).
- To add a topic, add a row to the topic list in the seed. You do not need a migration. The prompt of the observer lists the active topics.

## The choice we made

- `turn` holds the id of the message. When that message goes, the note goes too: [#185](https://github.com/magentawood/roomsie/pull/185).
- The topics are a catalogue in the database, the same as the Form A catalogues: [ADR-0017](../decisions/0017-schema-v1-shape.md), [#185](https://github.com/magentawood/roomsie/pull/185).
- An owner has one note for each topic. A newer note replaces the older note. At sign-in, the newer note on a topic stays: [#185](https://github.com/magentawood/roomsie/pull/185).
- The observer runs after the reply, only on a turn with context: [PD7a](../decisions/pd-07a-agent-architecture.md), T-36.
- A sensitive turn gives no note: [PD10](../decisions/pd-10-scope-bands.md), T-36.

## Gotchas

- **A topic that is not in the catalogue fails.** `saveObservation` gives `false`. A retired topic (`active = false`) also fails. Add the topic to the seed first.
- **The contract does not trim the quote.** The quote must stay word for word, so that T-36 can find it in the message. The contract trims only `value`.
- **"Newer" uses `updated_at`.** A replaced note gets a new `updated_at`. The move compares these times, not the ids.
- **A failed observer loses the note, with no message to the person.** The error goes to the error report. The backfill reads only the turns from before the deploy, so it does not read that turn again.
- **The floor of the matching rarely drops a note of DeepSeek,** because the confidence was nearly always 1.0 in the eval ([observer-eval.md](../research/observer-eval.md)).
- **The tombstone keeps the users row.** Thus, its cascade does not delete the notes, and account deletion deletes them itself.

## Tickets

- T-35: [#185](https://github.com/magentawood/roomsie/pull/185), 2026-11-02. The contract, the two tables, the six starter topics, the observations module and the move at sign-in.
- T-36: [#215](https://github.com/magentawood/roomsie/pull/215), 2026-11-04. The observer, the quote check, four new topics, the notes question, the delete, the backfill and the eval.
