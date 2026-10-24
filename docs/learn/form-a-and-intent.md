# Form A and intent

**In one line:** Form A is the set of typed answers that drives matching, and intent is its first answer: the kind of place that a seeker wants.

## What it is

- **Form A** is a set of slots, for example intent, areas, budget and the lifestyle answers. The chat, the chips and the onboarding screens fill the slots. The match query reads only Form A ([PD7a](../decisions/pd-07a-agent-architecture.md), [PD3b](../decisions/pd-03b-interview-vs-chips.md)).
- **An enum** is a fixed list of the values that a slot can hold. The database keeps the list. A new value needs a migration, so we fix the list before the first migration (T-06).
- **Each slot has a source:** stated, inferred, default or empty. An inferred value never fills a slot silently.
- **Form B** is different. It holds short notes from the observer, each with the words of the user. The user sees and corrects them in the chat.

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

## The choice we made

- Five intent values, one for each place type of the designs. A lister is a listing, not a seeker ([PD15](../decisions/pd-15-form-a-contract.md)).
- Room type, who is moving, eight lifestyle answers and seven must-haves are also slots of Form A ([PD15](../decisions/pd-15-form-a-contract.md)).

## Gotchas

- **Do not add a seeker value for a lister.** The old enum had `has_flat`. With listings, the same room then shows two times: as a listing and as a person card.
- **A slot that the screens do not show can still exist.** Only the chat fills room type, for example "private room only".
- **"Who's moving" has two parts:** a type and a household. The listing filter uses only the parts that we know ([PD15](../decisions/pd-15-form-a-contract.md)).
