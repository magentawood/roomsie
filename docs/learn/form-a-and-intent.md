# Form A and intent

**In one line:** Form A is the set of typed answers that drives matching, and intent is its first answer: the kind of place that a seeker wants.

## What it is

- **Form A** is a set of slots, for example intent, areas, budget and the lifestyle answers. The chat, the chips and the onboarding screens fill the slots. The match query filters on Form A ([PD7a](../decisions/pd-07a-agent-architecture.md), [PD3b](../decisions/pd-03b-interview-vs-chips.md)).
- **An enum** is a fixed list of the values that a slot can hold. The database keeps the list. A new value needs a migration, so we fix the list before the first migration (T-06).
- **Each slot has a value and a source:** `stated`, `default` or `empty`. The system never guesses a value ([PD15](../decisions/pd-15-form-a-contract.md)).
- **`unclear` is not empty.** `unclear` means that the person answered, but the answer was vague. Empty means that nobody asked yet.
- **A must-have has a weight as its value.** A dealbreaker filters, and a preference ranks ([PD3a](../decisions/pd-03a-flatmate-matching.md)). An unclear weight does nothing until the person decides.
- **A result** is a person card or a listing card, with its `kind`. Each result also has the "Best match" label and the "Didn't say" list of PD3a.
- **Form B** is different. It holds short notes from the observer, each with the words of the user. The user sees and corrects them in the chat ([PD7a](../decisions/pd-07a-agent-architecture.md)). Refer to [Form B notes](form-b-notes.md).

## How it fits our project

The designs ask two questions. The answers go to Form A:

```
"What brings you to Roomsie?"
   ├── I have a place to list ──▶ the listing flow (a listing, not a seeker)
   └── I'm looking for a place
          └── "What kind of place?" ──▶ intent: room · pg · whole_flat · flatmates · unclear
```

**An example.** Priya has a spare room in her flat in Andheri. Rahul wants a room in a shared flat.

- Priya selects "I have a place to list". Her room becomes a "Room in Flat" listing.
- Rahul selects "A room in a shared flat". His intent is `room`.
- Rahul sees one card: the room of Priya. He sees who lives there in the listing.
- If Rahul selects "Not sure, help me pick", his intent is `unclear`, and the assistant asks him in the chat.
- Under his results, Rahul taps "Show some PGs too". His intent is now a list, `room` and `pg`, and he sees both ([Roomsie Noticed](roomsie-noticed.md)).

**An example of the slots.** Rahul types "a veg kitchen would be nice, not sure it's a deal-breaker".

```
mustHaves.veg_kitchen: { value: "unclear", source: "stated" }   // the results do not change
lifestyle.food:        { value: null, source: "empty" }         // nobody asked yet
```

The assistant asks at once: "Should I hide places with a non-veg kitchen, or just show veg kitchens first?" A tap on "Hide them" saves `dealbreaker`, and the panel filters.

## The choice we made

- Five intent values, one for each place type, and the other slots of Form A ([PD15](../decisions/pd-15-form-a-contract.md)).
- Three sources and no `inferred`, `unclear` in each enum of Form A, and an unclear weight ([PD15](../decisions/pd-15-form-a-contract.md)).

## Gotchas

- **Do not add a seeker value for a lister** ([PD15](../decisions/pd-15-form-a-contract.md)).
- **A slot that the screens do not show can still exist.** Only the chat fills room type, for example "private room only".
- **`unclear` is only in the chat.** The profile form and the cards keep the answers of the designs. Thus, the profile API rejects `unclear` for a lifestyle answer.
- **A stored form can have no slots.** A slot that is not there reads as empty. Thus, an old `{}` form is valid, and a new slot needs no data change.
- **Form A rejects a key that it does not have.** A misspelled slot name fails the parse, so it does not become empty without a sign. The form also has `version: 1`.
- **Zod `.default()` does not parse its value.** A nested object with `.default({})` gives `{}`, with no empty slots in it. Use `.prefault({})`, which parses the value.
- **"Who's moving" has two parts:** a type and a household. The listing filter uses only the parts that we know ([PD15](../decisions/pd-15-form-a-contract.md)).

## Tickets

- F-11: [#128](https://github.com/magentawood/roomsie/pull/128), 2026-10-24. The intake calls, and the Form A contract of PD15.
- T-08: [#184](https://github.com/magentawood/roomsie/pull/184), 2026-11-01. The Form A schema and the results in `packages/contract`. No inferred values, and `unclear` in each enum of Form A.
